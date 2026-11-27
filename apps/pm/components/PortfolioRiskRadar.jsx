'use client';

/**
 * Portfolio (W11) → risk radar + scope-creep summary (W19, SaaS only, plan-gated).
 * One line per project that needs attention: risk level, forecast slip, top reason and open
 * out-of-scope flags / change orders waiting for approval.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Radar } from 'lucide-react';
import { IS_SAAS_PLATFORM, PlanGate, usePlanFeature } from '@webfudge/ui';
import strapiClient from '../lib/strapiClient';
import { LevelBadge } from './ProjectRiskPanel';

const MAX_ROWS = 8;

function RiskRadarCard() {
  const scopeAllowed = usePlanFeature('pm.scope_watch').allowed;
  const [risk, setRisk] = useState(null);
  const [scope, setScope] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    strapiClient
      .get('/risk-radar/portfolio')
      .then((res) => alive && setRisk(res?.data || null))
      .catch((e) => alive && setError(e?.message || 'Could not load the risk radar'));
    if (scopeAllowed) {
      strapiClient
        .get('/scope-watch/portfolio')
        .then((res) => alive && setScope(res?.data || null))
        .catch(() => alive && setScope(null));
    }
    return () => {
      alive = false;
    };
  }, [scopeAllowed]);

  if (error) return <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>;
  if (!risk) return null;

  const scopeBy = new Map((scope?.projects || []).map((p) => [p.id, p]));
  const rows = risk.projects.filter((p) => p.level !== 'low' || scopeBy.has(p.id)).slice(0, MAX_ROWS);
  const s = risk.summary;
  const chips = [
    { label: 'High risk', value: s.high, cls: s.high ? 'text-rose-700' : 'text-gray-900' },
    { label: 'Medium risk', value: s.medium, cls: s.medium ? 'text-amber-700' : 'text-gray-900' },
    { label: 'Forecast to slip', value: s.slipping, cls: s.slipping ? 'text-rose-700' : 'text-gray-900' },
    { label: 'Suggested reassignments', value: s.reassignments, cls: 'text-gray-900' },
    ...(scope ? [{ label: 'Change orders to approve', value: scope.summary.pendingChangeOrders, cls: scope.summary.pendingChangeOrders ? 'text-amber-700' : 'text-gray-900' }] : []),
  ];

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5" aria-labelledby="portfolio-risk-title">
      <div className="flex items-center gap-2">
        <Radar className="h-5 w-5 text-orange-600" aria-hidden />
        <h2 id="portfolio-risk-title" className="text-base font-semibold text-gray-900">
          Risk radar
        </h2>
        <span className="text-sm text-gray-500">Deadlines likely to slip and out-of-scope client requests</span>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {chips.map((c) => (
          <div key={c.label} className="rounded-lg bg-gray-50 px-3 py-2">
            <dt className="text-xs text-gray-500">{c.label}</dt>
            <dd className={`text-lg font-semibold tabular-nums ${c.cls}`}>{c.value}</dd>
          </div>
        ))}
      </dl>
      {rows.length ? (
        <ul className="mt-3 divide-y divide-gray-100">
          {rows.map((p) => {
            const sc = scopeBy.get(p.id);
            return (
              <li key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
                <Link href={`/projects/${p.slug || p.id}`} className="min-w-[10rem] flex-1 truncate text-sm font-medium text-gray-900 hover:text-orange-600">
                  {p.name}
                </Link>
                <LevelBadge level={p.level} />
                <span className={`text-xs ${p.slipDays ? 'font-semibold text-rose-600' : 'text-gray-500'}`}>{p.slipDays ? `${p.slipDays} days late at this pace` : p.projectedFinish ? 'On pace' : 'No forecast yet'}</span>
                {sc ? (
                  <span className="text-xs text-amber-700">
                    {sc.outOfScope} out of scope{sc.pendingChangeOrders ? ` · ${sc.pendingChangeOrders} change order${sc.pendingChangeOrders === 1 ? '' : 's'} to approve` : ''}
                  </span>
                ) : null}
                <span className="basis-full text-xs text-gray-500">{p.topTasks[0] ? `${p.topTasks[0].name}: ${p.topTasks[0].reason}` : p.reasons[0] || ''}</span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-3 rounded-lg bg-gray-50 px-3 py-4 text-center text-sm text-gray-500">No project is at risk right now.</p>
      )}
    </section>
  );
}

export default function PortfolioRiskRadar() {
  if (!IS_SAAS_PLATFORM) return null;
  return (
    <PlanGate feature="pm.risk_radar" compact>
      <RiskRadarCard />
    </PlanGate>
  );
}
