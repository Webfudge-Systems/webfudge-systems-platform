'use client';

/**
 * G19: monthly revenue forecast with an 80% confidence range (SaaS, plan feature crm.forecast).
 * Numbers are deterministic (pipeline × the team's historical stage win rates); Fudge AI only explains them.
 */

import { useCallback, useEffect, useState } from 'react';
import { Button, Card, LoadingSpinner, UpgradePrompt, planErrorDetails } from '@webfudge/ui';
import { Sparkles, TrendingUp } from 'lucide-react';
import strapiClient from '../../lib/strapiClient';

const money = (v) => `₹${Math.round(Number(v || 0)).toLocaleString('en-IN')}`;
const monthLabel = (m) => {
  const [y, mo] = String(m).split('-').map(Number);
  return new Date(Date.UTC(y, mo - 1, 1)).toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' });
};

export default function RevenueForecastWidget({ className = '' }) {
  const [state, setState] = useState({ loading: true, data: null, meta: {}, error: null, plan: null });
  const [explain, setExplain] = useState({ loading: false, data: null, error: null });

  const load = useCallback(async () => {
    try {
      const res = await strapiClient.get('/deal-health/forecast');
      setState({ loading: false, data: res?.data || null, meta: res?.meta || {}, error: null, plan: null });
    } catch (err) {
      setState({ loading: false, data: null, meta: {}, error: err?.message || 'Could not load the forecast', plan: planErrorDetails(err) });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const askAi = async () => {
    setExplain({ loading: true, data: null, error: null });
    try {
      const res = await strapiClient.post('/deal-health/forecast/explain', {});
      setExplain({ loading: false, data: res?.data || null, error: null });
    } catch (err) {
      const plan = planErrorDetails(err);
      setExplain({ loading: false, data: null, error: plan?.message || err?.message || 'Fudge AI could not explain the forecast' });
    }
  };

  if (state.plan) return <UpgradePrompt compact className={className} {...state.plan} />;
  const months = state.data?.months || [];
  const now = months[0];
  const maxHigh = Math.max(1, ...months.map((m) => m.high));

  return (
    <Card glass className={`flex flex-col ${className}`}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900">
            <TrendingUp className="h-4 w-4 text-orange-500" aria-hidden />
            Revenue forecast
          </h3>
          <p className="mt-0.5 text-xs text-gray-500">
            {state.data?.scope === 'mine' ? 'Your deals' : 'Whole team'} · open deals weighted by past win rates per stage · 80% range
          </p>
        </div>
        {state.meta?.aiEnabled && now ? (
          <Button variant="outline" size="sm" onClick={askAi} disabled={explain.loading}>
            <Sparkles className="mr-1 h-4 w-4" aria-hidden /> {explain.loading ? 'Thinking…' : 'Explain'}
          </Button>
        ) : null}
      </div>

      {state.loading ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      ) : !now ? (
        <p className="py-6 text-center text-sm text-gray-500">{state.error || 'No forecast yet.'}</p>
      ) : (
        <>
          <div className="mb-4">
            <p className="text-xs font-medium text-gray-500">{monthLabel(now.month)}</p>
            <p className="text-2xl font-semibold text-gray-900 tabular-nums">{money(now.expected)}</p>
            <p className="text-xs text-gray-600 tabular-nums">
              Likely between {money(now.low)} and {money(now.high)} · {money(now.wonSoFar)} already won · {now.dealCount} open deal{now.dealCount === 1 ? '' : 's'}
            </p>
          </div>
          <ul className="space-y-2.5">
            {months.map((m) => (
              <li key={m.month}>
                <div className="mb-1 flex justify-between text-xs text-gray-600">
                  <span>{monthLabel(m.month)}</span>
                  <span className="tabular-nums">
                    {money(m.expected)} <span className="text-gray-400">({money(m.low)}–{money(m.high)})</span>
                  </span>
                </div>
                <div className="relative h-2 rounded-full bg-gray-100" aria-hidden>
                  <div className="absolute h-2 rounded-full bg-orange-200" style={{ left: `${(m.low / maxHigh) * 100}%`, width: `${Math.max(1, ((m.high - m.low) / maxHigh) * 100)}%` }} />
                  <div className="absolute top-[-2px] h-3 w-1 rounded bg-orange-500" style={{ left: `calc(${(m.expected / maxHigh) * 100}% - 2px)` }} />
                </div>
              </li>
            ))}
          </ul>
          {months.some((m) => m.undatedCount) ? (
            <p className="mt-3 text-[11px] text-gray-400">{now.undatedCount} open deal(s) have no expected close date and are not counted.</p>
          ) : null}
          {explain.error ? <p className="mt-3 text-xs text-red-600">{explain.error}</p> : null}
          {explain.data ? (
            <div className="mt-3 rounded-lg bg-violet-50 p-3 text-xs text-gray-700">
              <p className="font-medium text-gray-900">{explain.data.headline}</p>
              <p className="mt-1">{explain.data.explanation}</p>
              {explain.data.focus?.length ? (
                <ul className="mt-1 list-disc pl-4">
                  {explain.data.focus.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </Card>
  );
}
