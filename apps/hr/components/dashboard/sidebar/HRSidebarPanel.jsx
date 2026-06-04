'use client'

import Link from 'next/link'
import { ChevronRight, AlertTriangle } from 'lucide-react'
import HRGlassCard from '../../shared/HRGlassCard'
import HRPanelHeader from '../../shared/HRPanelHeader'

/** Shared header for all three dashboard sidebar panels */
export function HRSidebarPanelHeader(props) {
  return <HRPanelHeader {...props} />
}

/** Clickable approval / action row */
export function HRSidebarActionRow({ href, title, overdue = false }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-all hover:shadow-md ${
        overdue
          ? 'border-l-[3px] border-l-red-500 border-red-100/80 bg-red-50/40'
          : 'border-white/60 bg-white/50 hover:bg-white/70'
      }`}
    >
      {overdue ? <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" aria-hidden /> : null}
      <span className="flex-1 text-sm font-medium text-gray-900">{title}</span>
      <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
    </Link>
  )
}

/** Static info row (events, metrics) */
export function HRSidebarInfoRow({ leading, title, trailing, className = '' }) {
  return (
    <li
      className={`flex items-center justify-between gap-3 rounded-xl border border-white/60 bg-white/50 px-3 py-2.5 text-sm ${className}`}
    >
      <span className="flex min-w-0 items-center gap-2 font-medium text-gray-900">
        {leading ? <span className="shrink-0 text-base leading-none" aria-hidden>{leading}</span> : null}
        <span className="truncate">{title}</span>
      </span>
      {trailing ? <span className="shrink-0 text-xs text-gray-500">{trailing}</span> : null}
    </li>
  )
}

/** Metric block inside status panel */
export function HRSidebarMetricBlock({ icon: Icon, label, value, hint, badge }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/60 bg-white/50 px-3 py-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-orange-200/80 bg-white/60">
        <Icon className="h-5 w-5 text-orange-600" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
        <p className="mt-0.5 text-sm font-semibold text-gray-900">{value}</p>
        {hint ? <p className="mt-0.5 text-xs text-gray-500">{hint}</p> : null}
      </div>
      {badge ? (
        <span className="shrink-0 rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-700">
          {badge}
        </span>
      ) : null}
    </div>
  )
}

export function HRSidebarPanel({ children, className = '' }) {
  return <HRGlassCard className={className}>{children}</HRGlassCard>
}
