'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, Check, ChevronLeft, ChevronRight, GripVertical, Pin, RefreshCw, RotateCcw, Users, X } from 'lucide-react';
import { IS_SAAS_PLATFORM, LoadingSpinner } from '@webfudge/ui';
import PMPageHeader from '../../../components/PMPageHeader';
import AskWorkPanel from '../../../components/AskWorkPanel';
import myDayService from '../../../lib/api/myDayService';
import taskService from '../../../lib/api/taskService';

const REASON = { blocked: 'Waiting on another task', no_capacity: 'No time left today', excluded: 'Removed from today' };

const localToday = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};
const shiftDay = (day, n) => {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};
const hhmm = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
const hours = (min) => `${Math.round((min / 60) * 10) / 10} h`;

export default function MyDayPage() {
  const [date, setDate] = useState(localToday);
  const [day, setDay] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [dragId, setDragId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setDay(await myDayService.getDay(date));
    } catch (err) {
      setError(err?.message || 'Could not load your day.');
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    if (IS_SAAS_PLATFORM) load();
  }, [load]);

  const replan = useCallback(
    async (opts) => {
      setSaving(true);
      setError(null);
      try {
        setDay(await myDayService.replan(date, opts));
      } catch (err) {
        setError(err?.message || 'Could not re-plan.');
      } finally {
        setSaving(false);
      }
    },
    [date],
  );

  const overrides = day?.overrides || {};
  const taskBlocks = useMemo(() => (day?.blocks || []).filter((b) => b.kind === 'task'), [day]);
  const withOverrides = (patch) => replan({ overrides: { order: [], excluded: [], pinned: [], ...overrides, ...patch } });

  const removeTask = (id) => withOverrides({ excluded: [...new Set([...(overrides.excluded || []), id])], pinned: (overrides.pinned || []).filter((p) => p.taskId !== id) });
  const restoreTask = (id) => withOverrides({ excluded: (overrides.excluded || []).filter((x) => x !== id) });
  const togglePin = (block) => {
    const pinned = overrides.pinned || [];
    withOverrides({ pinned: block.pinned ? pinned.filter((p) => p.taskId !== block.id) : [...pinned, { taskId: block.id, start: block.start }] });
  };
  const dropOn = (targetId) => {
    if (dragId == null || dragId === targetId) return;
    const ids = taskBlocks.filter((b) => !b.pinned).map((b) => b.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    if (from === -1 || to === -1) return;
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    setDragId(null);
    withOverrides({ order: ids });
  };
  const markDone = async (id) => {
    setSaving(true);
    try {
      await taskService.updateTaskStatus(id, 'COMPLETED');
      await load();
    } catch (err) {
      setError(err?.message || 'Could not update the task.');
    } finally {
      setSaving(false);
    }
  };

  if (!IS_SAAS_PLATFORM) {
    return (
      <div className="p-6 text-sm text-gray-600">
        My Day is available in Fudge Work SaaS. <Link className="text-orange-600" href="/my-tasks">Back to My Tasks</Link>
      </div>
    );
  }

  const s = day?.summary;
  const unscheduled = day?.unscheduled || [];
  return (
    <div className="space-y-6 p-4 md:p-6">
      <PMPageHeader
        title="My Day"
        subtitle="Your open tasks planned around meetings, priorities, due dates and capacity"
        breadcrumb={[{ label: 'PM', href: '/' }, { label: 'My Tasks', href: '/my-tasks' }, { label: 'My Day', href: '/my-tasks/my-day' }]}
        showProfile
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section className="rounded-xl border border-gray-200 bg-white p-4" aria-label="Planned day">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <button type="button" aria-label="Previous day" onClick={() => setDate((d) => shiftDay(d, -1))} className="rounded-lg border border-gray-200 p-2 hover:bg-gray-50">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} aria-label="Day" className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm" />
            <button type="button" aria-label="Next day" onClick={() => setDate((d) => shiftDay(d, 1))} className="rounded-lg border border-gray-200 p-2 hover:bg-gray-50">
              <ChevronRight className="h-4 w-4" />
            </button>
            {date !== localToday() && (
              <button type="button" onClick={() => setDate(localToday())} className="text-sm text-orange-600 hover:underline">
                Today
              </button>
            )}
            <div className="ml-auto flex gap-2">
              <button type="button" disabled={saving || loading} onClick={() => replan({ reset: true })} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50" title="Drop your changes and plan from scratch">
                <RotateCcw className="h-4 w-4" /> Reset
              </button>
              <button type="button" disabled={saving || loading} onClick={() => replan({})} className="inline-flex items-center gap-1 rounded-lg bg-orange-500 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50" title="Plan again with your latest tasks, keeping your changes">
                <RefreshCw className={`h-4 w-4 ${saving ? 'animate-spin' : ''}`} /> Re-plan
              </button>
            </div>
          </div>

          {s && (
            <p className="mb-4 text-xs text-gray-500">
              {s.scheduledTasks} task{s.scheduledTasks === 1 ? '' : 's'} · {hours(s.taskMinutes)} of {hours(s.capacityMinutes)} capacity · {hours(s.meetingMinutes)} in meetings · work hours {hhmm(day.workStart)}–{hhmm(day.workEnd)}
            </p>
          )}
          {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

          {loading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="md" message="Planning your day…" />
            </div>
          ) : (day?.blocks || []).length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-500">
              <CalendarDays className="mx-auto mb-2 h-6 w-6 text-gray-300" />
              Nothing planned. Open tasks assigned to you will show here.
            </div>
          ) : (
            <ol className="space-y-2">
              {day.blocks.map((b) =>
                b.kind === 'meeting' ? (
                  <li key={`m${b.id}`} className="flex items-center gap-3 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm">
                    <span className="w-24 shrink-0 tabular-nums text-blue-700">{hhmm(b.start)}–{hhmm(b.end)}</span>
                    <Users className="h-4 w-4 text-blue-500" aria-hidden />
                    <span className="truncate text-blue-900">{b.title}</span>
                  </li>
                ) : (
                  <li
                    key={`t${b.id}`}
                    draggable={!b.pinned && !saving}
                    onDragStart={() => setDragId(b.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => dropOn(b.id)}
                    className={`group flex items-center gap-3 rounded-lg border px-3 py-2 text-sm ${b.done ? 'border-green-100 bg-green-50 opacity-70' : 'border-gray-200 bg-white'} ${dragId === b.id ? 'opacity-50' : ''}`}
                  >
                    <GripVertical className={`h-4 w-4 shrink-0 ${b.pinned ? 'text-gray-200' : 'cursor-grab text-gray-400'}`} aria-hidden />
                    <span className="w-24 shrink-0 tabular-nums text-gray-600">{hhmm(b.start)}–{hhmm(b.end)}</span>
                    <div className="min-w-0 flex-1">
                      <Link href={`/tasks/${b.id}`} className={`block truncate font-medium text-gray-900 hover:text-orange-600 ${b.done ? 'line-through' : ''}`}>
                        {b.name}
                      </Link>
                      <div className="flex flex-wrap gap-x-2 text-xs text-gray-500">
                        {b.projectName && <span>{b.projectName}</span>}
                        {b.dueDate && <span className={b.overdue ? 'font-medium text-red-600' : ''}>{b.overdue ? 'Overdue · ' : 'Due '}{b.dueDate}</span>}
                        {b.priority === 'high' && <span className="text-orange-600">High priority</span>}
                        {!b.estimated && <span>No estimate (1 h assumed)</span>}
                        {b.partial && <span>Part of it today</span>}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button type="button" onClick={() => togglePin(b)} disabled={saving} aria-label={b.pinned ? 'Unpin' : 'Pin to this time'} title={b.pinned ? 'Unpin' : 'Pin to this time'} className={`rounded p-1.5 hover:bg-gray-100 ${b.pinned ? 'text-orange-600' : 'text-gray-400'}`}>
                        <Pin className="h-4 w-4" />
                      </button>
                      {!b.done && (
                        <button type="button" onClick={() => markDone(b.id)} disabled={saving} aria-label="Mark done" title="Mark done" className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-green-600">
                          <Check className="h-4 w-4" />
                        </button>
                      )}
                      <button type="button" onClick={() => removeTask(b.id)} disabled={saving} aria-label="Remove from today" title="Remove from today" className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-600">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                ),
              )}
            </ol>
          )}

          {!loading && unscheduled.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-2 text-xs font-semibold uppercase text-gray-500">Not planned today</h3>
              <ul className="space-y-1">
                {unscheduled.map((u) => (
                  <li key={u.id} className="flex items-center justify-between gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm">
                    <Link href={`/tasks/${u.id}`} className="truncate text-gray-800 hover:text-orange-600">
                      {u.name || `Task #${u.id}`}
                    </Link>
                    <span className="flex shrink-0 items-center gap-2 text-xs text-gray-500">
                      {REASON[u.reason] || u.reason}
                      {u.reason === 'excluded' && (
                        <button type="button" onClick={() => restoreTask(u.id)} disabled={saving} className="text-orange-600 hover:underline">
                          Add back
                        </button>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="mt-4 text-xs text-gray-400">Drag tasks to reorder, pin one to keep its time, then Re-plan to fit the rest around it.</p>
        </section>

        <AskWorkPanel />
      </div>
    </div>
  );
}
