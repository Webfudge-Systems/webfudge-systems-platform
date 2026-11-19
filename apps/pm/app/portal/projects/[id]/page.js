'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Circle, Download, FileText, Flag, MessageSquarePlus, ThumbsUp, Undo2 } from 'lucide-react';
import PortalShell, { ProgressBar, StatusPill, fmtDate } from '../../../../components/portal/PortalShell';
import usePortalMe from '../../../../components/portal/usePortalMe';
import { fileUrl, portalRequest } from '../../../../lib/portalClient';

const section = 'rounded-2xl border border-gray-200 bg-white p-5 shadow-sm';
const APPROVAL = {
  pending: { label: 'Waiting for your review', cls: 'bg-amber-50 text-amber-800 ring-amber-200' },
  approved: { label: 'Approved', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  changes_requested: { label: 'Changes requested', cls: 'bg-rose-50 text-rose-700 ring-rose-200' },
};

function Deliverable({ task, projectId, onChange }) {
  const [mode, setMode] = useState(null); // 'approve' | 'request_changes'
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const a = APPROVAL[task.approval?.status];

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const updated = await portalRequest(`/projects/${projectId}/tasks/${task.id}/approval`, { method: 'POST', body: { decision: mode, comment } });
      setMode(null);
      setComment('');
      onChange(updated);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="rounded-xl border border-gray-200 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium">{task.name}</p>
          {task.dueDate ? <p className="mt-0.5 text-xs text-gray-500">Due {fmtDate(task.dueDate)}</p> : null}
        </div>
        {a ? <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${a.cls}`}>{a.label}</span> : null}
      </div>
      {task.description ? <p className="mt-2 whitespace-pre-line text-sm text-gray-600">{task.description}</p> : null}
      {task.approval?.status !== 'pending' && task.approval?.comment ? (
        <p className="mt-2 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
          Your note{task.approval.at ? ` (${fmtDate(task.approval.at)})` : ''}: “{task.approval.comment}”
        </p>
      ) : null}
      {task.approval?.status === 'pending' && !mode ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => setMode('approve')} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
            <ThumbsUp className="h-4 w-4" /> Approve
          </button>
          <button type="button" onClick={() => setMode('request_changes')} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50">
            <Undo2 className="h-4 w-4" /> Request changes
          </button>
        </div>
      ) : null}
      {mode ? (
        <form onSubmit={submit} className="mt-3 space-y-2">
          <label htmlFor={`c-${task.id}`} className="block text-sm font-medium text-gray-700">
            {mode === 'approve' ? 'Add a note (optional)' : 'What should change?'}
          </label>
          <textarea
            id={`c-${task.id}`}
            rows={3}
            required={mode === 'request_changes'}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={5000}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#F5630F] focus:outline-none focus:ring-2 focus:ring-[#F5630F]/20"
          />
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy}
              className={`rounded-lg px-3 py-2 text-sm font-semibold text-white disabled:opacity-60 ${mode === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-gray-900 hover:bg-black'}`}
            >
              {busy ? 'Sending…' : mode === 'approve' ? 'Confirm approval' : 'Send to the team'}
            </button>
            <button type="button" onClick={() => setMode(null)} className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100">
              Cancel
            </button>
          </div>
        </form>
      ) : null}
    </li>
  );
}

function RequestForm({ projectId, onCreated }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const task = await portalRequest(`/projects/${projectId}/requests`, { method: 'POST', body: { title, description } });
      setTitle('');
      setDescription('');
      setOpen(false);
      setSent(true);
      onCreated(task);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <div>
        {sent ? <p className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Thanks, your request was sent to the team.</p> : null}
        <button type="button" onClick={() => { setOpen(true); setSent(false); }} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-black">
          <MessageSquarePlus className="h-4 w-4" /> Raise a request
        </button>
      </div>
    );
  }
  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label htmlFor="req-title" className="block text-sm font-medium text-gray-700">What do you need?</label>
        <input id="req-title" required maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Add our new office address"
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#F5630F] focus:outline-none focus:ring-2 focus:ring-[#F5630F]/20" />
      </div>
      <div>
        <label htmlFor="req-desc" className="block text-sm font-medium text-gray-700">Details (optional)</label>
        <textarea id="req-desc" rows={4} maxLength={5000} value={description} onChange={(e) => setDescription(e.target.value)}
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#F5630F] focus:outline-none focus:ring-2 focus:ring-[#F5630F]/20" />
      </div>
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black disabled:opacity-60">{busy ? 'Sending…' : 'Send request'}</button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100">Cancel</button>
      </div>
    </form>
  );
}

