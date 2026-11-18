'use client';

/**
 * Shared task views (ticket W3): view switcher with saved views, grouped list, calendar and workload.
 * Tasks are the transformed rows from lib/api/dataTransformers (name, strapiStatus, strapiPriority,
 * dueDate, startDate, assignee, assignees, taskType, isOverdue).
 */

import { useMemo, useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Bookmark,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  GanttChart,
  Kanban,
  LayoutList,
  Star,
  Table2,
  Trash2,
  Users,
} from 'lucide-react';
import { ViewToggleGroup, ViewToggleButton } from '@webfudge/ui';
import { TASK_TYPES } from '../lib/taskTypes';

export const STATUS_META = {
  SCHEDULED: { label: 'To do', cls: 'bg-slate-100 text-slate-700' },
  ACTIVE: { label: 'Active', cls: 'bg-indigo-50 text-indigo-700' },
  IN_PROGRESS: { label: 'In progress', cls: 'bg-blue-50 text-blue-700' },
  INTERNAL_REVIEW: { label: 'In review', cls: 'bg-violet-50 text-violet-700' },
  ON_HOLD: { label: 'On hold', cls: 'bg-sky-50 text-sky-700' },
  OVERDUE: { label: 'Overdue', cls: 'bg-red-50 text-red-700' },
  COMPLETED: { label: 'Completed', cls: 'bg-emerald-50 text-emerald-700' },
  CANCELLED: { label: 'Cancelled', cls: 'bg-gray-100 text-gray-500' },
};
const STATUS_ORDER = Object.keys(STATUS_META);
const PRIORITY_ORDER = ['high', 'medium', 'low'];
const PRIORITY_LABEL = { high: 'High', medium: 'Medium', low: 'Low' };
const TYPE_LABEL = Object.fromEntries(Object.entries(TASK_TYPES).map(([k, v]) => [k, v.label]));

export const VIEW_OPTIONS = [
  { key: 'list', label: 'List', icon: LayoutList },
  { key: 'board', label: 'Board', icon: Kanban },
  { key: 'table', label: 'Table', icon: Table2 },
  { key: 'calendar', label: 'Calendar', icon: CalendarDays },
  { key: 'gantt', label: 'Gantt', icon: GanttChart },
  { key: 'workload', label: 'Workload', icon: Users },
];

export const GROUP_OPTIONS = [
  { key: 'status', label: 'Status' },
  { key: 'assignee', label: 'Assignee' },
  { key: 'priority', label: 'Priority' },
  { key: 'taskType', label: 'Task type' },
  { key: 'none', label: 'No grouping' },
];

const isOpen = (t) => !['COMPLETED', 'CANCELLED'].includes(t.strapiStatus);
const dayKey = (iso) => (iso ? String(iso).slice(0, 10) : null);
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const assigneeOf = (t) => t.assignee || (t.assignees || [])[0] || null;

