'use client';

/**
 * Project → Risk & scope tab: risk radar (W19). Deterministic forecast from sprint velocity (W7),
 * dependency chains (W2), capacity (W6) and due dates; Fudge AI only explains it on request.
 */

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, ArrowRight, CalendarClock, Link2, Loader2, RefreshCw, Sparkles, UserRoundCog } from 'lucide-react';
import { LoadingSpinner, UpgradePrompt, planErrorDetails } from '@webfudge/ui';
import strapiClient from '../lib/strapiClient';
import taskService from '../lib/api/taskService';

const LEVEL = {
  high: { label: 'High risk', cls: 'bg-rose-50 text-rose-700 ring-rose-200', dot: 'bg-rose-500' },
  medium: { label: 'Medium risk', cls: 'bg-amber-50 text-amber-800 ring-amber-200', dot: 'bg-amber-500' },
  low: { label: 'Low risk', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500' },
};
const METHOD = {
  velocity: (f) => `from sprint velocity (${f.pointsPerDay} points a day over ${f.sprintsUsed} sprint${f.sprintsUsed === 1 ? '' : 's'})`,
  throughput: (f) => `from recent throughput (${f.tasksPerWeek} tasks a week)`,
  none: () => 'no completed work yet, so there is no forecast',
  done: () => 'all tasks are done',
};

const card = 'rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5';
const btn = 'inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50';
const btnPrimary = `${btn} bg-orange-600 text-white hover:bg-orange-700`;
const btnGhost = `${btn} border border-gray-200 bg-white text-gray-700 hover:bg-gray-50`;
const fmt = (d) => (d ? new Date(`${String(d).slice(0, 10)}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '—');

export function LevelBadge({ level }) {
  const L = LEVEL[level] || LEVEL.low;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${L.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${L.dot}`} aria-hidden />
      {L.label}
    </span>
  );
}

