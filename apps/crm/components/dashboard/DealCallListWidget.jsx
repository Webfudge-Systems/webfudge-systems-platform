'use client';

/**
 * G19: today's "who to call and what to say" list for the signed-in rep (SaaS, plan feature crm.deal_health).
 * Built each morning by the backend cron; "Refresh" rebuilds it now (and re-reads notes with Fudge AI when on).
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Button, Card, LoadingSpinner, UpgradePrompt, planErrorDetails } from '@webfudge/ui';
import { AlertTriangle, PhoneCall, RefreshCw, Sparkles } from 'lucide-react';
import strapiClient from '../../lib/strapiClient';

const LEVEL = {
  high: { label: 'At risk', cls: 'bg-red-50 text-red-700 ring-red-200' },
  medium: { label: 'Needs attention', cls: 'bg-amber-50 text-amber-800 ring-amber-200' },
  low: { label: 'On track', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
};

const money = (v) => `₹${Number(v || 0).toLocaleString('en-IN')}`;

export default function DealCallListWidget({ className = '' }) {
  const [state, setState] = useState({ loading: true, data: null, error: null, plan: null });
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await strapiClient.get('/deal-health/call-list');
      setState({ loading: false, data: res?.data || null, meta: res?.meta || {}, error: null, plan: null });
    } catch (err) {
      setState({ loading: false, data: null, error: err?.message || 'Could not load your call list', plan: planErrorDetails(err) });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = async () => {
    setRefreshing(true);
    try {
      const res = await strapiClient.post('/deal-health/call-list/refresh', {});
      setState((s) => ({ ...s, data: res?.data || s.data, error: null }));
    } catch (err) {
      setState((s) => ({ ...s, error: err?.message || 'Refresh failed', plan: planErrorDetails(err) }));
    } finally {
      setRefreshing(false);
    }
  };

  if (state.plan) return <UpgradePrompt compact className={className} {...state.plan} />;

  const items = state.data?.items || [];
  return (
    <Card glass className={`flex flex-col ${className}`}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900">
            <PhoneCall className="h-4 w-4 text-orange-500" aria-hidden />
            Who to call today
          </h3>
          <p className="mt-0.5 text-xs text-gray-500">
            Ranked by risk, deal value and close date.
            {state.data?.aiUsed ? (
              <span className="ml-1 inline-flex items-center gap-1 text-violet-600">
                <Sparkles className="h-3 w-3" aria-hidden /> Notes read by Fudge AI
              </span>
            ) : null}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} disabled={refreshing || state.loading} aria-label="Refresh call list">
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} aria-hidden />
        </Button>
      </div>

      {state.loading ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      ) : state.error && !items.length ? (
        <p className="py-6 text-center text-sm text-gray-500">{state.error}</p>
      ) : !items.length ? (
        <p className="py-6 text-center text-sm text-gray-500">No deals need a call today. Nice work.</p>
      ) : (
        <ol className="divide-y divide-gray-100">
          {items.map((item) => {
            const lv = LEVEL[item.level] || LEVEL.low;
            return (
              <li key={item.dealId} className="py-3">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-700 tabular-nums">
                    {item.rank}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/sales/deals/${item.dealId}`} className="truncate text-sm font-medium text-gray-900 hover:underline">
                        {item.name}
                      </Link>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${lv.cls}`}>{lv.label}</span>
                      <span className="text-xs text-gray-500 tabular-nums">
                        {money(item.value)} · {item.stage}
                      </span>
                    </div>
                    {item.reasons?.length ? (
                      <ul className="mt-1 space-y-0.5">
                        {item.reasons.slice(0, 3).map((r) => (
                          <li key={r.code} className="flex items-center gap-1.5 text-xs text-gray-600">
                            <AlertTriangle className="h-3 w-3 shrink-0 text-amber-500" aria-hidden />
                            {r.text}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {item.whatToSay ? (
                      <p className="mt-1.5 rounded-lg bg-gray-50 px-2.5 py-1.5 text-xs text-gray-700">
                        <span className="font-medium text-gray-900">Say: </span>
                        {item.whatToSay}
                      </p>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}
