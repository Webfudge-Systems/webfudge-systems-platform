'use client';

/**
 * G19 (SaaS): deal health from the backend — score, at-risk reasons (gone silent, stalled stage,
 * overdue tasks, close date passed, competitor / negative tone found by Fudge AI) and what to say next.
 * Calls onHealth({ level, label }) so the page can replace its probability-only chip.
 */

import { useCallback, useEffect, useState } from 'react';
import { Button, IS_SAAS_PLATFORM, usePlanFeature, planErrorDetails } from '@webfudge/ui';
import { AlertTriangle, CheckCircle2, Sparkles } from 'lucide-react';
import strapiClient from '../../lib/strapiClient';

export const HEALTH_LABEL = { high: 'At risk', medium: 'Needs attention', low: 'Healthy' };

export default function DealHealthSignals({ dealId, onHealth }) {
  const plan = usePlanFeature('crm.deal_health');
  const [health, setHealth] = useState(null);
  const [aiOn, setAiOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const apply = useCallback(
    (h) => {
      setHealth(h);
      if (h && onHealth) onHealth({ level: h.level, label: HEALTH_LABEL[h.level] || h.level, health: h.health });
    },
    [onHealth]
  );

  useEffect(() => {
    if (!IS_SAAS_PLATFORM || !dealId || !plan.ready || !plan.allowed) return;
    strapiClient
      .get(`/deal-health/deals/${dealId}`)
      .then((res) => {
        apply(res?.data || null);
        setAiOn(!!res?.meta?.aiEnabled);
      })
      .catch(() => {});
  }, [dealId, plan.ready, plan.allowed, apply]);

  if (!IS_SAAS_PLATFORM || !health) return null;

  const analyse = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await strapiClient.post(`/deal-health/deals/${dealId}/analyse`, {});
      apply(res?.data || health);
    } catch (err) {
      setError(planErrorDetails(err)?.message || err?.message || 'Fudge AI could not read the notes');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-4 rounded-xl bg-white p-4 ring-1 ring-gray-100">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Health score</p>
          <p className="text-2xl font-bold tabular-nums text-gray-900">{health.health}/100</p>
        </div>
        {aiOn && health.stage !== 'won' && health.stage !== 'lost' ? (
          <Button variant="outline" size="sm" onClick={analyse} disabled={busy}>
            <Sparkles className="mr-1 h-4 w-4" aria-hidden /> {busy ? 'Reading notes…' : 'Re-check notes'}
          </Button>
        ) : null}
      </div>
      {health.reasons?.length ? (
        <ul className="mt-2 space-y-1">
          {health.reasons.map((r) => (
            <li key={r.code} className="flex items-start gap-1.5 text-sm text-gray-700">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" aria-hidden />
              {r.text}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 flex items-center gap-1.5 text-sm text-gray-600">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-hidden /> No warning signs.
        </p>
      )}
      {health.whatToSay && health.reasons?.length ? (
        <p className="mt-2 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">
          <span className="font-medium text-gray-900">What to say: </span>
          {health.whatToSay}
        </p>
      ) : null}
      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
