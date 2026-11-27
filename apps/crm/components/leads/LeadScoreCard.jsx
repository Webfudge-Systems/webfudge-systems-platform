'use client';

/**
 * G11: computed lead score on the lead detail page: score + label, top reasons ("why"), next step,
 * and a Recalculate button. The backend also rescores automatically after new activity.
 */

import { useState } from 'react';
import { Card } from '@webfudge/ui';
import { Gauge, RefreshCw, Sparkles } from 'lucide-react';
import leadCompanyService from '../../lib/api/leadCompanyService';
import LeadScoreBadge, { scoreReasons } from './LeadScoreBadge';

function timeAgo(iso) {
  if (!iso) return null;
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h} h ago`;
  return `${Math.round(h / 24)} d ago`;
}

export default function LeadScoreCard({ lead, onUpdated }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!lead?.id) return null;

  const meta = lead.aiScoreReasons || {};
  const reasons = scoreReasons(lead);
  const viaAi = meta.source === 'ai';

  const recalc = async () => {
    setBusy(true);
    setError('');
    try {
      const r = await leadCompanyService.rescore(lead.id);
      onUpdated?.({
        aiScore: r.score,
        aiScoreLabel: r.label,
        aiScoredAt: r.scoredAt,
        aiScoreReasons: { ...meta, reasons: r.reasons, nextStep: r.nextStep, source: r.source, base: r.base, fit: r.fit, intent: r.intent },
      });
    } catch (e) {
      setError(e?.message || 'Could not recalculate the score.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card variant="elevated" className="rounded-xl">
      <div className="mb-3 flex items-start justify-between gap-2">
        <h2 className="flex items-center gap-2 text-xl font-semibold text-gray-900">
          <Gauge className="h-5 w-5 text-gray-500" aria-hidden />
          Lead score
        </h2>
        <button
          type="button"
          onClick={recalc}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${busy ? 'animate-spin' : ''}`} aria-hidden />
          {busy ? 'Scoring…' : 'Recalculate'}
        </button>
      </div>

      {lead.aiScore == null ? (
        <p className="text-sm text-gray-600">Not scored yet. Scores are calculated automatically after activity, or click Recalculate.</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <LeadScoreBadge lead={lead} size="lg" />
            {meta.fit != null && meta.intent != null ? (
              <span className="text-xs text-gray-500 tabular-nums">Fit {meta.fit}/50 · Intent {meta.intent}/50</span>
            ) : null}
          </div>
          {reasons.length ? (
            <div className="mt-4">
              <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">Why</h3>
              <ul className="space-y-1.5">
                {reasons.map((r, i) => (
                  <li key={i} className="flex gap-2 text-sm text-gray-700">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-300" aria-hidden />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {meta.nextStep ? (
            <p className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">
              <span className="font-medium">Next step:</span> {meta.nextStep}
            </p>
          ) : null}
          <p className="mt-3 flex items-center gap-1.5 text-xs text-gray-400">
            {viaAi ? <Sparkles className="h-3.5 w-3.5" aria-hidden /> : null}
            {viaAi ? 'Fudge AI + rules' : 'Rules (fit, engagement, win history)'}
            {lead.aiScoredAt ? ` · updated ${timeAgo(lead.aiScoredAt)}` : ''}
          </p>
        </>
      )}
      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
    </Card>
  );
}
