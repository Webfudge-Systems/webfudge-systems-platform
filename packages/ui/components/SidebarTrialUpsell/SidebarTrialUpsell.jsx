'use client'

import Link from 'next/link'
import { Sparkles } from 'lucide-react'

function trialHeadline(daysRemaining) {
  const n = Math.floor(Number(daysRemaining))
  if (Number.isNaN(n) || n < 0) return 'Your trial is active'
  if (n === 0) return 'Your trial ends today'
  if (n === 1) return '1 day left in your trial'
  return `${n} days left in your trial`
}

/**
 * Sidebar CTA styled like upgrade promos (warm gradient, sparkle, pill button).
 * Use at the bottom of app sidebars instead of a profile chip.
 */
export function SidebarTrialUpsell({
  collapsed = false,
  daysRemaining = 12,
  upgradeHref = '/coming-soon?feature=upgrade',
  subline = 'Reminders, extra projects, and more.',
  upgradeLabel = 'Upgrade plan',
}) {
  const headline = trialHeadline(daysRemaining)

  if (collapsed) {
    return (
      <div className="flex justify-center p-2 pb-5">
        <Link
          href={upgradeHref}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-orange-400/45 bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-md transition hover:brightness-105"
          title={`${headline} — ${upgradeLabel}`}
        >
          <Sparkles className="h-5 w-5 shrink-0" strokeWidth={2} aria-hidden />
        </Link>
      </div>
    )
  }

  return (
    <div className="p-4 pt-1 pb-6">
      <div className="relative overflow-hidden rounded-2xl border border-orange-200/70 bg-gradient-to-br from-orange-50 via-amber-50/95 to-orange-100/85 p-4 shadow-md ring-1 ring-orange-900/[0.06]">
        <div className="pointer-events-none absolute -right-6 -top-8 h-28 w-28 rotate-12 rounded-3xl bg-orange-300/20" />
        <div className="pointer-events-none absolute -bottom-8 -left-4 h-24 w-24 -rotate-6 rounded-2xl bg-amber-200/25" />
        <div className="pointer-events-none absolute right-10 top-6 h-10 w-10 rotate-[18deg] rounded-lg bg-orange-200/25" />

        <div className="relative flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-orange-200/60">
            <Sparkles className="h-5 w-5 text-orange-500" strokeWidth={2} aria-hidden />
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="text-sm font-bold leading-snug text-gray-900">{headline}</p>
            <p className="mt-1 text-xs leading-snug text-gray-600">{subline}</p>
          </div>
        </div>

        <Link
          href={upgradeHref}
          className="relative mt-3.5 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:from-orange-600 hover:to-orange-700"
        >
          <Sparkles className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
          {upgradeLabel}
        </Link>
      </div>
    </div>
  )
}
