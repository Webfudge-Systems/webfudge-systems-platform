'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Download, IndianRupee, Percent, Target, TrendingUp, Trophy } from 'lucide-react';
import { Button, Card, DashboardKpiRow, LoadingSpinner, DASHBOARD_CHART_ACCENT, PlanGate } from '@webfudge/ui';
import CRMPageHeader from '../../components/CRMPageHeader';
import strapiClient from '../../lib/strapiClient';
import analyticsService, { downloadCsv } from '../../lib/api/analyticsService';
import { useLeadSourceLabel } from '../../lib/leadSources';
import { canReadCRM } from '../../lib/rbac';

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const money = (v) => inr.format(Number(v) || 0);
const pct = (v) => (v == null ? '—' : `${v}%`);
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const selectClass =
  'rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20';

function presetRange(key) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (key) {
    case 'this_month':
      return [new Date(y, m, 1), now];
    case 'last_month':
      return [new Date(y, m - 1, 1), new Date(y, m, 0)];
    case 'this_quarter':
      return [new Date(y, Math.floor(m / 3) * 3, 1), now];
    case 'this_year':
      return [new Date(y, 0, 1), now];
    case 'last_90':
      return [new Date(now.getTime() - 89 * 86400000), now];
    default:
      return [new Date(now.getTime() - 29 * 86400000), now];
  }
}

const PRESETS = [
  ['last_30', 'Last 30 days'],
  ['this_month', 'This month'],
  ['last_month', 'Last month'],
  ['this_quarter', 'This quarter'],
  ['last_90', 'Last 90 days'],
  ['this_year', 'This year'],
  ['custom', 'Custom'],
];

const STAGE_LABEL = { discovery: 'Discovery', prospect: 'Prospect', proposal: 'Proposal', negotiation: 'Negotiation' };
const monthLabel = (k) => {
  if (k === 'overdue') return 'Overdue';
  if (k === 'no-date') return 'No close date';
  const [y, m] = k.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
};

const SOURCE_COLUMNS = [
  { key: 'label', label: 'Source' },
  { key: 'leads', label: 'Leads' },
  { key: 'deals', label: 'Deals created' },
  { key: 'won', label: 'Deals won' },
  { key: 'revenue', label: 'Revenue (INR)' },
  { key: 'pipeline', label: 'Open pipeline (INR)' },
  { key: 'leadToWonRate', label: 'Lead to won %' },
];
const LEADERBOARD_COLUMNS = [
  { key: 'name', label: 'Rep' },
  { key: 'leads', label: 'Leads' },
  { key: 'contacted', label: 'Contacted' },
  { key: 'deals', label: 'Deals created' },
  { key: 'won', label: 'Won' },
  { key: 'lost', label: 'Lost' },
  { key: 'winRate', label: 'Win rate %' },
  { key: 'revenue', label: 'Revenue (INR)' },
  { key: 'openPipeline', label: 'Open pipeline (INR)' },
  { key: 'slaBreaches', label: 'SLA misses' },
];

function Section({ title, subtitle, onExport, children }) {
  return (
    <Card className="space-y-4 border border-gray-200 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          {subtitle ? <p className="mt-0.5 text-sm text-gray-600">{subtitle}</p> : null}
        </div>
        {onExport ? (
          <Button variant="outline" size="sm" onClick={onExport}>
            <Download className="mr-1 h-4 w-4" aria-hidden />
            CSV
          </Button>
        ) : null}
      </div>
      {children}
    </Card>
  );
}

