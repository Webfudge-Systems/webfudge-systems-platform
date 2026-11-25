'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import { Card } from './console'
import { api, APP_META, formatDate } from '../../lib/saas'

/** Readable names for AI feature keys; unknown keys fall back to the key itself. */
const FEATURE_LABEL = {
  'grow.lead_score': 'Lead scoring',
  'grow.followup_email': 'Follow-up email drafts',
  'work.task_summary': 'Task summaries',
  'voice.transcribe': 'Voice-note transcription',
}

/**
 * Fudge AI credits for this month (P5): used / included, when they reset, and what used them.
 * Renders nothing when AI is switched off for this deployment.
 */
export default function AiCreditsCard({ orgId }) {
  const [usage, setUsage] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    setUsage(null)
    api('/api/ai/usage', { orgId })
      .then((res) => alive && setUsage(res.data))
      .catch((e) => alive && setError(e.message))
    return () => {
      alive = false
    }
  }, [orgId])

  if (error) return <Card title="AI credits"><p className="text-sm text-gray-600">{error}</p></Card>
  if (!usage || usage.enabled === false) return null

  const pct = usage.allowance ? Math.min(100, Math.round((usage.used / usage.allowance) * 100)) : 100
  const tone = pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-orange-500' : 'bg-gray-900'
  const included = Object.entries(usage.byApp || {}).filter(([, a]) => a.credits > 0)

  return (
    <Card title="AI credits" subtitle={`This month’s Fudge AI usage. Credits reset on ${formatDate(usage.resetsOn)}.`}>
      <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFF1E8] text-[#F5630F]">
            <Sparkles className="h-5 w-5" aria-hidden="true" />
          </span>
          <p className="text-2xl font-semibold text-gray-900">
            {usage.used.toLocaleString('en-IN')}
            <span className="text-base font-normal text-gray-500"> / {usage.allowance.toLocaleString('en-IN')} used</span>
          </p>
        </div>
        <p className="text-sm text-gray-600">{usage.remaining.toLocaleString('en-IN')} left</p>
      </div>

      <div
        className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-gray-100"
        role="progressbar"
        aria-label="AI credits used this month"
        aria-valuemin={0}
        aria-valuemax={usage.allowance}
        aria-valuenow={usage.used}
      >
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>

      {usage.allowance === 0 ? (
        <p className="mt-3 text-sm text-gray-600">Your current plans don’t include AI credits. Choose Pro or Business for an app to use Fudge AI.</p>
      ) : usage.remaining === 0 ? (
        <p className="mt-3 text-sm text-red-700">All credits are used. AI features pause until {formatDate(usage.resetsOn)} — upgrade a plan for more.</p>
      ) : null}

      {included.length > 0 && (
        <p className="mt-3 text-xs text-gray-500">
          Included: {included.map(([app, a]) => `${APP_META[app]?.name || app} ${a.credits.toLocaleString('en-IN')}`).join(' · ')} credits a month
        </p>
      )}

      {usage.byFeature?.length > 0 && (
        <div className="-mx-2 mt-4 overflow-x-auto">
          <table className="w-full min-w-[420px] text-left text-sm">
            <thead>
              <tr className="text-[13px] text-gray-500">
                <th className="px-2 pb-2 font-medium">Feature</th>
                <th className="px-2 pb-2 text-right font-medium">Uses</th>
                <th className="px-2 pb-2 text-right font-medium">Credits</th>
              </tr>
            </thead>
            <tbody>
              {usage.byFeature.map((f) => (
                <tr key={f.feature} className="border-t border-gray-100">
                  <td className="px-2 py-2.5">{FEATURE_LABEL[f.feature] || f.feature}</td>
                  <td className="px-2 py-2.5 text-right tabular-nums">{f.calls.toLocaleString('en-IN')}</td>
                  <td className="px-2 py-2.5 text-right font-medium tabular-nums">{f.credits.toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-sm">
        <Link href="/ai-approvals" className="font-semibold text-orange-600 hover:underline">
          Review AI drafts waiting for approval
        </Link>
      </p>
    </Card>
  )
}
