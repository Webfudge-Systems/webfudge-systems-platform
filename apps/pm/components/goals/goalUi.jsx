'use client';

/** Small shared pieces for Goals / OKRs (W12). */

export const inputClass =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20';

export const HEALTH = {
  on_track: { label: 'On track', chip: 'bg-emerald-50 text-emerald-700 ring-emerald-200', bar: 'bg-emerald-500' },
  at_risk: { label: 'At risk', chip: 'bg-amber-50 text-amber-800 ring-amber-200', bar: 'bg-amber-500' },
  off_track: { label: 'Off track', chip: 'bg-red-50 text-red-700 ring-red-200', bar: 'bg-red-500' },
};

export const METRIC_LABEL = { number: 'Number', percent: 'Percent', tasks: 'Linked tasks' };

export const userName = (u) => (u ? u.name || [u.firstName, u.lastName].filter(Boolean).join(' ') || u.username || u.email : '');

export function HealthChip({ value }) {
  const h = HEALTH[value] || HEALTH.on_track;
  return <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${h.chip}`}>{h.label}</span>;
}

export function ProgressBar({ value, health = 'on_track', size = 'md' }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  const h = HEALTH[health] || HEALTH.on_track;
  const height = size === 'sm' ? 'h-1.5' : 'h-2.5';
  return (
    <div className={`${height} w-full rounded-full bg-gray-100`} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className={`${height} rounded-full ${h.bar} transition-[width] duration-300`} style={{ width: `${pct}%` }} />
    </div>
  );
}

const fmt = (n) => (Number.isInteger(Number(n)) ? String(Number(n)) : Number(n).toFixed(1));

/** "12 of 20 signups", "45% of 80%", "3 of 5 tasks done" */
export function krValueText(kr) {
  if (kr.metricType === 'tasks') return kr.targetValue ? `${fmt(kr.currentValue)} of ${fmt(kr.targetValue)} tasks done` : 'No linked tasks yet';
  const unit = kr.metricType === 'percent' ? '%' : kr.unit ? ` ${kr.unit}` : '';
  return `${fmt(kr.currentValue)}${unit} of ${fmt(kr.targetValue)}${unit}`;
}

export function relativeTime(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

/** Current quarter label, e.g. "Q4 2026". */
export function currentQuarter() {
  const d = new Date();
  return `Q${Math.floor(d.getMonth() / 3) + 1} ${d.getFullYear()}`;
}