function Table({ columns, rows, empty = 'No data for this period.' }) {
  if (!rows.length) return <p className="py-4 text-sm text-gray-500">{empty}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
            {columns.map((c) => (
              <th key={c.key} className={`px-2 py-2 font-medium ${c.align === 'right' ? 'text-right' : ''}`}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-gray-100 last:border-0">
              {columns.map((c) => (
                <td key={c.key} className={`px-2 py-2 text-gray-800 ${c.align === 'right' ? 'text-right tabular-nums' : ''}`}>
                  {c.render ? c.render(r[c.key], r, i) : r[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HBar({ data, dataKey, nameKey, valueFormat = (v) => v }) {
  if (!data.length) return null;
  return (
    <div style={{ height: Math.max(160, data.length * 36) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" tickFormatter={valueFormat} tick={{ fontSize: 12 }} />
          <YAxis type="category" dataKey={nameKey} width={130} tick={{ fontSize: 12 }} />
          <Tooltip formatter={(v) => valueFormat(v)} />
          <Bar dataKey={dataKey} fill={DASHBOARD_CHART_ACCENT || '#f97316'} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function AnalyticsPage() {
  const canView = canReadCRM('analytics');
  const sourceLabel = useLeadSourceLabel();
  const [preset, setPreset] = useState('last_30');
  const [from, setFrom] = useState(() => ymd(presetRange('last_30')[0]));
  const [to, setTo] = useState(() => ymd(presetRange('last_30')[1]));
  const [ownerId, setOwnerId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [report, setReport] = useState(null);
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);

  const choosePreset = (key) => {
    setPreset(key);
    if (key !== 'custom') {
      const [f, t] = presetRange(key);
      setFrom(ymd(f));
      setTo(ymd(t));
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await analyticsService.report({ from, to, ownerId, departmentId });
      setReport(res.data);
      setMeta(res.meta);
    } catch (e) {
      setError(e?.message || 'Could not load analytics');
    } finally {
      setLoading(false);
    }
  }, [from, to, ownerId, departmentId]);

  useEffect(() => {
    if (canView) load();
  }, [canView, load]);

  useEffect(() => {
    if (!meta.teamView || users.length) return;
    strapiClient
      .getOrganizationUsers({ pageSize: 200 })
      .then((r) => setUsers(Array.isArray(r?.data) ? r.data : []))
      .catch(() => {});
    strapiClient
      .get('/departments')
      .then((r) => setDepartments(Array.isArray(r?.data) ? r.data : []))
      .catch(() => {});
  }, [meta.teamView, users.length]);

  const fileTag = `${from}_to_${to}`;
  const sources = useMemo(() => (report?.sources || []).map((r) => ({ ...r, label: sourceLabel(r.source) })), [report, sourceLabel]);

  if (!canView) {
    return (
      <div className="p-6">
        <p className="text-sm text-gray-600">You don&apos;t have access to Analytics. Ask an admin to grant Analytics access.</p>
      </div>
    );
  }

  const s = report?.summary;
  const kpis = s
    ? [
        { title: 'Revenue won', value: money(s.revenue), icon: IndianRupee },
        { title: 'Deals won', value: String(s.won), icon: Trophy },
        { title: 'Win rate', value: pct(s.winRate), icon: Percent },
        { title: 'Open pipeline', value: money(s.pipelineValue), icon: TrendingUp },
        { title: 'Weighted forecast', value: s.weightedValue == null ? 'Business plan' : money(s.weightedValue), icon: Target },
      ]
    : [];

  const exportAll = () => {
    if (!report) return;
    downloadCsv(`grow-sources_${fileTag}.csv`, sources, SOURCE_COLUMNS);
    downloadCsv(`grow-leaderboard_${fileTag}.csv`, report.leaderboard, LEADERBOARD_COLUMNS);
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <CRMPageHeader
        title="Analytics"
        subtitle={meta.scope === 'own' ? 'Your numbers: leads, deals, revenue and follow-up speed' : 'Funnel, source ROI, leaderboard, forecast, lost reasons and SLA'}
        breadcrumb={[{ label: 'Analytics', href: '/analytics' }]}
      />

      <Card className="flex flex-wrap items-end gap-3 border border-gray-200 p-4">
        <label className="text-sm">
          <span className="mb-1 block font-medium text-gray-700">Period</span>
          <select className={selectClass} value={preset} onChange={(e) => choosePreset(e.target.value)}>
            {PRESETS.map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-gray-700">From</span>
          <input
            type="date"
            className={selectClass}
            value={from}
            max={to}
            onChange={(e) => {
              setPreset('custom');
              setFrom(e.target.value);
            }}
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-gray-700">To</span>
          <input
            type="date"
            className={selectClass}
            value={to}
            min={from}
            onChange={(e) => {
              setPreset('custom');
              setTo(e.target.value);
            }}
          />
        </label>
        {meta.teamView ? (
          <>
            <label className="text-sm">
              <span className="mb-1 block font-medium text-gray-700">Team</span>
              <select
                className={selectClass}
                value={departmentId}
                onChange={(e) => {
                  setDepartmentId(e.target.value);
                  setOwnerId('');
                }}
              >
                <option value="">Whole organization</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium text-gray-700">Rep</span>
              <select
                className={selectClass}
                value={ownerId}
                onChange={(e) => {
                  setOwnerId(e.target.value);
                  setDepartmentId('');
                }}
              >
                <option value="">Everyone</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {[u.firstName, u.lastName].filter(Boolean).join(' ') || u.username || u.email}
                  </option>
                ))}
              </select>
            </label>
          </>
        ) : null}
        <div className="ml-auto">
          <Button variant="outline" onClick={exportAll} disabled={!report}>
            <Download className="mr-1 h-4 w-4" aria-hidden />
            Export
          </Button>
        </div>
      </Card>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      {loading && !report ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner />
        </div>
      ) : report ? (
        <div className={`space-y-6 ${loading ? 'opacity-60' : ''}`} aria-busy={loading}>
          <DashboardKpiRow stats={kpis} />

          {s?.topSource ? (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-900" data-testid="top-source">
              Top source by revenue: <span className="font-semibold">{sourceLabel(s.topSource)}</span> ({money(sources[0]?.revenue)} from{' '}
              {sources[0]?.won} won deal{sources[0]?.won === 1 ? '' : 's'})
            </p>
          ) : null}

          <div className="grid gap-6 xl:grid-cols-2">
            <Section
              title="Conversion funnel"
              subtitle="Leads created in the period and how far they got"
              onExport={() =>
                downloadCsv(`grow-funnel_${fileTag}.csv`, report.funnel, [
                  { key: 'label', label: 'Step' },
                  { key: 'count', label: 'Count' },
                  { key: 'value', label: 'Value (INR)' },
                ])
              }
            >
              <ol className="space-y-2">
                {report.funnel.map((f, i) => {
                  const top = report.funnel[0].count || 1;
                  const prev = i ? report.funnel[i - 1].count : null;
                  const w = Math.max(2, Math.round((f.count / top) * 100));
                  return (
                    <li key={f.key}>
                      <div className="mb-1 flex justify-between gap-2 text-sm">
                        <span className="text-gray-800">{f.label}</span>
                        <span className="tabular-nums text-gray-900">
                          {f.count}
                          {f.value != null ? <span className="ml-2 text-gray-500">{money(f.value)}</span> : null}
                          {prev ? <span className="ml-2 text-xs text-gray-500">({Math.round((f.count / prev) * 100)}% of previous)</span> : null}
                        </span>
                      </div>
                      <div className="h-3 rounded-full bg-gray-100">
                        <div className="h-3 rounded-full bg-orange-500" style={{ width: `${Math.min(100, w)}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ol>
              {report.openByStage.length ? (
                <p className="text-xs text-gray-500">
                  Open deals now: {report.openByStage.map((r) => `${STAGE_LABEL[r.stage] || r.stage} ${r.count} (${money(r.value)})`).join(' · ')}
                </p>
              ) : null}
            </Section>

            <Section
              title="Revenue by source"
              subtitle="Won deals in the period, credited to the lead's source"
              onExport={() => downloadCsv(`grow-sources_${fileTag}.csv`, sources, SOURCE_COLUMNS)}
            >
              <HBar data={sources.filter((r) => r.revenue > 0)} dataKey="revenue" nameKey="label" valueFormat={money} />
              <Table
                rows={sources}
                columns={[
                  { key: 'label', label: 'Source' },
                  { key: 'leads', label: 'Leads', align: 'right' },
                  { key: 'deals', label: 'Deals', align: 'right' },
                  { key: 'won', label: 'Won', align: 'right' },
                  { key: 'revenue', label: 'Revenue', align: 'right', render: money },
                  { key: 'leadToWonRate', label: 'Lead → won', align: 'right', render: pct },
                ]}
              />
            </Section>
          </div>

          <Section
            title="Rep leaderboard"
            subtitle="Ranked by revenue won in the period"
            onExport={() => downloadCsv(`grow-leaderboard_${fileTag}.csv`, report.leaderboard, LEADERBOARD_COLUMNS)}
          >
            <Table
              rows={report.leaderboard}
              columns={[
                { key: 'rank', label: '#', render: (_, __, i) => i + 1 },
                { key: 'name', label: 'Rep' },
                { key: 'leads', label: 'Leads', align: 'right' },
                { key: 'contacted', label: 'Contacted', align: 'right' },
                { key: 'deals', label: 'Deals', align: 'right' },
                { key: 'won', label: 'Won', align: 'right' },
                { key: 'winRate', label: 'Win rate', align: 'right', render: pct },
                { key: 'revenue', label: 'Revenue', align: 'right', render: money },
                { key: 'openPipeline', label: 'Open pipeline', align: 'right', render: money },
                { key: 'slaBreaches', label: 'SLA misses', align: 'right' },
              ]}
            />
          </Section>

          <div className="grid gap-6 xl:grid-cols-2">
            {!report.forecast ? (
              // SaaS: the forecast is a Grow Business feature (G16); the API leaves it out on other plans.
              <PlanGate feature="crm.forecast">
                {null}
              </PlanGate>
            ) : (
            <Section
              title="Pipeline & weighted forecast"
              subtitle="Open deals by expected close month (value × stage probability)"
              onExport={() =>
                downloadCsv(`grow-forecast_${fileTag}.csv`, report.forecast.byMonth, [
                  { key: 'month', label: 'Expected close', format: monthLabel },
                  { key: 'count', label: 'Deals' },
                  { key: 'value', label: 'Pipeline (INR)' },
                  { key: 'weighted', label: 'Weighted (INR)' },
                ])
              }
            >
              <HBar data={report.forecast.byMonth.map((r) => ({ ...r, label: monthLabel(r.month) }))} dataKey="weighted" nameKey="label" valueFormat={money} />
              <Table
                rows={report.forecast.byMonth}
                empty="No open deals."
                columns={[
                  { key: 'month', label: 'Expected close', render: monthLabel },
                  { key: 'count', label: 'Deals', align: 'right' },
                  { key: 'value', label: 'Pipeline', align: 'right', render: money },
                  { key: 'weighted', label: 'Weighted', align: 'right', render: money },
                ]}
              />
            </Section>
            )}

            <Section
              title="Why deals were lost"
              subtitle="Deals marked lost in the period"
              onExport={() =>
                downloadCsv(`grow-lost-reasons_${fileTag}.csv`, report.lostReasons, [
                  { key: 'reason', label: 'Reason' },
                  { key: 'count', label: 'Deals' },
                  { key: 'value', label: 'Value (INR)' },
                ])
              }
            >
              <HBar data={report.lostReasons} dataKey="count" nameKey="reason" />
              <Table
                rows={report.lostReasons}
                empty="No deals lost in this period."
                columns={[
                  { key: 'reason', label: 'Reason' },
                  { key: 'count', label: 'Deals', align: 'right' },
                  { key: 'value', label: 'Value', align: 'right', render: money },
                ]}
              />
            </Section>
          </div>

          <Section title="First-contact SLA" subtitle="New leads in the period that had an SLA timer (Settings → Lead assignment & SLA)">
            {report.sla.tracked ? (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                {[
                  ['On time', report.sla.onTime],
                  ['Contacted late', report.sla.late],
                  ['Missed, not contacted', report.sla.openBreached],
                  ['On-time rate', pct(report.sla.onTimeRate)],
                  [
                    'Avg. first contact',
                    report.sla.avgFirstContactMinutes == null
                      ? '—'
                      : report.sla.avgFirstContactMinutes < 120
                        ? `${report.sla.avgFirstContactMinutes} min`
                        : `${Math.round(report.sla.avgFirstContactMinutes / 60)} h`,
                  ],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-gray-200 p-3">
                    <p className="text-xl font-semibold text-gray-900">{value}</p>
                    <p className="text-xs text-gray-600">{label}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No SLA-tracked leads in this period. Turn on the first-contact SLA in Settings to start tracking.</p>
            )}
          </Section>
        </div>
      ) : null}
    </div>
  );
}