export default function ProjectRiskPanel({ projectId, onTasksChanged }) {
  const [data, setData] = useState(null);
  const [meta, setMeta] = useState({});
  const [error, setError] = useState('');
  const [upgrade, setUpgrade] = useState(null);
  const [busy, setBusy] = useState(null);
  const [explain, setExplain] = useState(null);
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await strapiClient.get(`/risk-radar/projects/${projectId}`);
      setData(res?.data || null);
      setMeta(res?.meta || {});
      setError('');
    } catch (e) {
      const p = planErrorDetails(e);
      if (p) setUpgrade(p);
      else setError(e?.message || 'Could not load the risk radar');
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  const reassign = async (s) => {
    setBusy(`move-${s.taskId}`);
    setNotice('');
    try {
      await taskService.updateTask(s.taskId, { assigneeUserIds: [s.to.id] });
      setNotice(`"${s.taskName}" moved to ${s.to.name}.`);
      await load();
      onTasksChanged?.();
    } catch (e) {
      setError(e?.message || 'Could not reassign the task');
    } finally {
      setBusy(null);
    }
  };

  const runExplain = async () => {
    setBusy('explain');
    setError('');
    try {
      const res = await strapiClient.post(`/risk-radar/projects/${projectId}/explain`, {});
      setExplain(res?.data || null);
    } catch (e) {
      const p = planErrorDetails(e);
      if (p) setUpgrade(p);
      else setError(e?.message || 'Fudge AI could not explain the radar');
    } finally {
      setBusy(null);
    }
  };

  if (upgrade) return <UpgradePrompt {...upgrade} compact />;
  if (!data && !error) {
    return (
      <div className="flex justify-center py-10">
        <LoadingSpinner />
      </div>
    );
  }
  if (!data) return <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>;

  const f = data.forecast || {};
  return (
    <section className={card} aria-labelledby="risk-radar-title">
      <div className="flex flex-wrap items-start gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
          <AlertTriangle className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="risk-radar-title" className="text-base font-semibold text-gray-900">
              Risk radar
            </h2>
            <LevelBadge level={data.level} />
          </div>
          <p className="mt-0.5 text-sm text-gray-500">{data.reasons?.length ? data.reasons.join(' · ') : 'Nothing is slipping right now.'}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {meta.aiEnabled ? (
            <button type="button" className={btnPrimary} onClick={runExplain} disabled={busy === 'explain'}>
              {busy === 'explain' ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Sparkles className="h-3.5 w-3.5" aria-hidden />}
              Explain with Fudge AI
            </button>
          ) : null}
          <button type="button" className={btnGhost} onClick={load} aria-label="Refresh the risk radar">
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      </div>

      {error ? <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      {notice ? <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</p> : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg bg-gray-50 p-3">
          <p className="flex items-center gap-1 text-xs font-medium text-gray-500">
            <CalendarClock className="h-3.5 w-3.5" aria-hidden /> Projected finish
          </p>
          <p className="mt-1 text-lg font-semibold text-gray-900">{f.projectedFinish ? fmt(f.projectedFinish) : '—'}</p>
          <p className="text-xs text-gray-500">{(METHOD[f.method] || METHOD.none)(f)}</p>
        </div>
        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-xs font-medium text-gray-500">End date</p>
          <p className="mt-1 text-lg font-semibold text-gray-900">{fmt(f.endDate)}</p>
          <p className={`text-xs ${f.slipDays ? 'font-semibold text-rose-600' : 'text-gray-500'}`}>
            {f.slipDays ? `${f.slipDays} day${f.slipDays === 1 ? '' : 's'} late at this pace` : f.endDate ? 'On pace' : 'No end date set'}
          </p>
        </div>
        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-xs font-medium text-gray-500">Tasks at risk</p>
          <p className="mt-1 text-lg font-semibold text-gray-900">
            {data.counts.high} <span className="text-sm font-normal text-gray-500">high</span> · {data.counts.medium} <span className="text-sm font-normal text-gray-500">medium</span>
          </p>
          <p className="text-xs text-gray-500">
            {data.counts.overdue} overdue of {data.counts.open} open
          </p>
        </div>
        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-xs font-medium text-gray-500">Blocked by overdue work</p>
          <p className="mt-1 text-lg font-semibold text-gray-900">{data.counts.blocked}</p>
          <p className="text-xs text-gray-500">tasks waiting on late predecessors</p>
        </div>
      </div>

      {explain ? (
        <div className="mt-4 rounded-xl border border-orange-200 bg-orange-50/60 p-4">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
            <Sparkles className="h-4 w-4 text-orange-600" aria-hidden /> {explain.headline}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-gray-700">{explain.explanation}</p>
          {explain.actions?.length ? (
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-gray-700">
              {explain.actions.map((a, i) => (
                <li key={i}>
                  <span className="font-medium text-gray-900">{a.title}</span> — {a.why}
                </li>
              ))}
            </ol>
          ) : null}
          <p className="mt-2 text-xs text-gray-500">Used {explain.creditsUsed} AI credit{explain.creditsUsed === 1 ? '' : 's'}.</p>
        </div>
      ) : null}

      {data.reassignments?.length ? (
        <div className="mt-5">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
            <UserRoundCog className="h-4 w-4 text-gray-500" aria-hidden /> Suggested reassignments
          </h3>
          <ul className="mt-2 divide-y divide-gray-100 rounded-lg border border-gray-200">
            {data.reassignments.map((s) => (
              <li key={s.taskId} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">{s.taskName}</p>
                  <p className="text-xs text-gray-500">
                    {s.from ? s.from.name : 'Unassigned'} <ArrowRight className="inline h-3 w-3" aria-hidden /> {s.to.name} · {s.hours} h · due {fmt(s.due)} · {s.reason}
                  </p>
                </div>
                <button type="button" className={btnGhost} disabled={Boolean(busy)} onClick={() => reassign(s)}>
                  {busy === `move-${s.taskId}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
                  Move to {s.to.name.split(' ')[0]}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {data.chains?.length ? (
        <div className="mt-5">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
            <Link2 className="h-4 w-4 text-gray-500" aria-hidden /> Overdue chains
          </h3>
          <ul className="mt-2 space-y-2">
            {data.chains.map((c) => (
              <li key={c.root.id} className="rounded-lg border border-rose-100 bg-rose-50/50 px-3 py-2 text-sm">
                <span className="font-medium text-rose-700">{c.root.name}</span>
                <span className="text-gray-600">
                  {' '}
                  is {c.root.daysOverdue} day{c.root.daysOverdue === 1 ? '' : 's'} late{c.root.assignee ? ` (${c.root.assignee.name})` : ''} and blocks{' '}
                </span>
                <span className="text-gray-900">{c.blocked.map((b) => b.name).join(' → ')}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-5">
        <h3 className="text-sm font-semibold text-gray-900">Tasks likely to slip</h3>
        {data.tasks?.length ? (
          <div className="mt-2 overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs text-gray-500">
                  <th className="px-3 py-2 font-medium">Task</th>
                  <th className="px-3 py-2 font-medium">Risk</th>
                  <th className="px-3 py-2 font-medium">Due</th>
                  <th className="px-3 py-2 font-medium">Assignee</th>
                  <th className="px-3 py-2 font-medium">Why</th>
                </tr>
              </thead>
              <tbody>
                {data.tasks.map((t) => (
                  <tr key={t.id} className="border-b border-gray-100 align-top last:border-0">
                    <td className="px-3 py-2 font-medium text-gray-900">{t.name}</td>
                    <td className="px-3 py-2">
                      <LevelBadge level={t.level} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-gray-600">
                      {fmt(t.due)}
                      {t.slipDays ? <span className="block text-xs text-rose-600">likely {fmt(t.projectedFinish)}</span> : null}
                    </td>
                    <td className="px-3 py-2 text-gray-600">{t.assignee?.name || 'Unassigned'}</td>
                    <td className="px-3 py-2 text-xs text-gray-600">{t.reasons.join(' · ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-2 rounded-lg bg-gray-50 px-3 py-4 text-center text-sm text-gray-500">No task is at risk right now.</p>
        )}
      </div>
    </section>
  );
}
