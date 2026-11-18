'use client';

/** Project → Sprints tab (W7): plan from the backlog, start / complete sprints, live burndown, velocity. */

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Play, Plus, Flag, CheckCircle2 } from 'lucide-react';
import { Button, Card, LoadingSpinner } from '@webfudge/ui';
import strapiClient from '../lib/strapiClient';

const inputClass =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20';
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const plusDays = (day, n) => {
  const [y, m, d] = day.split('-').map(Number);
  return ymd(new Date(y, m - 1, d + n));
};
const fmt = (d) => (d ? new Date(`${String(d).slice(0, 10)}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '—');
const STATUS_CLS = { planned: 'bg-gray-100 text-gray-700', active: 'bg-blue-50 text-blue-700', completed: 'bg-emerald-50 text-emerald-700' };

function TaskRow({ t, right }) {
  return (
    <li className="flex items-center gap-2 px-3 py-2 text-sm">
      <Link href={`/tasks/${t.id}`} className={`min-w-0 flex-1 truncate ${t.status === 'COMPLETED' ? 'text-gray-400 line-through' : 'text-gray-900'} hover:text-orange-600`}>
        {t.name}
      </Link>
      <span className="hidden w-28 truncate text-xs text-gray-500 sm:block">{t.assignee?.name || 'Unassigned'}</span>
      <span className={`w-12 text-right text-xs tabular-nums ${t.points ? 'text-gray-700' : 'text-amber-600'}`} title={t.points ? 'Story points' : 'No story points'}>
        {t.points || '?'} pt
      </span>
      {right}
    </li>
  );
}

export default function ProjectSprintsPanel({ projectId }) {
  const [data, setData] = useState(null);
  const [canPlan, setCanPlan] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [sprint, setSprint] = useState(null);
  const [pick, setPick] = useState(() => new Set());
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(() => {
    const s = ymd(new Date());
    return { name: '', goal: '', startDate: s, endDate: plusDays(s, 13) };
  });
  const [carryTo, setCarryTo] = useState('backlog');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await strapiClient.get('/sprints', { projectId });
      setData(res?.data || null);
      setCanPlan(Boolean(res?.meta?.canPlan));
      const list = res?.data?.sprints || [];
      setSelectedId((cur) => (cur && list.some((s) => s.id === cur) ? cur : (list.find((s) => s.status === 'active') || list.find((s) => s.status === 'planned') || list[list.length - 1])?.id || null));
    } catch (e) {
      setError(e?.message || 'Could not load sprints');
      setData({ sprints: [], backlog: [], velocity: [] });
    }
  }, [projectId]);

  const loadSprint = useCallback(async (id) => {
    if (!id) return setSprint(null);
    const res = await strapiClient.get(`/sprints/${id}`).catch(() => null);
    setSprint(res?.data || null);
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    loadSprint(selectedId);
  }, [selectedId, loadSprint]);

  const run = async (fn) => {
    setBusy(true);
    setError('');
    try {
      await fn();
      await load();
      await loadSprint(selectedId);
      return true;
    } catch (e) {
      setError(e?.message || 'Could not save');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const planned = useMemo(() => (data?.sprints || []).filter((s) => s.status === 'planned' && s.id !== selectedId), [data, selectedId]);
  const pickedPoints = (data?.backlog || []).filter((t) => pick.has(t.id)).reduce((a, t) => a + (t.points || 0), 0);

  if (!data) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {data.sprints.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSelectedId(s.id)}
            className={`rounded-full border px-3 py-1 text-sm ${selectedId === s.id ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-300 text-gray-700 hover:border-gray-400'}`}
          >
            {s.name}
            <span className={`ml-2 rounded-full px-1.5 py-0.5 text-[10px] font-medium uppercase ${STATUS_CLS[s.status]}`}>{s.status}</span>
          </button>
        ))}
        {canPlan && !creating ? (
          <Button variant="outline" size="sm" onClick={() => setCreating(true)}>
            <Plus className="mr-1 h-4 w-4" aria-hidden />
            New sprint
          </Button>
        ) : null}
        {data.averageVelocity != null ? <span className="ml-auto text-sm text-gray-600">Avg velocity (last 3): <strong>{data.averageVelocity} pt</strong></span> : null}
      </div>

      {creating ? (
        <Card className="border border-orange-200 bg-orange-50/40 p-4">
          <form
            className="grid gap-3 md:grid-cols-4"
            onSubmit={async (e) => {
              e.preventDefault();
              const ok = await run(() => strapiClient.post('/sprints', { data: { ...form, projectId } }));
              if (ok) {
                setCreating(false);
                setForm((f) => ({ name: '', goal: '', startDate: plusDays(f.endDate, 1), endDate: plusDays(f.endDate, 14) }));
              }
            }}
          >
            <label className="text-sm">
              <span className="mb-1 block font-medium text-gray-700">Name</span>
              <input className={inputClass} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder={`Sprint ${data.sprints.length + 1}`} required />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium text-gray-700">Starts</span>
              <input type="date" className={inputClass} value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value, endDate: plusDays(e.target.value, 13) }))} required />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium text-gray-700">Ends</span>
              <input type="date" className={inputClass} value={form.endDate} min={form.startDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} required />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium text-gray-700">Goal (optional)</span>
              <input className={inputClass} value={form.goal} onChange={(e) => setForm((f) => ({ ...f, goal: e.target.value }))} />
            </label>
            <div className="flex justify-end gap-2 md:col-span-4">
              <Button type="button" variant="outline" onClick={() => setCreating(false)} disabled={busy}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                Create sprint
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      {!data.sprints.length && !creating ? (
        <p className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
          No sprints yet. {canPlan ? 'Create a 2-week sprint, pull tasks in from the backlog and start it.' : 'The project manager can plan sprints here.'}
        </p>
      ) : null}

      {sprint ? (
        <div className="grid gap-4 xl:grid-cols-3">
          <Card className="space-y-4 border border-gray-200 p-5 xl:col-span-2">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-gray-900">{sprint.name}</h3>
                <p className="text-sm text-gray-600">
                  {fmt(sprint.startDate)} – {fmt(sprint.endDate)}
                  {sprint.goal ? ` · ${sprint.goal}` : ''}
                </p>
              </div>
              {canPlan && sprint.status === 'planned' ? (
                <Button onClick={() => run(() => strapiClient.post(`/sprints/${sprint.id}/start`, {}))} disabled={busy || !sprint.taskCount}>
                  <Play className="mr-1 h-4 w-4" aria-hidden />
                  Start sprint
                </Button>
              ) : null}
              {canPlan && sprint.status === 'active' ? (
                <div className="flex flex-wrap items-center gap-2">
                  <select className={`${inputClass} w-auto`} value={carryTo} onChange={(e) => setCarryTo(e.target.value)} aria-label="Move unfinished tasks to">
                    <option value="backlog">Unfinished → backlog</option>
                    {planned.map((s) => (
                      <option key={s.id} value={s.id}>
                        Unfinished → {s.name}
                      </option>
                    ))}
                  </select>
                  <Button onClick={() => run(() => strapiClient.post(`/sprints/${sprint.id}/complete`, { data: { carryTo } }))} disabled={busy}>
                    <CheckCircle2 className="mr-1 h-4 w-4" aria-hidden />
                    Complete sprint
                  </Button>
                </div>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                ['Points', `${sprint.pointsDone}/${sprint.points}`],
                ['Tasks done', `${sprint.doneCount}/${sprint.taskCount}`],
                ['Committed', sprint.committedPoints == null ? '—' : `${sprint.committedPoints} pt`],
                ['Without points', sprint.unpointed],
              ].map(([l, v]) => (
                <div key={l} className="rounded-lg border border-gray-200 p-3">
                  <p className="text-lg font-semibold text-gray-900">{v}</p>
                  <p className="text-xs text-gray-600">{l}</p>
                </div>
              ))}
            </div>

            {sprint.burndown?.total ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sprint.burndown.days} margin={{ left: 0, right: 16, top: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickFormatter={fmt} tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip labelFormatter={fmt} />
                    <Legend />
                    <Line type="linear" dataKey="ideal" name="Ideal" stroke="#9ca3af" strokeDasharray="5 5" dot={false} />
                    <Line type="stepAfter" dataKey="actual" name="Remaining" stroke="#f97316" strokeWidth={2} dot={{ r: 2 }} connectNulls={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Burndown appears once sprint tasks have story points.</p>
            )}

            <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
              {sprint.tasks.map((t) => (
                <TaskRow
                  key={t.id}
                  t={t}
                  right={
                    canPlan && sprint.status !== 'completed' ? (
                      <button type="button" className="text-xs text-gray-400 hover:text-red-600" onClick={() => run(() => strapiClient.put(`/sprints/${sprint.id}/tasks`, { data: { remove: [t.id] } }))} aria-label={`Move ${t.name} back to backlog`}>
                        Remove
                      </button>
                    ) : null
                  }
                />
              ))}
              {!sprint.tasks.length ? <li className="px-3 py-6 text-center text-sm text-gray-500">No tasks in this sprint yet.</li> : null}
            </ul>
          </Card>

          <div className="space-y-4">
            {canPlan && sprint.status !== 'completed' ? (
              <Card className="space-y-3 border border-gray-200 p-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-gray-900">Backlog</h3>
                  <span className="text-xs text-gray-500">{data.backlog.length} open</span>
                </div>
                <ul className="max-h-80 divide-y divide-gray-100 overflow-y-auto rounded-lg border border-gray-200">
                  {data.backlog.map((t) => (
                    <TaskRow
                      key={t.id}
                      t={t}
                      right={
                        <input
                          type="checkbox"
                          checked={pick.has(t.id)}
                          onChange={(e) =>
                            setPick((s) => {
                              const n = new Set(s);
                              if (e.target.checked) n.add(t.id);
                              else n.delete(t.id);
                              return n;
                            })
                          }
                          aria-label={`Select ${t.name}`}
                        />
                      }
                    />
                  ))}
                  {!data.backlog.length ? <li className="px-3 py-6 text-center text-sm text-gray-500">Backlog is empty.</li> : null}
                </ul>
                <Button
                  className="w-full"
                  disabled={!pick.size || busy}
                  onClick={async () => {
                    if (await run(() => strapiClient.put(`/sprints/${sprint.id}/tasks`, { data: { add: [...pick] } }))) setPick(new Set());
                  }}
                >
                  Add {pick.size || ''} to {sprint.name}
                  {pickedPoints ? ` (${pickedPoints} pt)` : ''}
                </Button>
                {data.averageVelocity != null ? (
                  <p className="text-xs text-gray-500">
                    Team usually completes ~{data.averageVelocity} pt per sprint; this sprint has {sprint.points} pt.
                  </p>
                ) : null}
              </Card>
            ) : null}

            {data.velocity.length ? (
              <Card className="space-y-2 border border-gray-200 p-5">
                <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900">
                  <Flag className="h-4 w-4 text-orange-600" aria-hidden />
                  Velocity
                </h3>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.velocity} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="committed" name="Committed" fill="#d1d5db" />
                      <Bar dataKey="completed" name="Completed" fill="#f97316" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
