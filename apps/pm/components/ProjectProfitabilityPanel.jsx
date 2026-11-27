'use client';

/**
 * Project → Profitability tab (W22, Business plan). Revenue (Grow invoices) vs cost (approved
 * timesheet hours × member cost rate), margin % against the target, and a monthly trend.
 * Admins also see cost per member; nobody else ever receives cost rates from the API.
 */

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, IndianRupee, Percent, Target, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { LoadingSpinner, PlanGate } from '@webfudge/ui';
import strapiClient from '../lib/strapiClient';

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const card = 'rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5';
const btn = 'inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50';

export const MARGIN_STATUS = {
  ok: { label: 'On target', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200', bar: 'bg-emerald-500' },
  near: { label: 'Close to target', cls: 'bg-amber-50 text-amber-800 ring-amber-200', bar: 'bg-amber-500' },
  below: { label: 'Below target', cls: 'bg-red-50 text-red-700 ring-red-200', bar: 'bg-red-500' },
  no_revenue: { label: 'Not invoiced yet', cls: 'bg-gray-100 text-gray-600 ring-gray-200', bar: 'bg-gray-300' },
};

const monthLabel = (key) => {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'short' });
};

function Stat({ icon: Icon, label, value, hint, tone = 'text-gray-900' }) {
  return (
    <div className={card}>
      <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
        <Icon className="h-4 w-4" aria-hidden />
        {label}
      </div>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${tone}`}>{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-gray-500">{hint}</p> : null}
    </div>
  );
}

function TrendChart({ trend, target }) {
  const max = Math.max(1, ...trend.map((t) => Math.max(t.revenue, t.cost)));
  return (
    <div>
      <div className="flex h-44 items-end gap-2 sm:gap-3" role="img" aria-label="Monthly revenue and cost">
        {trend.map((t) => (
          <div key={t.month} className="flex h-full min-w-0 flex-1 flex-col justify-end">
            <div className="flex h-full items-end justify-center gap-0.5">
              <div className="w-1/2 max-w-[14px] rounded-t bg-orange-500" style={{ height: `${(t.revenue / max) * 100}%` }} title={`Revenue ${inr.format(t.revenue)}`} />
              <div className="w-1/2 max-w-[14px] rounded-t bg-gray-400" style={{ height: `${(t.cost / max) * 100}%` }} title={`Cost ${inr.format(t.cost)}`} />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2 sm:gap-3">
        {trend.map((t) => {
          const below = t.marginPct != null && target != null && t.marginPct < target;
          return (
            <div key={t.month} className="min-w-0 flex-1 text-center">
              <p className="text-[11px] text-gray-500">{monthLabel(t.month)}</p>
              <p className={`text-[11px] font-semibold tabular-nums ${t.marginPct == null ? 'text-gray-300' : below ? 'text-red-600' : 'text-gray-800'}`}>
                {t.marginPct == null ? '—' : `${t.marginPct}%`}
              </p>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-orange-500" /> Revenue
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-gray-400" /> Cost
        </span>
        <span>Margin % under each month (red when below target)</span>
      </div>
    </div>
  );
}

function TargetEditor({ projectId, data, onSaved }) {
  const [value, setValue] = useState(data.projectTarget ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => setValue(data.projectTarget ?? ''), [data.projectTarget]);
  const save = async (next) => {
    setBusy(true);
    setError('');
    try {
      await strapiClient.put(`/profitability/projects/${projectId}/target`, { targetMarginPct: next === '' ? null : Number(next) });
      await onSaved();
    } catch (e) {
      setError(e?.message || 'Could not save the target');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className={card}>
      <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
        <Target className="h-4 w-4 text-orange-600" aria-hidden />
        Target margin
      </div>
      <p className="mt-1 text-xs text-gray-500">
        {data.projectTarget == null ? `Using the organization default of ${data.orgTarget}%.` : `Organization default is ${data.orgTarget}%.`} Admins and the project manager get an alert
        when the margin drops below it.
      </p>
      <form
        className="mt-3 flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          save(value);
        }}
      >
        <label className="sr-only" htmlFor="target-margin">
          Target margin %
        </label>
        <div className="relative">
          <input
            id="target-margin"
            type="number"
            min={-100}
            max={100}
            step="0.5"
            inputMode="decimal"
            placeholder={String(data.orgTarget)}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-28 rounded-lg border border-gray-300 py-1.5 pl-3 pr-7 text-sm tabular-nums focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
          />
          <span className="pointer-events-none absolute right-2.5 top-1.5 text-sm text-gray-400">%</span>
        </div>
        <button type="submit" disabled={busy} className={`${btn} bg-orange-600 text-white hover:bg-orange-700`}>
          Save
        </button>
        {data.projectTarget != null ? (
          <button type="button" disabled={busy} onClick={() => save('')} className={`${btn} border border-gray-200 bg-white text-gray-700 hover:bg-gray-50`}>
            Use default
          </button>
        ) : null}
      </form>
      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

function Panel({ projectId }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await strapiClient.get(`/profitability/projects/${projectId}`, { months: 12 });
      setData(res?.data || null);
      setError('');
    } catch (e) {
      setError(e?.message || 'Could not load profitability');
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) {
    return (
      <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700" role="alert">
        {error}
      </p>
    );
  }
  if (!data) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  const S = MARGIN_STATUS[data.status] || MARGIN_STATUS.ok;
  const marginTone = data.marginPct == null ? 'text-gray-400' : data.status === 'below' ? 'text-red-600' : data.status === 'near' ? 'text-amber-700' : 'text-emerald-700';
  const last = data.trend.filter((t) => t.marginPct != null);
  const delta = last.length >= 2 ? Math.round((last[last.length - 1].marginPct - last[last.length - 2].marginPct) * 10) / 10 : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${S.cls}`}>{S.label}</span>
        <span className="text-xs text-gray-500">
          Revenue from {data.sources.revenue.toLowerCase()}; cost from {data.sources.cost.toLowerCase()}.
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={IndianRupee} label="Revenue" value={inr.format(data.revenue)} hint="Invoiced, before tax" />
        <Stat icon={Wallet} label="Cost" value={inr.format(data.cost)} hint={`${data.approvedHours} approved h`} />
        <Stat icon={data.margin >= 0 ? TrendingUp : TrendingDown} label="Margin" value={inr.format(data.margin)} tone={data.margin < 0 ? 'text-red-600' : 'text-gray-900'} />
        <Stat
          icon={Percent}
          label="Margin %"
          value={data.marginPct == null ? '—' : `${data.marginPct}%`}
          tone={marginTone}
          hint={`Target ${data.targetMarginPct}%${delta != null ? ` · ${delta >= 0 ? '+' : ''}${delta} pts vs last month` : ''}`}
        />
      </div>

      {data.unratedHours > 0 ? (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900" role="status">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden />
          <span>
            {data.unratedHours} approved h from {data.unratedMembers} {data.unratedMembers === 1 ? 'person' : 'people'} have no cost rate, so cost is understated.
            {data.canManageRates ? ' Set cost rates from Portfolio → Cost rates & targets.' : ' Ask an admin to set cost rates.'}
          </span>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className={`${card} lg:col-span-2`}>
          <h3 className="mb-3 text-sm font-semibold text-gray-900">Margin trend · last {data.trend.length} months</h3>
          <TrendChart trend={data.trend} target={data.targetMarginPct} />
        </div>
        <TargetEditor projectId={projectId} data={data} onSaved={load} />
      </div>

      {data.members ? (
        <div className={`${card} overflow-x-auto p-0 sm:p-0`}>
          <div className="flex items-center justify-between px-4 pt-4 sm:px-5">
            <h3 className="text-sm font-semibold text-gray-900">Cost by person</h3>
            <span className="text-xs text-gray-500">Only admins see this</span>
          </div>
          <table className="mt-2 min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                <th className="px-4 py-2 font-medium sm:px-5">Person</th>
                <th className="px-4 py-2 text-right font-medium">Approved h</th>
                <th className="px-4 py-2 text-right font-medium">Cost rate</th>
                <th className="px-4 py-2 text-right font-medium sm:pr-5">Cost</th>
              </tr>
            </thead>
            <tbody>
              {data.members.map((m) => (
                <tr key={m.userId ?? 'none'} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-2 text-gray-900 sm:px-5">{m.name}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-gray-700">{m.hours}</td>
                  <td className={`px-4 py-2 text-right tabular-nums ${m.hourlyCost ? 'text-gray-700' : 'text-amber-700'}`}>{m.hourlyCost ? `${inr.format(m.hourlyCost)}/h` : 'Not set'}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-gray-900 sm:pr-5">{inr.format(m.cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

export default function ProjectProfitabilityPanel({ projectId }) {
  return (
    <PlanGate feature="pm.profitability">
      <Panel projectId={projectId} />
    </PlanGate>
  );
}