export default function PortalProject() {
  const { id } = useParams();
  const { loading, me, error: meError, signOut } = usePortalMe();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setData(await portalRequest(`/projects/${id}`));
    } catch (e) {
      if (e.status === 401 || e.status === 403) return window.location.assign('/portal');
      setError(e.status === 404 ? 'This project is not shared with you.' : e.message);
    }
  }, [id]);

  useEffect(() => {
    if (me) load();
  }, [me, load]);

  useEffect(() => {
    if (!loading && !me) window.location.assign('/portal');
  }, [loading, me, meError]);

  const replaceTask = (task) =>
    setData((d) => ({ ...d, deliverables: d.deliverables.map((t) => (t.id === task.id ? task : t)) }));

  if (loading || !me) return <PortalShell><div className="py-24 text-center text-sm text-gray-500">Loading…</div></PortalShell>;

  return (
    <PortalShell me={me} onSignOut={signOut}>
      <Link href="/portal" className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900">
        <ArrowLeft className="h-4 w-4" /> All projects
      </Link>
      {error ? (
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-600">{error}</div>
      ) : !data ? (
        <div className="py-24 text-center text-sm text-gray-500">Loading…</div>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight">{data.project.name}</h1>
              {data.project.description ? <p className="mt-1 max-w-2xl text-sm text-gray-600">{data.project.description}</p> : null}
            </div>
            <StatusPill status={data.project.status} />
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-3">
            <div className="space-y-5 lg:col-span-2">
              <section className={section}>
                <div className="flex items-end justify-between">
                  <h2 className="text-sm font-semibold">Progress</h2>
                  <span className="text-2xl font-bold tabular-nums text-[#F5630F]">{data.project.progress.percent}%</span>
                </div>
                <div className="mt-3"><ProgressBar percent={data.project.progress.percent} /></div>
                <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs text-gray-500">
                  <span>{data.project.progress.done} of {data.project.progress.total} tasks done</span>
                  <span>
                    {data.project.startDate ? fmtDate(data.project.startDate) : 'Start not set'} → {data.project.endDate ? fmtDate(data.project.endDate) : 'End not set'}
                  </span>
                </div>
              </section>

              {data.deliverables.length ? (
                <section className={section}>
                  <h2 className="text-sm font-semibold">Deliverables</h2>
                  <p className="mt-0.5 text-xs text-gray-500">Approve the work, or tell the team what to change.</p>
                  <ul className="mt-3 space-y-3">
                    {data.deliverables.map((t) => (
                      <Deliverable key={t.id} task={t} projectId={data.project.id} onChange={replaceTask} />
                    ))}
                  </ul>
                </section>
              ) : null}

              <section className={section}>
                <h2 className="text-sm font-semibold">Tasks</h2>
                {data.tasks.length === 0 ? (
                  <p className="mt-2 text-sm text-gray-500">Nothing shared here yet.</p>
                ) : (
                  <ul className="mt-2 divide-y divide-gray-100">
                    {data.tasks.map((t) => (
                      <li key={t.id} className="flex items-start gap-3 py-2.5">
                        {t.status === 'COMPLETED' ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> : <Circle className="mt-0.5 h-4 w-4 shrink-0 text-gray-300" />}
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm ${t.status === 'COMPLETED' ? 'text-gray-500 line-through' : 'text-gray-900'}`}>{t.name}</p>
                          <p className="text-xs text-gray-500">
                            {t.raisedByYou ? 'Your request · ' : ''}
                            {t.dueDate ? `Due ${fmtDate(t.dueDate)}` : `Added ${fmtDate(t.createdAt)}`}
                          </p>
                        </div>
                        <StatusPill status={t.status} />
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            <div className="space-y-5">
              <section className={section}>
                <h2 className="text-sm font-semibold">Need something?</h2>
                <p className="mb-3 mt-0.5 text-xs text-gray-500">Your request goes straight to the project team.</p>
                <RequestForm projectId={data.project.id} onCreated={(task) => setData((d) => ({ ...d, tasks: [task, ...d.tasks] }))} />
              </section>

              <section className={section}>
                <h2 className="text-sm font-semibold">Milestones</h2>
                {data.milestones.length === 0 ? (
                  <p className="mt-2 text-sm text-gray-500">No milestones shared yet.</p>
                ) : (
                  <ol className="mt-3 space-y-3">
                    {data.milestones.map((m) => (
                      <li key={m.id} className="flex items-start gap-3">
                        <Flag className={`mt-0.5 h-4 w-4 shrink-0 ${m.status === 'COMPLETED' ? 'text-emerald-600' : 'text-[#F5630F]'}`} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{m.name}</p>
                          <p className="text-xs text-gray-500">{m.status === 'COMPLETED' ? `Reached ${fmtDate(m.completedAt) || ''}` : m.dueDate ? `Target ${fmtDate(m.dueDate)}` : 'No date yet'}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </section>

              <section className={section}>
                <h2 className="text-sm font-semibold">Files</h2>
                {data.files.length === 0 ? (
                  <p className="mt-2 text-sm text-gray-500">No files shared yet.</p>
                ) : (
                  <ul className="mt-2 divide-y divide-gray-100">
                    {data.files.map((f) => (
                      <li key={f.id} className="flex items-center gap-3 py-2.5">
                        <FileText className="h-4 w-4 shrink-0 text-gray-400" />
                        <span className="min-w-0 flex-1 truncate text-sm">{f.name}</span>
                        {f.url ? (
                          <a href={fileUrl(f.url)} target="_blank" rel="noreferrer noopener" className="text-gray-400 hover:text-[#F5630F]" aria-label={`Download ${f.name}`}>
                            <Download className="h-4 w-4" />
                          </a>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </div>
        </>
      )}
    </PortalShell>
  );
}
