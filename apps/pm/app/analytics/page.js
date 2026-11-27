'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, CheckCircle2, Clock, Flag, Percent, Settings2, XCircle } from 'lucide-react';
import { Card, DashboardKpiRow, LoadingSpinner, usePlanFeature } from '@webfudge/ui';
import PMPageHeader from '../../components/PMPageHeader';
import strapiClient from '../../lib/strapiClient';
import { getPmOrgRoleKind } from '../../lib/pmOrgRoles';
import CostRatesModal from '../../components/CostRatesModal';
import { MARGIN_STATUS } from '../../components/ProjectProfitabilityPanel';

const selectClass =
  'rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20';
const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const HEALTH = {
  on_track: { label: 'On track', cls: 'bg-emerald-50 text-emerald-700', icon: CheckCircle2 },
  at_risk: { label: 'At risk', cls: 'bg-amber-50 text-amber-800', icon: AlertTriangle },
  off_track: { label: 'Off track', cls: 'bg-red-50 text-red-700', icon: XCircle },
};
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '—');

function Bar({ value, tone = 'bg-orange-500', marker }) {
  const v = value == null ? 0 : Math.min(100, value);
  return (
    <div className="relative h-2 w-full rounded-full bg-gray-100">
      <div className={`h-2 rounded-full ${tone}`} style={{ width: `${v}%` }} />
      {marker != null ? <div className="absolute -top-0.5 h-3 w-0.5 bg-gray-500" style={{ left: `${Math.min(100, marker)}%` }} title={`${marker}% of time elapsed`} /> : null}
    </div>
  );
}

/** W22: margin % vs target, revenue − cost, and a 6-month margin sparkline. */
function MarginCell({ m }) {
  if (!m) return <span className="text-xs text-gray-400">—</span>;
  const S = MARGIN_STATUS[m.status] || MARGIN_STATUS.ok;
  const pts = m.trend.map((t) => t.marginPct);
  const known = pts.filter((v) => v != null);
  const lo = Math.min(0, ...known);
  const hi = Math.max(1, ...known);
  const path = pts
    .map((v, i) => (v == null ? null : `${(i / Math.max(1, pts.length - 1)) * 60},${16 - ((v - lo) / (hi - lo || 1)) * 16}`))
    .filter(Boolean)
    .join(' ');
  return (
    <div title={`Revenue ${inr.format(m.revenue)} · Cost ${inr.format(m.cost)} · Target ${m.targetMarginPct}%`}>
      <div className="flex items-center gap-2">
        <span className={`text-sm font-semibold tabular-nums ${m.status === 'below' ? 'text-red-600' : m.status === 'near' ? 'text-amber-700' : m.status === 'ok' ? 'text-emerald-700' : 'text-gray-400'}`}>
          {m.marginPct == null ? '—' : `${m.marginPct}%`}
        </span>
        {known.length > 1 ? (
          <svg width="60" height="16" className="overflow-visible" aria-hidden>
            <polyline points={path} fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-400" />
          </svg>
        ) : null}
      </div>
      <p className="text-xs text-gray-500">
        {m.status === 'no_revenue' ? S.label : `${inr.format(m.margin)} · target ${m.targetMarginPct}%`}
      </p>
    </div>
  );
}

