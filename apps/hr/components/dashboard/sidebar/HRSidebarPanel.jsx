'use client'

import Link from 'next/link'
import { ChevronRight, AlertTriangle } from 'lucide-react'

/** Clickable approval / action row — PM insight list style */
export function HRSidebarActionRow({ href, title, overdue = false }) {
  return (
    <Link
      href={href}
      className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors hover:bg-white/80 ${
        overdue ? 'bg-red-50/60' : ''
      }`}
    >
      {overdue ? (
        <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-600" aria-hidden />
      ) : null}
      <span className="min-w-0 flex-1 truncate font-medium text-gray-900">{title}</span>
      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-gray-400" aria-hidden />
    </Link>
  )
}

/** Static info row (events, milestones) */
export function HRSidebarInfoRow({ leading, title, trailing }) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm transition-colors hover:bg-white/80">
      <span className="flex min-w-0 items-center gap-2 font-medium text-gray-900">
        {leading ? (
          <span className="shrink-0 text-base leading-none" aria-hidden>
            {leading}
          </span>
        ) : null}
        <span className="truncate">{title}</span>
      </span>
      {trailing ? <span className="shrink-0 text-[10px] text-gray-500">{trailing}</span> : null}
    </div>
  )
}