function StatusPill({ status }) {
  const m = STATUS_META[status] || STATUS_META.SCHEDULED;
  return <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${m.cls}`}>{m.label}</span>;
}

/**
 * Layout switcher + group-by + saved views.
 * views: subset of VIEW_OPTIONS keys to show. saved: result of useSavedViews().
 */
export function TaskViewToolbar({
  view,
  onViewChange,
  groupBy,
  onGroupByChange,
  views = VIEW_OPTIONS.map((v) => v.key),
  saved,
  viewLabels = {},
  /** Only the saved-views menu (the page renders its own layout switcher). */
  savedOnly = false,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [name, setName] = useState('');
  const [makeDefault, setMakeDefault] = useState(false);
  const [error, setError] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen]);

  const saveCurrent = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setError('');
    try {
      await saved.save(name.trim(), { view, groupBy }, makeDefault);
      setName('');
      setMakeDefault(false);
    } catch (err) {
      setError(err?.message || 'Could not save the view');
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {!savedOnly ? (
        <ViewToggleGroup aria-label="Task layout">
          {VIEW_OPTIONS.filter((v) => views.includes(v.key)).map(({ key, label, icon: Icon }) => (
            <ViewToggleButton key={key} active={view === key} title={viewLabels[key] || label} onClick={() => onViewChange(key)}>
              <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
            </ViewToggleButton>
          ))}
        </ViewToggleGroup>
      ) : null}
      {view === 'list' && onGroupByChange && !savedOnly ? (
        <label className="flex items-center gap-1.5 text-sm text-gray-600">
          Group by
          <select
            className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 focus:border-orange-500 focus:outline-none"
            value={groupBy}
            onChange={(e) => onGroupByChange(e.target.value)}
          >
            {GROUP_OPTIONS.map((g) => (
              <option key={g.key} value={g.key}>
                {g.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {saved ? (
        <div className="relative" ref={ref}>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            aria-expanded={menuOpen}
          >
            <Bookmark className="h-4 w-4" aria-hidden />
            Views{saved.views.length ? ` (${saved.views.length})` : ''}
          </button>
          {menuOpen ? (
            <div className="absolute right-0 z-30 mt-1 w-72 rounded-xl border border-gray-200 bg-white p-2 shadow-lg">
              {saved.views.length ? (
                <ul className="mb-2 max-h-60 overflow-y-auto">
                  {saved.views.map((v) => (
                    <li key={v.id} className="flex items-center gap-1 rounded-lg hover:bg-gray-50">
                      <button
                        type="button"
                        className="flex-1 truncate px-2 py-1.5 text-left text-sm text-gray-800"
                        onClick={() => {
                          if (v.config?.view && (savedOnly || views.includes(v.config.view))) onViewChange(v.config.view);
                          if (v.config?.groupBy && onGroupByChange) onGroupByChange(v.config.groupBy);
                          setMenuOpen(false);
                        }}
                      >
                        {v.name}
                        <span className="ml-1 text-xs text-gray-400">
                          {VIEW_OPTIONS.find((o) => o.key === v.config?.view)?.label || ''}
                        </span>
                      </button>
                      {v.mine === false ? (
                        <span className="px-1 text-xs text-gray-400" title={`Shared by ${v.owner?.name || 'a teammate'}`}>
                          shared
                        </span>
                      ) : (
                        <>
                      <button
                        type="button"
                        title={v.isDefault ? 'Opens by default' : 'Open this view by default'}
                        aria-label={`Make ${v.name} the default view`}
                        className={`rounded p-1 ${v.isDefault ? 'text-amber-500' : 'text-gray-300 hover:text-amber-500'}`}
                        onClick={() => saved.update(v.id, { isDefault: !v.isDefault })}
                      >
                        <Star className="h-4 w-4" fill={v.isDefault ? 'currentColor' : 'none'} />
                      </button>
                      <button type="button" aria-label={`Delete ${v.name}`} className="rounded p-1 text-gray-400 hover:text-red-600" onClick={() => saved.remove(v.id)}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mb-2 px-2 text-xs text-gray-500">No saved views yet. Save the current layout below.</p>
              )}
              <form onSubmit={saveCurrent} className="space-y-2 border-t border-gray-100 pt-2">
                <input
                  className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-orange-500 focus:outline-none"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Name this view"
                  aria-label="View name"
                />
                <label className="flex items-center gap-2 text-xs text-gray-600">
                  <input type="checkbox" checked={makeDefault} onChange={(e) => setMakeDefault(e.target.checked)} />
                  Open this view by default
                </label>
                {error ? <p className="text-xs text-red-600">{error}</p> : null}
                <button type="submit" disabled={!name.trim()} className="w-full rounded-lg bg-orange-500 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">
                  Save current view
                </button>
              </form>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function groupTasks(tasks, groupBy) {
  if (groupBy === 'none') return [{ key: 'all', label: 'All tasks', tasks }];
  const map = new Map();
  const add = (key, label, t) => {
    if (!map.has(key)) map.set(key, { key, label, tasks: [] });
    map.get(key).tasks.push(t);
  };
  for (const t of tasks) {
    if (groupBy === 'status') add(t.strapiStatus || 'SCHEDULED', (STATUS_META[t.strapiStatus] || STATUS_META.SCHEDULED).label, t);
    else if (groupBy === 'priority') {
      const p = String(t.strapiPriority || 'medium').toLowerCase();
      add(p, PRIORITY_LABEL[p] || p, t);
    }
    else if (groupBy === 'taskType') add(t.taskType || 'task', TYPE_LABEL[t.taskType] || t.taskType || 'Task', t);
    else {
      const a = assigneeOf(t);
      add(a?.id != null ? `u${a.id}` : 'none', a?.name || 'Unassigned', t);
    }
  }
  const order =
    groupBy === 'status' ? STATUS_ORDER : groupBy === 'priority' ? PRIORITY_ORDER : groupBy === 'taskType' ? Object.keys(TYPE_LABEL) : null;
  const groups = [...map.values()];
  if (order) groups.sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));
  else groups.sort((a, b) => (a.key === 'none' ? 1 : b.key === 'none' ? -1 : a.label.localeCompare(b.label)));
  return groups;
}

/** List view grouped by status / assignee / priority / task type. */
export function TaskGroupedList({ tasks, groupBy = 'status' }) {
  const groups = useMemo(() => groupTasks(tasks, groupBy), [tasks, groupBy]);
  const [collapsed, setCollapsed] = useState(() => new Set());
  if (!tasks.length) return <p className="p-12 text-center text-sm text-gray-500">No tasks found.</p>;
  return (
    <div className="divide-y divide-gray-100">
      {groups.map((g) => {
        const isCollapsed = collapsed.has(g.key);
        return (
          <section key={g.key}>
            <button
              type="button"
              className="flex w-full items-center gap-2 bg-gray-50 px-4 py-2 text-left text-sm font-semibold text-gray-800"
              onClick={() =>
                setCollapsed((s) => {
                  const n = new Set(s);
                  if (n.has(g.key)) n.delete(g.key);
                  else n.add(g.key);
                  return n;
                })
              }
              aria-expanded={!isCollapsed}
            >
              <ChevronRight className={`h-4 w-4 transition-transform ${isCollapsed ? '' : 'rotate-90'}`} aria-hidden />
              {g.label}
              <span className="font-normal text-gray-500">{g.tasks.length}</span>
            </button>
            {!isCollapsed ? (
              <ul>
                {g.tasks.map((t) => (
                  <li key={t.id}>
                    <Link href={`/tasks/${t.id}`} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50">
                      <span className="min-w-0 flex-1 truncate text-gray-900">{t.name}</span>
                      {groupBy !== 'status' ? <StatusPill status={t.strapiStatus} /> : null}
                      <span className="hidden w-32 truncate text-gray-600 sm:block">{assigneeOf(t)?.name || 'Unassigned'}</span>
                      <span className={`w-24 text-right tabular-nums ${t.isOverdue && isOpen(t) ? 'text-red-600' : 'text-gray-500'}`}>
                        {t.formattedDueDate || '—'}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}

/** Month calendar: tasks on their due date (falls back to start date). */
export function TaskCalendarView({ tasks }) {
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const byDay = useMemo(() => {
    const m = new Map();
    for (const t of tasks) {
      const k = dayKey(t.dueDate) || dayKey(t.startDate);
      if (!k) continue;
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(t);
    }
    return m;
  }, [tasks]);
  const undated = tasks.filter((t) => !t.dueDate && !t.startDate).length;

  const cells = useMemo(() => {
    const first = new Date(month);
    const offset = (first.getDay() + 6) % 7; // Monday first
    const start = new Date(first.getFullYear(), first.getMonth(), 1 - offset);
    return Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  }, [month]);
  const today = ymd(new Date());

  return (
    <div className="p-3">
      <div className="mb-3 flex items-center gap-2">
        <button type="button" className="rounded-lg border border-gray-300 p-1.5 hover:bg-gray-50" onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))} aria-label="Previous month">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <h3 className="min-w-[9rem] text-center text-sm font-semibold text-gray-900">
          {month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
        </h3>
        <button type="button" className="rounded-lg border border-gray-300 p-1.5 hover:bg-gray-50" onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))} aria-label="Next month">
          <ChevronRight className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="rounded-lg border border-gray-300 px-2.5 py-1 text-sm hover:bg-gray-50"
          onClick={() => {
            const d = new Date();
            setMonth(new Date(d.getFullYear(), d.getMonth(), 1));
          }}
        >
          Today
        </button>
        {undated ? <span className="ml-auto text-xs text-gray-500">{undated} task{undated === 1 ? '' : 's'} without dates not shown</span> : null}
      </div>
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-gray-200 bg-gray-200 text-xs">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
          <div key={d} className="bg-gray-50 px-2 py-1.5 font-medium text-gray-600">
            {d}
          </div>
        ))}
        {cells.map((d) => {
          const k = ymd(d);
          const list = byDay.get(k) || [];
          const inMonth = d.getMonth() === month.getMonth();
          return (
            <div key={k} className={`min-h-[96px] bg-white p-1.5 ${inMonth ? '' : 'bg-gray-50/60'}`}>
              <div className={`mb-1 text-right text-xs ${k === today ? 'font-bold text-orange-600' : inMonth ? 'text-gray-700' : 'text-gray-400'}`}>{d.getDate()}</div>
              <ul className="space-y-1">
                {list.slice(0, 3).map((t) => (
                  <li key={t.id}>
                    <Link
                      href={`/tasks/${t.id}`}
                      title={t.name}
                      className={`block truncate rounded px-1.5 py-0.5 ${(STATUS_META[t.strapiStatus] || STATUS_META.SCHEDULED).cls} ${t.isOverdue && isOpen(t) ? 'ring-1 ring-red-300' : ''}`}
                    >
                      {t.name}
                    </Link>
                  </li>
                ))}
                {list.length > 3 ? <li className="px-1.5 text-gray-500">+{list.length - 3} more</li> : null}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Workload: open tasks per person per week (by due date), with overdue and undated columns. */
export function TaskWorkloadView({ tasks, weeks = 6, heavyAt = 6 }) {
  const [selected, setSelected] = useState(null);
  const { columns, rows } = useMemo(() => {
    const now = new Date();
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
    const cols = [{ key: 'overdue', label: 'Overdue' }];
    for (let i = 0; i < weeks; i++) {
      const s = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i * 7);
      cols.push({ key: `w${i}`, label: i === 0 ? 'This week' : s.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }), start: ymd(s), end: ymd(new Date(s.getFullYear(), s.getMonth(), s.getDate() + 6)) });
    }
    cols.push({ key: 'later', label: 'Later' }, { key: 'nodate', label: 'No date' });
    const today = ymd(now);
    const people = new Map();
    for (const t of tasks.filter(isOpen)) {
      const people_ = (t.assignees && t.assignees.length ? t.assignees : [assigneeOf(t)]).filter(Boolean);
      const list = people_.length ? people_ : [{ id: null, name: 'Unassigned' }];
      const due = dayKey(t.dueDate);
      let col = 'nodate';
      if (due) {
        if (due < today) col = 'overdue';
        else col = cols.find((c) => c.start && due >= c.start && due <= c.end)?.key || 'later';
      }
      for (const p of list) {
        const key = p.id ?? 'none';
        if (!people.has(key)) people.set(key, { key, name: p.name || 'Unassigned', cells: {}, total: 0 });
        const r = people.get(key);
        (r.cells[col] = r.cells[col] || []).push(t);
        r.total += 1;
      }
    }
    return { columns: cols, rows: [...people.values()].sort((a, b) => b.total - a.total) };
  }, [tasks, weeks]);

  if (!rows.length) return <p className="p-12 text-center text-sm text-gray-500">No open tasks to plan.</p>;
  const sel = selected ? rows.find((r) => r.key === selected.person)?.cells[selected.col] || [] : [];

  return (
    <div className="p-3">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
              <th className="px-2 py-2 font-medium">Person</th>
              {columns.map((c) => (
                <th key={c.key} className="px-2 py-2 text-center font-medium">
                  {c.label}
                </th>
              ))}
              <th className="px-2 py-2 text-right font-medium">Open</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border-t border-gray-100">
                <td className="px-2 py-2 font-medium text-gray-900">{r.name}</td>
                {columns.map((c) => {
                  const n = r.cells[c.key]?.length || 0;
                  const heavy = c.key.startsWith('w') && n >= heavyAt;
                  const tone = !n
                    ? 'text-gray-300'
                    : c.key === 'overdue'
                      ? 'bg-red-50 text-red-700'
                      : heavy
                        ? 'bg-orange-100 text-orange-800'
                        : n >= heavyAt / 2
                          ? 'bg-amber-50 text-amber-800'
                          : 'bg-emerald-50 text-emerald-800';
                  const isSel = selected?.person === r.key && selected?.col === c.key;
                  return (
                    <td key={c.key} className="px-1 py-1 text-center">
                      <button
                        type="button"
                        disabled={!n}
                        onClick={() => setSelected(isSel ? null : { person: r.key, col: c.key })}
                        className={`w-full rounded-md px-2 py-1.5 tabular-nums ${tone} ${isSel ? 'ring-2 ring-orange-400' : ''}`}
                        title={heavy ? 'Heavy week' : undefined}
                        aria-label={`${r.name}, ${c.label}: ${n} task${n === 1 ? '' : 's'}`}
                      >
                        {n || '·'}
                      </button>
                    </td>
                  );
                })}
                <td className="px-2 py-2 text-right font-semibold tabular-nums text-gray-900">{r.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-gray-500">
        Open tasks by due week. Orange = {heavyAt}+ tasks in a week. Click a number to see the tasks.
      </p>
      {sel.length ? (
        <ul className="mt-3 divide-y divide-gray-100 rounded-lg border border-gray-200">
          {sel.map((t) => (
            <li key={t.id}>
              <Link href={`/tasks/${t.id}`} className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-gray-50">
                <span className="min-w-0 flex-1 truncate text-gray-900">{t.name}</span>
                <StatusPill status={t.strapiStatus} />
                <span className="w-24 text-right text-gray-500">{t.formattedDueDate || '—'}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
