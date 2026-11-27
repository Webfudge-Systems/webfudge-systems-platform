'use client';

/** G11: computed lead score pill (hot / warm / cold). Hover shows the top reasons. */

const TONES = {
  hot: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  warm: 'bg-amber-50 text-amber-700 ring-amber-200',
  cold: 'bg-slate-100 text-slate-600 ring-slate-200',
};

export function scoreLabel(score) {
  if (score == null) return null;
  if (score >= 70) return 'hot';
  if (score >= 40) return 'warm';
  return 'cold';
}

export function scoreReasons(lead) {
  const r = lead?.aiScoreReasons;
  return Array.isArray(r?.reasons) ? r.reasons : [];
}

export default function LeadScoreBadge({ lead, size = 'sm' }) {
  const score = lead?.aiScore;
  if (score == null) return <span className="text-sm text-gray-400">—</span>;
  const label = lead.aiScoreLabel || scoreLabel(score);
  const reasons = scoreReasons(lead);
  const big = size === 'lg';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full ring-1 ring-inset tabular-nums font-medium ${TONES[label] || TONES.cold} ${big ? 'px-3 py-1 text-base' : 'px-2 py-0.5 text-xs'}`}
      title={reasons.length ? reasons.join('\n') : undefined}
    >
      {score}
      <span className="capitalize font-normal opacity-80">{label}</span>
    </span>
  );
}
