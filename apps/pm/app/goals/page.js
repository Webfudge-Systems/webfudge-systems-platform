'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, Pencil, Plus, Target, Trash2 } from 'lucide-react';
import { Button, Card, LoadingSpinner } from '@webfudge/ui';
import PMPageHeader from '../../components/PMPageHeader';
import strapiClient from '../../lib/strapiClient';
import goalService from '../../lib/api/goalService';
import KeyResultRow from '../../components/goals/KeyResultRow';
import KeyResultForm from '../../components/goals/KeyResultForm';
import { HealthChip, ProgressBar, inputClass, userName, currentQuarter } from '../../components/goals/goalUi';

function ObjectiveForm({ initial, users, busy, onSave, onCancel }) {
  const [d, setD] = useState(() => ({
    title: initial?.title || '',
    description: initial?.description || '',
    periodLabel: initial?.periodLabel ?? currentQuarter(),
    startDate: initial?.startDate || '',
    endDate: initial?.endDate || '',
    ownerId: initial?.owner?.id ? String(initial.owner.id) : '',
    visibility: initial?.visibility || 'organization',
    status: initial?.status || 'active',
  }));
  const set = (k, v) => setD((x) => ({ ...x, [k]: v }));
  return (
    <form
      className="grid gap-3 md:grid-cols-6"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ ...d, ownerId: d.ownerId ? Number(d.ownerId) : undefined, startDate: d.startDate || null, endDate: d.endDate || null });
      }}
    >
      <label className="text-sm md:col-span-4">
        <span className="mb-1 block font-medium text-gray-700">Objective</span>
        <input className={inputClass} value={d.title} onChange={(e) => set('title', e.target.value)} required placeholder="Launch the new website" autoFocus />
      </label>
      <label className="text-sm md:col-span-2">
        <span className="mb-1 block font-medium text-gray-700">Period</span>
        <input className={inputClass} value={d.periodLabel} onChange={(e) => set('periodLabel', e.target.value)} placeholder="Q4 2026" />
      </label>
      <label className="text-sm md:col-span-6">
        <span className="mb-1 block font-medium text-gray-700">Why it matters (optional)</span>
        <textarea className={inputClass} rows={2} value={d.description} onChange={(e) => set('description', e.target.value)} />
      </label>
      <label className="text-sm md:col-span-2">
        <span className="mb-1 block font-medium text-gray-700">Owner</span>
        <select className={inputClass} value={d.ownerId} onChange={(e) => set('ownerId', e.target.value)}>
          <option value="">{initial ? 'Nobody' : 'Me'}</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {userName(u)}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm">
        <span className="mb-1 block font-medium text-gray-700">Starts</span>
        <input type="date" className={inputClass} value={d.startDate} onChange={(e) => set('startDate', e.target.value)} />
      </label>
      <label className="text-sm">
        <span className="mb-1 block font-medium text-gray-700">Ends</span>
        <input type="date" className={inputClass} value={d.endDate} onChange={(e) => set('endDate', e.target.value)} />
      </label>
      <label className="text-sm">
        <span className="mb-1 block font-medium text-gray-700">Visible to</span>
        <select className={inputClass} value={d.visibility} onChange={(e) => set('visibility', e.target.value)}>
          <option value="organization">Everyone</option>
          <option value="private">Owner and admins</option>
        </select>
      </label>
      {initial ? (
        <label className="text-sm">
          <span className="mb-1 block font-medium text-gray-700">Status</span>
          <select className={inputClass} value={d.status} onChange={(e) => set('status', e.target.value)}>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>
        </label>
      ) : null}
      <div className="flex items-end justify-end gap-2 md:col-span-6">
        <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" disabled={busy || !d.title.trim()}>
          {initial ? 'Save' : 'Create objective'}
        </Button>
      </div>
    </form>
  );
}