export default function PortfolioPage() {
  const [data, setData] = useState(null);
  const [options, setOptions] = useState({ clients: [], managers: [] });
  const [clientAccountId, setClientAccountId] = useState('');
  const [managerId, setManagerId] = useState('');
  const [health, setHealth] = useState('');
  const [status, setStatus] = useState('active');
  const [sort, setSort] = useState('health');
  const [error, setError] = useState('');
  // W22: margin per project (Business plan; admins + managers)
  const profitPlan = usePlanFeature('pm.profitability');
  const [roleKind, setRoleKind] = useState('member');
  useEffect(() => setRoleKind(getPmOrgRoleKind()), []);
  const showMargin = profitPlan.ready && profitPlan.allowed && roleKind !== 'member';
  const [profit, setProfit] = useState(null);
  const [ratesOpen, setRatesOpen] = useState(false);
  const loadProfit = useCallback(async () => {
    if (!showMargin) return setProfit(null);
    try {
      const res = await strapiClient.get('/profitability/summary', { status });
      setProfit(res?.data || null);
    } catch {
      setProfit(null);
    }
  }, [showMargin, status]);
  useEffect(() => {
    loadProfit();
  }, [loadProfit]);
  const marginById = useMemo(() => new Map((profit?.projects || []).map((m) => [m.id, m])), [profit]);

  const load = useCallback(async () => {
    setError('');
    try {
      const res = await strapiClient.get('/portfolio', { status, ...(clientAccountId ? { clientAccountId } : {}), ...(managerId ? { managerId } : {}) });
      const d = res?.data;
      setData(d);
      if (!clientAccountId && !managerId) setOptions({ clients: d?.clients || [], managers: d?.managers || [] });
    } catch (e) {
      setError(e?.message || 'Could not load the portfolio');
      setData({ projects: [], summary: { total: 0 } });
    }
  }, [status, clientAccountId, managerId]);

  useEffect(() => {
    load();
  }, [load]);

  const rows = useMemo(() => {
    const list = (data?.projects || []).filter((p) => !health || p.health === health);
    const rank = { off_track: 0, at_risk: 1, on_track: 2 };
    return [...list].sort((a, b) =>
      sort === 'health'
        ? rank[a.health] - rank[b.health] || b.tasks.overdue - a.tasks.overdue
        : sort === 'burn'
          ? (b.budget?.burn ?? -1) - (a.budget?.burn ?? -1)
          : sort === 'margin'
            ? (marginById.get(a.id)?.marginPct ?? 999) - (marginById.get(b.id)?.marginPct ?? 999)
          : sort === 'end'
            ? String(a.endDate || '9').localeCompare(String(b.endDate || '9'))
            : a.name.localeCompare(b.name)
    );
  }, [data, health, sort, marginById]);

  const s = data?.summary || {};
  const kpis = [
    { title: 'Projects', value: data ? String(s.total || 0) : '—', icon: Flag },
    { title: 'On track', value: data ? String(s.onTrack || 0) : '—', icon: CheckCircle2 },
    { title: 'At risk', value: data ? String(s.atRisk || 0) : '—', icon: AlertTriangle },
    { title: 'Off track', value: data ? String(s.offTrack || 0) : '—', icon: XCircle },
    { title: 'Billable hours', value: data ? `${s.billableHours || 0} h` : '—', icon: Clock },
    ...(showMargin && profit
      ? [{ title: 'Margin', value: profit.totals.marginPct == null ? '—' : `${profit.totals.marginPct}%`, icon: Percent, change: profit.totals.belowTarget ? `${profit.totals.belowTarget} below target` : `Target ${profit.orgTarget}%`, changeType: profit.totals.belowTarget ? 'decrease' : 'increase' }]
      : []),
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PMPageHeader
        title="Portfolio"
        subtitle={`Every project's health, progress, budget burn${showMargin ? ', margin' : ''} and upcoming milestones on one screen`}
        breadcrumb={[
          { label: 'Dashboard', href: '/' },
          { label: 'Portfolio', href: '/analytics' },
        ]}
      />
      <DashboardKpiRow stats={kpis} />

      <Card className="flex flex-wrap items-end gap-3 border border-gray-200 p-4">
        <label className="text-sm">
          <span className="mb-1 block font-medium text-gray-700">Client</span>
          <select className={selectClass} value={clientAccountId} onChange={(e) => setClientAccountId(e.target.value)}>
            <option value="">All clients</option>
            {options.clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-gray-700">Manager</span>
          <select className={selectClass} value={managerId} onChange={(e) => setManagerId(e.target.value)}>
            <option value="">All managers</option>
            {options.managers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-gray-700">Health</span>
          <select className={selectClass} value={health} onChange={(e) => setHealth(e.target.value)}>
            <option value="">All</option>
            <option value="off_track">Off track</option>
            <option value="at_risk">At risk</option>
            <option value="on_track">On track</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-gray-700">Projects</span>
          <select className={selectClass} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="active">Active</option>
            <option value="all">Including completed</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-gray-700">Sort</span>
          <select className={selectClass} value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="health">Needs attention first</option>
            <option value="burn">Budget burn</option>
            {showMargin ? <option value="margin">Lowest margin</option> : null}
            <option value="end">End date</option>
            <option value="name">Name</option>
          </select>
        </label>
        {showMargin && profit?.canManage ? (
          <button
            type="button"
            onClick={() => setRatesOpen(true)}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Settings2 className="h-4 w-4" aria-hidden />
            Cost rates &amp; targets
          </button>
        ) : null}
      </Card>
      {ratesOpen ? <CostRatesModal isOpen={ratesOpen} onClose={() => setRatesOpen(false)} onChanged={loadProfit} /> : null}

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      {!data ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : (
        <Card className="overflow-x-auto border border-gray-200 p-0">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="px-3 py-2 font-medium">Project</th>
                <th className="px-3 py-2 font-medium">Health</th>
                <th className="min-w-[10rem] px-3 py-2 font-medium">Progress</th>
                <th className="px-3 py-2 text-right font-medium">Overdue</th>
                <th className="min-w-[10rem] px-3 py-2 font-medium">Budget burn</th>
                {showMargin ? <th className="min-w-[9rem] px-3 py-2 font-medium">Margin</th> : null}
                <th className="px-3 py-2 text-right font-medium">Hours (billable)</th>
                <th className="px-3 py-2 font-medium">Next milestones</th>
                <th className="px-3 py-2 font-medium">Ends</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const H = HEALTH[p.health];
                const Icon = H.icon;
                return (
                  <tr key={p.id} className="border-b border-gray-100 align-top">
                    <td className="px-3 py-3">
                      <Link href={`/projects/${p.slug || p.documentId || p.id}`} className="font-medium text-gray-900 hover:text-orange-600">
                        {p.name}
                      </Link>
                      <p className="text-xs text-gray-500">{[p.client?.name, p.manager?.name].filter(Boolean).join(' · ') || '—'}</p>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${H.cls}`} title={p.healthReasons.join(' · ')}>
                        <Icon className="h-3.5 w-3.5" aria-hidden />
                        {H.label}
                      </span>
                      {p.healthReasons.length ? <p className="mt-1 max-w-[12rem] text-xs text-gray-500">{p.healthReasons.join(' · ')}</p> : null}
                    </td>
                    <td className="px-3 py-3">
                      <div className="mb-1 flex justify-between text-xs text-gray-600">
                        <span>{p.complete == null ? 'No tasks' : `${p.complete}% done`}</span>
                        <span>
                          {p.tasks.done}/{p.tasks.total}
                        </span>
                      </div>
                      <Bar value={p.complete} marker={p.elapsed} />
                    </td>
                    <td className={`px-3 py-3 text-right tabular-nums ${p.tasks.overdue ? 'font-semibold text-red-600' : 'text-gray-500'}`}>{p.tasks.overdue}</td>
                    <td className="px-3 py-3">
                      {p.budget ? (
                        <>
                          <div className="mb-1 flex justify-between text-xs text-gray-600">
                            <span>{p.budget.burn == null ? 'Set an hourly rate' : `${p.budget.burn}% used`}</span>
                            <span>
                              {p.budget.type === 'hours' ? `${p.budget.used} / ${p.budget.budget} h` : `${inr.format(p.budget.used)} / ${inr.format(p.budget.budget)}`}
                            </span>
                          </div>
                          <Bar value={p.budget.burn} tone={p.budget.burn > 100 ? 'bg-red-500' : p.budget.burn >= 90 ? 'bg-amber-500' : 'bg-emerald-500'} marker={p.elapsed} />
                        </>
                      ) : (
                        <span className="text-xs text-gray-400">No budget</span>
                      )}
                    </td>
                    {showMargin ? (
                      <td className="px-3 py-3">
                        <MarginCell m={marginById.get(p.id)} />
                      </td>
                    ) : null}
                    <td className="px-3 py-3 text-right tabular-nums text-gray-800">
                      {p.hoursLogged} <span className="text-gray-500">({p.billableHours})</span>
                      {p.approvedHours ? <p className="text-xs text-gray-500">{p.approvedHours} h approved</p> : null}
                    </td>
                    <td className="px-3 py-3">
                      {p.milestones.length ? (
                        <ul className="space-y-0.5 text-xs">
                          {p.milestones.map((m) => (
                            <li key={m.id} className={m.overdue ? 'text-red-600' : 'text-gray-700'}>
                              {fmtDate(m.due)} · {m.name}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-gray-700">{fmtDate(p.endDate)}</td>
                  </tr>
                );
              })}
              {!rows.length ? (
                <tr>
                  <td colSpan={showMargin ? 9 : 8} className="p-8 text-center text-gray-500">
                    No projects match.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </Card>
      )}
      <p className="text-xs text-gray-500">
        Health: off track when past the end date, 3+ overdue tasks, more than 30% behind the timeline or over budget; at risk with any overdue task, 15%+ behind or
        budget burning faster than time (or 90%+ used). The grey tick on each bar marks how much of the timeline has elapsed.
        {showMargin ? ' Margin = Grow invoices (before tax) minus approved timesheet hours × each person’s cost rate.' : ''}
      </p>
    </div>
  );
}
