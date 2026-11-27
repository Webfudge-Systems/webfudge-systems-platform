'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, RefreshCw, Sparkles, X } from 'lucide-react';
import { Button, Card, LoadingSpinner, UpgradePrompt, planErrorDetails, IS_SAAS_PLATFORM } from '@webfudge/ui';
import PMPageHeader from '../../components/PMPageHeader';
import smartTriageService, { aiErrorMessage } from '../../lib/api/smartTriageService';
import projectService from '../../lib/api/projectService';
import taskListService from '../../lib/api/taskListService';

/**
 * Smart triage + meeting → tasks (W20).
 *  - Triage: unassigned open tasks (incl. intake / portal requests). Fudge AI suggests priority,
 *    assignee (skills + W6 workload), list and due date; accept per row or in bulk, edit first if needed.
 *  - Meeting → tasks: paste notes or a transcript, review the extracted action items, create the tasks.
 */

const inputClass =
  'rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20';
const PRIORITIES = ['low', 'medium', 'high'];
const SOURCE = { portal: 'Client portal', meeting: 'Meeting', team: 'Team' };
const LANGS = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'हिन्दी' },
  { value: 'mr', label: 'मराठी' },
];
const fmtDate = (d) => (d ? new Date(`${String(d).slice(0, 10)}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '—');

function ErrorBox({ error }) {
  if (!error) return null;
  if (error.plan) return <UpgradePrompt {...error.plan} compact />;
  return <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error.message}</div>;
}
const toError = (e) => {
  const plan = planErrorDetails(e);
  return plan ? { plan } : { message: aiErrorMessage(e) };
};

// ---------------------------------------------------------------- triage

function TriageTab({ language }) {
  const [tasks, setTasks] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [drafts, setDrafts] = useState({}); // taskId → editable suggestion
  const [team, setTeam] = useState([]);
  const [lists, setLists] = useState([]);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState('');
  const [maxPerRun, setMaxPerRun] = useState(25);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await smartTriageService.inbox();
      setTasks(Array.isArray(res?.data) ? res.data : []);
      if (res?.meta?.maxPerRun) setMaxPerRun(res.meta.maxPerRun);
    } catch (e) {
      setTasks([]);
      setError(toError(e));
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const toggle = (id) =>
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  const allIds = (tasks || []).map((t) => t.id);
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id));

  const suggest = async (ids) => {
    const pick = ids.slice(0, maxPerRun);
    if (!pick.length) return;
    setBusy('suggest');
    setError(null);
    setNotice(ids.length > maxPerRun ? `Fudge AI triages up to ${maxPerRun} tasks at a time. The first ${maxPerRun} were sent.` : '');
    try {
      const res = await smartTriageService.suggest(pick, language);
      const d = res?.data || {};
      setTeam(d.team || []);
      setLists(d.lists || []);
      setDrafts((prev) => {
        const next = { ...prev };
        for (const s of d.suggestions || []) next[s.taskId] = { ...s };
        return next;
      });
    } catch (e) {
      setError(toError(e));
    } finally {
      setBusy('');
    }
  };

  const edit = (taskId, patch) => setDrafts((d) => ({ ...d, [taskId]: { ...d[taskId], ...patch } }));
  const dismiss = (taskId) =>
    setDrafts((d) => {
      const n = { ...d };
      delete n[taskId];
      return n;
    });

  const accept = async (ids) => {
    const items = ids
      .filter((id) => drafts[id])
      .map((id) => {
        const s = drafts[id];
        const item = { taskId: id, priority: s.priority };
        if (s.assigneeId) item.assigneeId = Number(s.assigneeId);
        if (s.taskListId) item.taskListId = Number(s.taskListId);
        if (s.scheduledDate) item.scheduledDate = s.scheduledDate;
        return item;
      });
    if (!items.length) return;
    setBusy('apply');
    setError(null);
    try {
      const res = await smartTriageService.apply(items);
      const results = res?.data?.results || [];
      const failed = results.filter((r) => !r.ok);
      const done = new Set(results.filter((r) => r.ok).map((r) => r.taskId));
      // Assigned tasks leave the inbox; the rest keep their row.
      setTasks((ts) => (ts || []).filter((t) => !(done.has(t.id) && drafts[t.id]?.assigneeId)));
      setDrafts((d) => Object.fromEntries(Object.entries(d).filter(([k]) => !done.has(Number(k)))));
      setSelected((s) => new Set([...s].filter((id) => !done.has(id))));
      setNotice(`Applied triage to ${done.size} task${done.size === 1 ? '' : 's'}. Undo from Accounts → AI approvals.${failed.length ? ` ${failed.length} failed: ${failed[0].error}` : ''}`);
    } catch (e) {
      setError(toError(e));
    } finally {
      setBusy('');
    }
  };

  const listsFor = (task) => lists.filter((l) => l.projectId === task.project?.id);
  const pendingIds = Object.keys(drafts).map(Number).filter((id) => allIds.includes(id));

  if (tasks === null) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => suggest(selected.size ? [...selected] : allIds)} disabled={!allIds.length || busy}>
          <Sparkles className="mr-1.5 h-4 w-4" />
          {busy === 'suggest' ? 'Thinking…' : selected.size ? `Suggest for ${selected.size} selected` : 'Suggest for all'}
        </Button>
        <Button variant="outline" onClick={() => accept(pendingIds)} disabled={!pendingIds.length || busy}>
          <Check className="mr-1.5 h-4 w-4" />
          {busy === 'apply' ? 'Applying…' : `Accept all suggestions (${pendingIds.length})`}
        </Button>
        <Button variant="ghost" onClick={load} disabled={Boolean(busy)}>
          <RefreshCw className="mr-1.5 h-4 w-4" />
          Refresh
        </Button>
        <span className="text-sm text-gray-500">{tasks.length} unassigned open task{tasks.length === 1 ? '' : 's'}</span>
      </div>
      <ErrorBox error={error} />
      {notice && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{notice}</div>}

      {!tasks.length ? (
        <Card className="p-10 text-center text-sm text-gray-500">Nothing to triage. Every open task has an owner.</Card>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs font-medium text-gray-500">
              <tr>
                <th className="px-3 py-2">
                  <input type="checkbox" aria-label="Select all" checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(allIds))} />
                </th>
                <th className="px-3 py-2">Task</th>
                <th className="px-3 py-2">Priority</th>
                <th className="px-3 py-2">Assignee</th>
                <th className="px-3 py-2">List</th>
                <th className="px-3 py-2">Due</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tasks.map((t) => {
                const s = drafts[t.id];
                const member = s && team.find((m) => m.userId === Number(s.assigneeId));
                return (
                  <tr key={t.id} className={s ? 'bg-orange-50/40' : ''}>
                    <td className="px-3 py-2 align-top">
                      <input type="checkbox" aria-label={`Select ${t.name}`} checked={selected.has(t.id)} onChange={() => toggle(t.id)} />
                    </td>
                    <td className="max-w-xs px-3 py-2 align-top">
                      <a href={`/tasks/${t.id}`} className="font-medium text-gray-900 hover:text-orange-600">
                        {t.name}
                      </a>
                      <div className="mt-0.5 text-xs text-gray-500">
                        {[t.project?.name, SOURCE[t.source], t.taskList?.name].filter(Boolean).join(' · ')}
                      </div>
                      {s?.reason && (
                        <div className="mt-1 flex gap-1 text-xs text-orange-700">
                          <Sparkles className="mt-0.5 h-3 w-3 shrink-0" />
                          {s.reason}
                        </div>
                      )}
                    </td>
                    {s ? (
                      <>
                        <td className="px-3 py-2 align-top">
                          <select className={inputClass} value={s.priority} onChange={(e) => edit(t.id, { priority: e.target.value })} aria-label="Priority">
                            {PRIORITIES.map((p) => (
                              <option key={p} value={p}>
                                {p}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2 align-top">
                          <select className={inputClass} value={s.assigneeId || ''} onChange={(e) => edit(t.id, { assigneeId: e.target.value ? Number(e.target.value) : null })} aria-label="Assignee">
                            <option value="">Leave unassigned</option>
                            {team.map((m) => (
                              <option key={m.userId} value={m.userId}>
                                {m.name} ({m.openHours}/{m.capacity}h)
                              </option>
                            ))}
                          </select>
                          {member?.jobRole && <div className="mt-0.5 text-xs text-gray-500">{member.jobRole}</div>}
                        </td>
                        <td className="px-3 py-2 align-top">
                          <select className={inputClass} value={s.taskListId || ''} onChange={(e) => edit(t.id, { taskListId: e.target.value ? Number(e.target.value) : null })} aria-label="List" disabled={!listsFor(t).length}>
                            <option value="">Keep current</option>
                            {listsFor(t).map((l) => (
                              <option key={l.id} value={l.id}>
                                {l.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2 align-top">
                          <input type="date" className={inputClass} value={s.scheduledDate || ''} onChange={(e) => edit(t.id, { scheduledDate: e.target.value || null })} aria-label="Due date" />
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 align-top">
                          <Button size="sm" onClick={() => accept([t.id])} disabled={Boolean(busy)}>
                            <Check className="mr-1 h-3.5 w-3.5" />
                            Accept
                          </Button>
                          <button type="button" className="ml-1 rounded p-1 text-gray-400 hover:text-gray-600" onClick={() => dismiss(t.id)} aria-label="Dismiss suggestion">
                            <X className="h-4 w-4" />
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-3 py-2 align-top capitalize text-gray-700">{t.priority || '—'}</td>
                        <td className="px-3 py-2 align-top text-gray-400">Unassigned</td>
                        <td className="px-3 py-2 align-top text-gray-700">{t.taskList?.name || '—'}</td>
                        <td className="px-3 py-2 align-top text-gray-700">{fmtDate(t.scheduledDate)}</td>
                        <td className="px-3 py-2 align-top">
                          <Button size="sm" variant="outline" onClick={() => suggest([t.id])} disabled={Boolean(busy)}>
                            <Sparkles className="mr-1 h-3.5 w-3.5" />
                            Suggest
                          </Button>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- meeting → tasks

function MeetingTab({ language }) {
  const [meetings, setMeetings] = useState(null);
  const [meetingId, setMeetingId] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState(null);
  const [team, setTeam] = useState([]);
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState('');
  const [lists, setLists] = useState([]);
  const [taskListId, setTaskListId] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    smartTriageService
      .meetings()
      .then((r) => setMeetings(Array.isArray(r?.data) ? r.data : []))
      .catch((e) => {
        setMeetings([]);
        setError(toError(e));
      });
    projectService.getAllProjects({ pageSize: 100 }).then((r) => {
      const rows = Array.isArray(r?.data) ? r.data : [];
      setProjects(rows.map((p) => ({ id: p.id, name: p.name ?? p.attributes?.name ?? `Project #${p.id}` })));
    });
  }, []);

  useEffect(() => {
    setTaskListId('');
    if (!projectId) return setLists([]);
    taskListService.listForProject(projectId).then(setLists).catch(() => setLists([]));
  }, [projectId]);

  const meeting = useMemo(() => (meetings || []).find((m) => String(m.id) === String(meetingId)), [meetings, meetingId]);
  const pickMeeting = (id) => {
    setMeetingId(id);
    setItems(null);
    setNotice('');
    const m = (meetings || []).find((x) => String(x.id) === String(id));
    if (m?.notes && !notes.trim()) setNotes(m.notes);
  };

  const extract = async () => {
    setBusy('extract');
    setError(null);
    setNotice('');
    try {
      const res = await smartTriageService.extract(meetingId, notes, language);
      setTeam(res?.data?.team || []);
      setItems((res?.data?.items || []).map((it, i) => ({ ...it, key: i, include: true })));
    } catch (e) {
      setError(toError(e));
    } finally {
      setBusy('');
    }
  };

  const edit = (key, patch) => setItems((xs) => xs.map((x) => (x.key === key ? { ...x, ...patch } : x)));
  const chosen = (items || []).filter((x) => x.include && x.title.trim());

  const create = async () => {
    setBusy('create');
    setError(null);
    try {
      const res = await smartTriageService.createTasks(meetingId, {
        projectId: projectId ? Number(projectId) : null,
        taskListId: taskListId ? Number(taskListId) : null,
        items: chosen.map(({ title, description, assigneeId, scheduledDate, priority }) => ({ title, description, assigneeId: assigneeId || null, scheduledDate: scheduledDate || null, priority })),
      });
      setNotice(`Created ${res?.data?.count || 0} task${res?.data?.count === 1 ? '' : 's'} linked to "${meeting?.title}". Undo from Accounts → AI approvals.`);
      setItems(null);
    } catch (e) {
      setError(toError(e));
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <Card className="space-y-3 p-4">
        <label className="block text-sm font-medium text-gray-700">
          Meeting
          <select className={`${inputClass} mt-1 w-full`} value={meetingId} onChange={(e) => pickMeeting(e.target.value)}>
            <option value="">{meetings === null ? 'Loading…' : meetings.length ? 'Choose a meeting' : 'No meetings in the last 60 days'}</option>
            {(meetings || []).map((m) => (
              <option key={m.id} value={m.id}>
                {m.title} · {fmtDate(m.startTime)}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium text-gray-700">
          Notes or transcript
          <textarea
            className={`${inputClass} mt-1 h-64 w-full font-normal`}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Paste the meeting notes or transcript. Example: Asha to share the wireframes by Friday."
            maxLength={30000}
          />
        </label>
        <Button onClick={extract} disabled={!meetingId || !notes.trim() || Boolean(busy)}>
          <Sparkles className="mr-1.5 h-4 w-4" />
          {busy === 'extract' ? 'Reading notes…' : 'Find action items'}
        </Button>
      </Card>

      <div className="space-y-3">
        <ErrorBox error={error} />
        {notice && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{notice}</div>}
        {items === null ? (
          <Card className="p-10 text-center text-sm text-gray-500">Pick a meeting, paste its notes and Fudge AI lists the action items here for you to review.</Card>
        ) : !items.length ? (
          <Card className="p-10 text-center text-sm text-gray-500">No action items found in these notes.</Card>
        ) : (
          <Card className="space-y-3 p-4">
            <div className="flex flex-wrap items-end gap-2">
              <label className="text-xs font-medium text-gray-600">
                Project
                <select className={`${inputClass} mt-1 block`} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                  <option value="">No project</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              {lists.length > 0 && (
                <label className="text-xs font-medium text-gray-600">
                  List
                  <select className={`${inputClass} mt-1 block`} value={taskListId} onChange={(e) => setTaskListId(e.target.value)}>
                    <option value="">Default</option>
                    {lists.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <Button className="ml-auto" onClick={create} disabled={!chosen.length || Boolean(busy)}>
                <Check className="mr-1.5 h-4 w-4" />
                {busy === 'create' ? 'Creating…' : `Create ${chosen.length} task${chosen.length === 1 ? '' : 's'}`}
              </Button>
            </div>
            <ul className="divide-y divide-gray-100">
              {items.map((it) => (
                <li key={it.key} className={`grid gap-2 py-3 sm:grid-cols-[auto_minmax(0,1fr)] ${it.include ? '' : 'opacity-50'}`}>
                  <input type="checkbox" className="mt-2" checked={it.include} onChange={() => edit(it.key, { include: !it.include })} aria-label={`Include ${it.title}`} />
                  <div className="space-y-2">
                    <input className={`${inputClass} w-full font-medium`} value={it.title} onChange={(e) => edit(it.key, { title: e.target.value })} aria-label="Task title" />
                    {it.description && <p className="text-xs text-gray-500">{it.description}</p>}
                    <div className="flex flex-wrap gap-2">
                      <select className={inputClass} value={it.assigneeId || ''} onChange={(e) => edit(it.key, { assigneeId: e.target.value ? Number(e.target.value) : null })} aria-label="Owner">
                        <option value="">{it.ownerName && !it.assigneeId ? `Unassigned (said: ${it.ownerName})` : 'Unassigned'}</option>
                        {team.map((m) => (
                          <option key={m.userId} value={m.userId}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                      <input type="date" className={inputClass} value={it.scheduledDate || ''} onChange={(e) => edit(it.key, { scheduledDate: e.target.value || null })} aria-label="Due date" />
                      <select className={inputClass} value={it.priority} onChange={(e) => edit(it.key, { priority: e.target.value })} aria-label="Priority">
                        {PRIORITIES.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- page

export default function SmartTriagePage() {
  const [tab, setTab] = useState('triage');
  const [language, setLanguage] = useState('en');

  if (!IS_SAAS_PLATFORM) {
    return (
      <div className="p-6">
        <Card className="p-10 text-center text-sm text-gray-500">Smart triage is part of Fudge AI in the SaaS edition.</Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      <PMPageHeader title="Smart triage" subtitle="Fudge AI suggests owners, priorities and dates for new work, and turns meeting notes into tasks."
        breadcrumb={[
          { label: 'Dashboard', href: '/' },
          { label: 'Smart triage', href: '/triage' },
        ]}
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5 text-sm" role="tablist">
          {[
            ['triage', 'Triage inbox'],
            ['meeting', 'Meeting → tasks'],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={`rounded-md px-3 py-1.5 ${tab === key ? 'bg-orange-500 text-white' : 'text-gray-600 hover:text-gray-900'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-xs text-gray-500">
          AI output language
          <select className={inputClass} value={language} onChange={(e) => setLanguage(e.target.value)}>
            {LANGS.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {tab === 'triage' ? <TriageTab language={language} /> : <MeetingTab language={language} />}
    </div>
  );
}