function ObjectiveCard({ objective, users, projects, onChanged, onDeleted }) {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [mode, setMode] = useState(null); // 'edit' | 'add-kr'
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const o = detail || objective;

  const loadDetail = useCallback(async () => {
    const res = await goalService.getObjective(objective.id).catch(() => null);
    if (res?.data) setDetail(res.data);
  }, [objective.id]);

  useEffect(() => {
    if (open) loadDetail();
  }, [open, loadDetail]);

  const applied = (next) => {
    if (next) setDetail(next);
    onChanged?.(next);
  };

  const run = async (fn) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fn();
      setMode(null);
      applied(res?.data);
      return res;
    } catch (e) {
      setError(e?.message || 'Could not save');
      return null;
    } finally {
      setBusy(false);
    }
  };

  const krCount = o.keyResults?.length || 0;
  return (
    <Card className={`border p-0 ${o.status === 'active' ? 'border-gray-200' : 'border-dashed border-gray-300'}`}>
      {mode === 'edit' ? (
        <div className="p-4">
          <ObjectiveForm initial={o} users={users} busy={busy} onCancel={() => setMode(null)} onSave={(d) => run(() => goalService.updateObjective(o.id, d))} />
          {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
        </div>
      ) : (
        <button type="button" className="flex w-full items-start gap-3 p-4 text-left" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          {open ? <ChevronDown className="mt-0.5 h-5 w-5 shrink-0 text-gray-400" aria-hidden /> : <ChevronRight className="mt-0.5 h-5 w-5 shrink-0 text-gray-400" aria-hidden />}
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-start gap-x-3 gap-y-1">
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-semibold text-gray-900">{o.title}</h2>
                <p className="text-xs text-gray-500">
                  {[o.periodLabel, o.owner?.name, `${krCount} key result${krCount === 1 ? '' : 's'}`, o.status !== 'active' ? o.status : null, o.visibility === 'private' ? 'private' : null]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
              {krCount ? <HealthChip value={o.health} /> : null}
              <span className="w-12 text-right text-lg font-semibold tabular-nums text-gray-900">{Math.round(o.progress)}%</span>
            </div>
            <ProgressBar value={o.progress} health={o.health} />
          </div>
        </button>
      )}

      {open && mode !== 'edit' ? (
        <div className="space-y-3 border-t border-gray-100 bg-gray-50/60 p-4">
          {o.description ? <p className="text-sm text-gray-600">{o.description}</p> : null}
          {!detail ? (
            <div className="flex justify-center py-4">
              <LoadingSpinner size="sm" />
            </div>
          ) : (
            <ul className="space-y-2">
              {detail.keyResults.map((kr) => (
                <KeyResultRow key={kr.id} kr={kr} canEdit={detail.canEdit} canCheckIn={kr.canCheckIn} users={users} projects={projects} onChanged={applied} />
              ))}
              {!detail.keyResults.length ? <li className="text-sm text-gray-500">No key results yet. Add two to five measurable results.</li> : null}
            </ul>
          )}
          {mode === 'add-kr' ? (
            <div className="rounded-lg border border-orange-200 bg-white p-3">
              <KeyResultForm users={users} projects={projects} busy={busy} onCancel={() => setMode(null)} onSave={(d) => run(() => goalService.createKeyResult(o.id, d))} />
            </div>
          ) : null}
          {error && mode !== 'edit' ? <p className="text-sm text-red-600">{error}</p> : null}
          {o.canEdit && mode !== 'add-kr' ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setMode('add-kr')}>
                <Plus className="mr-1 h-4 w-4" aria-hidden />
                Key result
              </Button>
              <div className="ml-auto flex gap-1">
                <button type="button" className="rounded p-1.5 text-gray-500 hover:bg-gray-100" onClick={() => setMode('edit')} aria-label={`Edit ${o.title}`}>
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="rounded p-1.5 text-red-500 hover:bg-red-50"
                  onClick={async () => {
                    if (!window.confirm(`Delete "${o.title}" with its key results and check-ins?`)) return;
                    try {
                      await goalService.deleteObjective(o.id);
                      onDeleted?.(o.id);
                    } catch (e) {
                      setError(e?.message || 'Could not delete');
                    }
                  }}
                  aria-label={`Delete ${o.title}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}

export default function GoalsPage() {
  const [rows, setRows] = useState(null);
  const [periods, setPeriods] = useState([]);
  const [period, setPeriod] = useState('');
  const [status, setStatus] = useState('');
  const [mine, setMine] = useState(false);
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  const load = useCallback(async () => {
    try {
      const params = {};
      if (period) params.period = period;
      if (status) params.status = status;
      if (mine) params.mine = '1';
      const res = await goalService.listObjectives(params);
      setRows(Array.isArray(res?.data) ? res.data : []);
      setPeriods(res?.meta?.periods || []);
    } catch (e) {
      setRows([]);
      setMessage({ tone: 'error', text: e?.message || 'Could not load goals' });
    }
  }, [period, status, mine]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    Promise.all([
      strapiClient.getOrganizationUsers({ pageSize: 200 }).catch(() => ({ data: [] })),
      strapiClient.get('/projects', { 'pagination[pageSize]': 200, 'fields[0]': 'name', 'fields[1]': 'slug', sort: 'name:asc' }).catch(() => ({ data: [] })),
    ]).then(([u, p]) => {
      setUsers(Array.isArray(u?.data) ? u.data : []);
      setProjects((Array.isArray(p?.data) ? p.data : []).map((x) => ({ id: x.id, name: x.name || x.attributes?.name, slug: x.slug || x.attributes?.slug })));
    });
  }, []);

  const replaceRow = (next) => {
    if (!next) return;
    setRows((list) => (list || []).map((r) => (r.id === next.id ? { ...r, ...next } : r)));
  };

  const summary = rows?.length
    ? {
        avg: Math.round(rows.reduce((a, r) => a + (Number(r.progress) || 0), 0) / rows.length),
        atRisk: rows.filter((r) => r.keyResults?.length && r.health !== 'on_track').length,
      }
    : null;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PMPageHeader
        title="Goals"
        subtitle="Objectives and key results. Link projects or tasks and progress updates as work gets done."
        breadcrumb={[
          { label: 'Dashboard', href: '/' },
          { label: 'Goals', href: '/goals' },
        ]}
      />

      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="mb-1 block font-medium text-gray-700">Period</span>
          <select className={inputClass} value={period} onChange={(e) => setPeriod(e.target.value)}>
            <option value="">All periods</option>
            {periods.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-gray-700">Status</span>
          <select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Active and completed</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
            <option value="all">All</option>
          </select>
        </label>
        <label className="flex items-center gap-2 pb-2 text-sm text-gray-700">
          <input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} />
          Owned by me
        </label>
        {!adding ? (
          <Button className="ml-auto" onClick={() => setAdding(true)}>
            <Plus className="mr-1 h-4 w-4" aria-hidden />
            New objective
          </Button>
        ) : null}
      </div>

      {message ? (
        <p className={`rounded-lg border px-4 py-2.5 text-sm ${message.tone === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`} role={message.tone === 'error' ? 'alert' : 'status'}>
          {message.text}
        </p>
      ) : null}

      {adding ? (
        <Card className="border border-orange-200 bg-orange-50/40 p-4">
          <ObjectiveForm
            users={users}
            busy={busy}
            onCancel={() => setAdding(false)}
            onSave={async (d) => {
              setBusy(true);
              setMessage(null);
              try {
                await goalService.createObjective(d);
                setAdding(false);
                setMessage({ tone: 'ok', text: `Objective "${d.title}" created. Open it to add key results.` });
                await load();
              } catch (e) {
                setMessage({ tone: 'error', text: e?.message || 'Could not create the objective' });
              } finally {
                setBusy(false);
              }
            }}
          />
        </Card>
      ) : null}

      {summary ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Card className="border border-gray-200 p-4">
            <p className="text-xs font-medium text-gray-500">Objectives</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-gray-900">{rows.length}</p>
          </Card>
          <Card className="border border-gray-200 p-4">
            <p className="text-xs font-medium text-gray-500">Average progress</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-gray-900">{summary.avg}%</p>
          </Card>
          <Card className="border border-gray-200 p-4">
            <p className="text-xs font-medium text-gray-500">Need attention</p>
            <p className={`mt-1 text-2xl font-semibold tabular-nums ${summary.atRisk ? 'text-amber-700' : 'text-gray-900'}`}>{summary.atRisk}</p>
          </Card>
        </div>
      ) : null}

      {rows === null ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : !rows.length ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-10 text-center">
          <Target className="mx-auto h-8 w-8 text-gray-300" aria-hidden />
          <p className="mt-2 text-sm text-gray-600">No objectives{period ? ` for ${period}` : ''} yet.</p>
          <p className="text-sm text-gray-500">Set an objective, add key results, and link the projects or tasks that deliver them.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((o) => (
            <ObjectiveCard key={o.id} objective={o} users={users} projects={projects} onChanged={replaceRow} onDeleted={(id) => setRows((list) => list.filter((r) => r.id !== id))} />
          ))}
        </div>
      )}
    </div>
  );
}
