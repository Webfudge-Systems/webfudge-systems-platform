'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

export function TileIconBox({ icon: Icon, variant = 'orange' }) {
  const variants = {
    orange: 'bg-orange-100 text-orange-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    sky: 'bg-sky-100 text-sky-600',
  }
  return (
    <div
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${variants[variant] || variants.orange}`}
      aria-hidden
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={2.25} />
    </div>
  )
}

export function TileHighlightCard({ icon, label, title, meta, badge, children }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-white px-3 py-2.5">
      <div className="flex items-start gap-2.5">
        <TileIconBox icon={icon} />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">{label}</p>
          <p className="mt-0.5 text-sm font-semibold leading-snug text-gray-900">{title}</p>
          {meta ? <p className="mt-0.5 text-[11px] text-gray-500">{meta}</p> : null}
          {children}
        </div>
        {badge ? (
          <span className="shrink-0 rounded-full bg-orange-100 px-1.5 py-px text-[10px] font-bold uppercase tracking-wide text-orange-800">
            {badge}
          </span>
        ) : null}
      </div>
    </div>
  )
}

export function TileKpiStrip({ icon, label, value, hint, trend, trendPositive = true }) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-gray-100 bg-white px-3 py-2.5">
      <TileIconBox icon={icon} variant={trendPositive ? 'emerald' : 'orange'} />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">{label}</p>
        <p className="text-lg font-bold leading-none tabular-nums text-gray-900">{value}</p>
        {hint ? <p className="mt-1 text-[11px] text-gray-500">{hint}</p> : null}
      </div>
      {trend ? (
        <span
          className={`shrink-0 rounded-full px-1.5 py-px text-[10px] font-semibold ${
            trendPositive ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
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
    <li className="rounded-lg border border-gray-100 bg-white px-2.5 py-2">
      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-600">
          <Icon className="h-3.5 w-3.5 shrink-0 text-gray-500" aria-hidden />
          <span className="truncate">{label}</span>
        </span>
        <span className="text-sm font-bold tabular-nums text-gray-900">{value}</span>
      </div>
      {pct != null ? (
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-200/90">
          <div
            className={`h-full rounded-full transition-all duration-300 ${barColor}`}
            style={{ width: `${Math.min(100, Math.max(pct > 0 ? 4 : 0, pct))}%` }}
          />
        </div>
      ) : null}
    </li>
  )
}

export function TileFooterLink({ href, label }) {
  return (
    <Link
      href={href}
      className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-[11px] font-semibold text-orange-600 transition-colors hover:bg-orange-50/80"
    >
      {label}
      <ChevronRight className="h-3.5 w-3.5" aria-hidden />
    </Link>
  )
}
