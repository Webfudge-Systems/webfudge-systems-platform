'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

export function TileIconBox({ icon: Icon, variant = 'orange' }) {
  const variants = {
    orange: 'border-orange-200/80 bg-gradient-to-br from-orange-50 to-white text-orange-600',
    emerald: 'border-emerald-200/80 bg-gradient-to-br from-emerald-50 to-white text-emerald-600',
    sky: 'border-sky-200/80 bg-gradient-to-br from-sky-50 to-white text-sky-600',
  }
  return (
    <div
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border shadow-sm ${variants[variant] || variants.orange}`}
      aria-hidden
    >
      <Icon className="h-4 w-4" strokeWidth={2.25} />
    </div>
  )
}

export function TileHighlightCard({ icon, label, title, meta, badge, children }) {
  return (
    <div className="rounded-xl border border-white/70 bg-white/60 p-3 shadow-sm backdrop-blur-sm">
      <div className="flex items-start gap-2.5">
        <TileIconBox icon={icon} />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
          <p className="mt-0.5 text-sm font-bold leading-snug text-gray-900">{title}</p>
          {meta ? <p className="mt-0.5 text-xs text-gray-500">{meta}</p> : null}
          {children}
        </div>
        {badge ? (
          <span className="shrink-0 rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-orange-700">
            {badge}
          </span>
        ) : null}
      </div>
    </div>
  )
}

export function TileKpiStrip({ icon, label, value, hint, trend, trendPositive = true }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-white/70 bg-white/55 px-3 py-2.5">
      <TileIconBox icon={icon} variant={trendPositive ? 'emerald' : 'orange'} />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
        <p className="text-xl font-bold leading-none tabular-nums text-gray-900">{value}</p>
        {hint ? <p className="mt-1 text-xs text-gray-500">{hint}</p> : null}
      </div>
      {trend ? (
        <span
          className={`shrink-0 rounded-md px-2 py-1 text-[10px] font-semibold ${
            trendPositive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
          }`}
        >
          {trend}
        </span>
      ) : null}
    </div>
  )
}

export function TileBreakdownRow({ icon: Icon, label, value, pct, accent }) {
  const accents = {
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    sky: 'bg-sky-500',
    orange: 'bg-orange-500',
  }
  const barColor = accents[accent] || accents.orange

  return (
    <li className="rounded-lg border border-white/60 bg-white/45 px-2.5 py-2">
      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-gray-600">
          <Icon className="h-3.5 w-3.5 shrink-0 text-gray-500" aria-hidden />
          <span className="truncate">{label}</span>
        </span>
        <span className="text-base font-bold tabular-nums text-gray-900">{value}</span>
      </div>
      {pct != null ? (
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-gray-100/90">
          <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(100, pct)}%` }} />
        </div>
      ) : null}
    </li>
  )
}

export function TileFooterLink({ href, label }) {
  return (
    <Link
      href={href}
      className="mt-auto inline-flex w-fit items-center gap-1 rounded-lg border border-orange-200/60 bg-orange-50/50 px-2.5 py-1.5 text-xs font-semibold text-orange-700 transition-colors hover:border-orange-300 hover:bg-orange-50"
    >
      {label}
      <ChevronRight className="h-3.5 w-3.5" aria-hidden />
    </Link>
  )
}
