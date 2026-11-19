'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, GripVertical } from 'lucide-react';
import { Button, Card, LoadingSpinner } from '@webfudge/ui';
import PMPageHeader from '../../components/PMPageHeader';
import strapiClient from '../../lib/strapiClient';

const inputClass =
  'rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20';
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const mondayOf = (d = new Date()) => ymd(new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7)));
const addDays = (day, n) => {
  const [y, m, d] = day.split('-').map(Number);
  return ymd(new Date(y, m - 1, d + n));
};
const weekLabel = (ws) => new Date(`${ws}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
const STATE = {
  over: 'bg-red-50 border-red-200',
  full: 'bg-amber-50 border-amber-200',
  ok: 'bg-emerald-50/60 border-emerald-100',
  off: 'bg-gray-50 border-gray-200',
};

export default function CapacityPage() {
  const [weekStart, setWeekStart] = useState(() => mondayOf());
  const [weeks, setWeeks] = useState(4);
  const [departmentId, setDepartmentId] = useState('');
  const [jobRole, setJobRole] = useState('');
  const [plan, setPlan] = useState(null);
  const [manager, setManager] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [dragOver, setDragOver] = useState(null);
  const [selected, setSelected] = useState(null);
  const [estimate, setEstimate] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const res = await strapiClient.get('/capacity', { weekStart, weeks, ...(departmentId ? { departmentId } : {}), ...(jobRole ? { jobRole } : {}) });
      setPlan(res?.data || null);
      setManager(Boolean(res?.meta?.manager));
    } catch (e) {
      setError(e?.message || 'Could not load capacity');
    }
  }, [weekStart, weeks, departmentId, jobRole]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!manager) return;
    strapiClient
      .get('/departments')
      .then((r) => setDepartments(Array.isArray(r?.data) ? r.data : []))
      .catch(() => {});
  }, [manager]);

  const nextWeekOver = useMemo(() => {
    if (!plan) return [];
    const i = plan.weekStarts.indexOf(addDays(mondayOf(), 7));
    if (i < 0) return [];
    return plan.rows.filter((r) => r.cells[i]?.state === 'over').map((r) => r.name);
  }, [plan]);

  const act = async (fn, msg) => {
    setError('');
    setOk('');
    try {
      await fn();
      if (msg) setOk(msg);
      await load();
    } catch (e) {
      setError(e?.message || 'Could not save');
    }
  };

  const onDrop = (e, row, cell) => {
    e.preventDefault();
    setDragOver(null);
    let payload;
    try {
      payload = JSON.parse(e.dataTransfer.getData('application/json'));
    } catch {
      return;
    }
    const sameUser = payload.userId === row.userId;
    const sameWeek = payload.weekStart === cell.weekStart;
    if (sameUser && sameWeek) return;
    const data = {};
    if (!sameUser) data.assignee = row.userId;
    if (!sameWeek && payload.scheduledDate) {
      const offset = Math.max(0, Math.round((new Date(`${payload.scheduledDate}T00:00:00`) - new Date(`${payload.weekStart}T00:00:00`)) / 86400000));
      data.scheduledDate = addDays(cell.weekStart, Math.min(6, offset));
    } else if (!sameWeek) {
      data.scheduledDate = addDays(cell.weekStart, 4);
    }
    act(
      () => strapiClient.put(`/tasks/${payload.taskId}`, { data }),
      `Moved "${payload.name}"${!sameUser ? ` to ${row.name}` : ''}${!sameWeek ? ` (week of ${weekLabel(cell.weekStart)})` : ''}.`
    );
  };

  const saveEstimate = () => {
    if (!selected) return;
    const h = estimate === '' ? null : Number(estimate);
    if (h != null && (!Number.isFinite(h) || h < 0 || h > 500)) return setError('Estimate must be between 0 and 500 hours');
    act(() => strapiClient.put(`/tasks/${selected.id}`, { data: { estimatedHours: h } }), `Estimate saved for "${selected.name}".`);
    setSelected(null);
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PMPageHeader
        title="Capacity"
        subtitle="Who has room and who is over capacity: estimated hours per person per week. Drag a task to another person or week to rebalance."
        breadcrumb={[
          { label: 'Dashboard', href: '/' },
          { label: 'Capacity', href: '/capacity' },
        ]}
      />

      <Card className="flex flex-wrap items-end gap-3 border border-gray-200 p-4">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={() => setWeekStart((w) => addDays(w, -7))} aria-label="Previous week">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[8rem] text-center text-sm font-medium">From {weekLabel(weekStart)}</span>
          <Button variant="outline" size="sm" onClick={() => setWeekStart((w) => addDays(w, 7))} aria-label="Next week">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setWeekStart(mondayOf())}>
            This week
          </Button>
        </div>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-gray-700">Weeks</span>
          <select className={inputClass} value={weeks} onChange={(e) => setWeeks(Number(e.target.value))}>
            {[2, 4, 6, 8].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        {manager ? (
          <>
            <label className="text-sm">
              <span className="mb-1 block font-medium text-gray-700">Team</span>
              <select className={inputClass} value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
                <option value="">Everyone</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium text-gray-700">Role</span>
              <select className={inputClass} value={jobRole} onChange={(e) => setJobRole(e.target.value)}>
                <option value="">All roles</option>
                {(plan?.jobRoles || []).map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
          </>
        ) : null}
      </Card>

      {nextWeekOver.length ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700" role="status">
          Over capacity next week: <span className="font-semibold">{nextWeekOver.join(', ')}</span>. Drag some of their tasks to someone with room.
        </p>
      ) : null}
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      {ok ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800" role="status">
          {ok}
        </p>
      ) : null}

      {!plan ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : (
        <Card className="overflow-x-auto border border-gray-200 p-0">
          <table className="min-w-full border-separate border-spacing-1 text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="min-w-[12rem] px-2 py-2 font-medium">Person</th>
                {plan.weekStarts.map((ws) => (
                  <th key={ws} className="min-w-[13rem] px-2 py-2 font-medium">
                    Week of {weekLabel(ws)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {plan.rows.map((row) => (
                <tr key={row.userId} className="align-top">
                  <td className="px-2 py-2">
                    <p className="font-medium text-gray-900">{row.name}</p>
                    <p className="text-xs text-gray-500">{[row.jobRole, row.orgRole].filter(Boolean).join(' · ') || '—'}</p>
                    {manager ? (
                      <div className="mt-1 flex items-center gap-2 text-xs text-gray-600">
                        <label className="flex items-center gap-1">
                          <input
                            className="w-14 rounded border border-gray-300 px-1.5 py-0.5 text-right"
                            defaultValue={row.capacity}
                            inputMode="decimal"
                            aria-label={`${row.name} weekly capacity`}
                            onBlur={(e) => {
                              const v = Number(e.target.value);
                              if (v !== row.capacity) act(() => strapiClient.put(`/capacity/members/${row.userId}`, { data: { weeklyCapacityHours: v } }), `${row.name}: ${v} h/week.`);
                            }}
                          />
                          h/week
                        </label>
                        <input
                          className="w-24 rounded border border-gray-300 px-1.5 py-0.5"
                          defaultValue={row.jobRole || ''}
                          placeholder="Role"
                          aria-label={`${row.name} job role`}
                          onBlur={(e) => {
                            if ((e.target.value || null) !== (row.jobRole || null)) act(() => strapiClient.put(`/capacity/members/${row.userId}`, { data: { jobRole: e.target.value } }));
                          }}
                        />
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500">{row.capacity} h/week</p>
                    )}
                    {row.noDate.length ? <p className="mt-1 text-xs text-gray-400">{row.noDate.length} open task(s) without a due date</p> : null}
                  </td>
                  {row.cells.map((cell) => {
                    const key = `${row.userId}|${cell.weekStart}`;
                    return (
                      <td
                        key={cell.weekStart}
                        className={`rounded-lg border p-2 ${STATE[cell.state]} ${dragOver === key ? 'ring-2 ring-orange-400' : ''}`}
                        onDragOver={(e) => {
                          if (!manager) return;
                          e.preventDefault();
                          setDragOver(key);
                        }}
                        onDragLeave={() => setDragOver((k) => (k === key ? null : k))}
                        onDrop={(e) => manager && onDrop(e, row, cell)}
                        aria-label={`${row.name}, week of ${weekLabel(cell.weekStart)}: ${cell.allocated} of ${row.capacity} hours`}
                      >
                        <div className="mb-1.5 flex items-baseline justify-between">
                          <span className={`text-sm font-semibold tabular-nums ${cell.state === 'over' ? 'text-red-700' : 'text-gray-900'}`}>
                            {cell.allocated}h <span className="font-normal text-gray-500">/ {row.capacity}h</span>
                          </span>
                          {cell.utilization != null ? <span className="text-xs text-gray-500">{cell.utilization}%</span> : null}
                        </div>
                        {cell.unestimated ? <p className="mb-1 text-xs text-amber-700">{cell.unestimated} without estimate</p> : null}
                        <ul className="space-y-1">
                          {cell.tasks.map((t) => (
                            <li
                              key={t.id}
                              draggable={manager}
                              onDragStart={(e) =>
                                e.dataTransfer.setData(
                                  'application/json',
                                  JSON.stringify({ taskId: t.id, name: t.name, userId: row.userId, weekStart: cell.weekStart, scheduledDate: t.scheduledDate })
                                )
                              }
                              className={`flex items-center gap-1 rounded-md border bg-white px-1.5 py-1 text-xs shadow-sm ${t.overdue ? 'border-red-200' : 'border-gray-200'} ${manager ? 'cursor-grab' : ''}`}
                            >
                              {manager ? <GripVertical className="h-3 w-3 shrink-0 text-gray-300" aria-hidden /> : null}
                              <button
                                type="button"
                                className="min-w-0 flex-1 truncate text-left text-gray-800"
                                title={`${t.name}${t.project ? ` · ${t.project.name}` : ''}${t.overdue ? ' · overdue' : ''}`}
                                onClick={() => {
                                  setSelected(t);
                                  setEstimate(t.estimatedHours == null ? '' : String(t.estimatedHours));
                                }}
                              >
                                {t.name}
                              </button>
                              <span className={`shrink-0 tabular-nums ${t.estimatedHours == null ? 'text-amber-600' : 'text-gray-500'}`}>
                                {t.estimatedHours == null ? '?' : `${t.estimatedHours}h`}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </td>
                    );
                  })}
                </tr>
              ))}
              {!plan.rows.length ? (
                <tr>
                  <td colSpan={plan.weekStarts.length + 1} className="p-8 text-center text-gray-500">
                    Nobody matches these filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </Card>
      )}

      {selected ? (
        <Card className="flex flex-wrap items-end gap-3 border border-orange-200 bg-orange-50/40 p-4">
          <div className="min-w-0 flex-1">
            <p className="font-medium text-gray-900">{selected.name}</p>
            <p className="text-xs text-gray-500">
              {selected.project?.name ? `${selected.project.name} · ` : ''}Due {selected.scheduledDate || '—'}
              {selected.overdue ? ' · overdue' : ''}
            </p>
          </div>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-gray-700">Estimate (hours)</span>
            <input className={`${inputClass} w-28`} value={estimate} onChange={(e) => setEstimate(e.target.value)} inputMode="decimal" autoFocus />
          </label>
          <Button onClick={saveEstimate}>Save estimate</Button>
          <Link href={`/tasks/${selected.id}`} className="text-sm font-medium text-orange-600 hover:text-orange-700">
            Open task
          </Link>
          <Button variant="outline" onClick={() => setSelected(null)}>
            Close
          </Button>
        </Card>
      ) : null}

      <p className="text-xs text-gray-500">
        Hours come from task estimates (click a task to set one). Overdue open tasks count in the first week. Green = room, amber = 80%+ booked, red = over capacity.
        {manager ? ' Drag a task onto another person to reassign it, or onto another week to move its due date.' : ''}
      </p>
    </div>
  );
}
