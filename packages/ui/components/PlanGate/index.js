'use client'

import { useContext } from 'react'
import { ArrowUpRight, Lock, Users } from 'lucide-react'
import { getAppUrl } from '@webfudge/utils'
import { AppAccessContext, IS_SAAS_PLATFORM, REFRESH_EVENT } from '../SaasAccessGate'

/**
 * SaaS plan gating (G16 Grow, W15 Work). Feature keys and the plan that unlocks each one come from
 * the API (/api/saas/access → features), which also enforces them. On Internal everything is allowed.
 *
 *   const { allowed } = usePlanFeature('crm.forecast')
 *   <PlanGate feature="pm.client_portal">…Business-only UI…</PlanGate>
 *   <PlanLimitNotice app="crm" limit="contacts" />
 *   const prompt = planErrorDetails(error)   // from a 402/400 API error → <UpgradePrompt {...prompt} />
 */

const APP_LABEL = { crm: 'Fudge Grow', pm: 'Fudge Work' }
const TIER_LABEL = { free: 'Free', pro: 'Pro', business: 'Business' }

export function upgradeHref(app) {
  return `${getAppUrl('accounts')}/billing?app=${encodeURIComponent(app)}`
}

/** Asks SaasAccessGate to reload plan and usage (e.g. after creating records or a plan-limit error). */
export function refreshSaasAccess() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(REFRESH_EVENT))
}

/** Plan details for one app: { ready, tier, tierLabel, limits, usage, aiCreditsMonthly, features, isAdmin }. */
export function usePlan(app) {
  const ctx = useContext(AppAccessContext)
  if (!IS_SAAS_PLATFORM) return { ready: true, internal: true, limits: {}, usage: {}, features: [], isAdmin: true }
  const access = ctx?.apps?.[app]
  return {
    ready: ctx != null,
    internal: false,
    tier: access?.tier || null,
    tierLabel: access?.tierLabel || null,
    limits: access?.limits || {},
    usage: access?.usage || {},
    aiCreditsMonthly: access?.aiCreditsMonthly ?? 0,
    features: access?.features || [],
    isAdmin: Boolean(ctx?.isAdmin),
  }
}

/** Whether the organization's plan includes a feature key such as 'crm.forecast'. */
export function usePlanFeature(key) {
  const ctx = useContext(AppAccessContext)
  const app = String(key).split('.')[0]
  if (!IS_SAAS_PLATFORM) return { ready: true, allowed: true, app, feature: { label: key } }
  const def = ctx?.features?.[key] || { app, tier: 'business', label: key }
  const access = ctx?.apps?.[def.app]
  return {
    ready: ctx != null,
    allowed: Boolean(access && access.access !== 'locked' && access.features?.includes(key)),
    app: def.app,
    feature: def,
    requiredTier: def.tier,
    isAdmin: Boolean(ctx?.isAdmin),
    upgradeHref: upgradeHref(def.app),
  }
}

/** Upgrade card. `compact` renders a one-line banner instead of a card. */
export function UpgradePrompt({ app, title, message, requiredTier = 'pro', isAdmin = true, compact = false, className = '' }) {
  const href = upgradeHref(app)
  const plan = `${APP_LABEL[app] || app} ${TIER_LABEL[requiredTier] || ''}`.trim()
  const cta = isAdmin ? (
    <a href={href} className="inline-flex min-h-[40px] items-center gap-1 rounded-full bg-[#F5630F] px-4 text-sm font-semibold text-[#0F0F0F] hover:bg-[#E85A0A]">
      Upgrade to {TIER_LABEL[requiredTier] || 'a paid plan'}
      <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
    </a>
  ) : (
    <span className="text-sm text-[#5C5C5C]">Ask an admin to upgrade to {plan}.</span>
  )

  if (compact) {
    return (
      <div role="status" className={`flex flex-wrap items-center gap-3 rounded-xl border border-[#F8D3BC] bg-[#FFF6F0] px-4 py-3 ${className}`}>
        <Lock className="h-4 w-4 flex-shrink-0 text-[#B84A0B]" aria-hidden="true" />
        <span className="min-w-0 flex-1 text-sm text-[#5C3412]">
          {title && <strong className="font-semibold">{title}. </strong>}
          {message}
        </span>
        {cta}
      </div>
    )
  }

  return (
    <div role="status" className={`flex flex-col items-center rounded-2xl border border-[#F8D3BC] bg-[#FFF6F0] px-6 py-8 text-center ${className}`}>
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-[#B84A0B]">
        <Lock className="h-5 w-5" aria-hidden="true" />
      </span>
      {title && <h3 className="mt-3 text-base font-semibold text-[#0F0F0F]">{title}</h3>}
      {message && <p className="mt-1 max-w-md text-sm leading-relaxed text-[#5C5C5C]">{message}</p>}
      <div className="mt-4">{cta}</div>
    </div>
  )
}

/**
 * Renders children only when the plan includes `feature`; otherwise an upgrade prompt (or `fallback`).
 * Renders nothing while the plan is loading.
 */
export function PlanGate({ feature, children, fallback, compact = false, className = '' }) {
  const state = usePlanFeature(feature)
  if (!state.ready) return null
  if (state.allowed) return children
  if (fallback !== undefined) return fallback
  const plan = `${APP_LABEL[state.app] || state.app} ${TIER_LABEL[state.requiredTier] || ''}`.trim()
  return (
    <UpgradePrompt
      app={state.app}
      requiredTier={state.requiredTier}
      isAdmin={state.isAdmin}
      compact={compact}
      className={className}
      title={`${state.feature.label} is on the ${plan} plan`}
      message={`Upgrade to unlock ${state.feature.label.toLowerCase()} for your whole team.`}
    />
  )
}

/**
 * Usage meter for a plan limit ('contacts' or 'users'). Shows once usage reaches `threshold` of
 * the limit (default 80%), and an upgrade prompt when the limit is reached.
 */
export function PlanLimitNotice({ app, limit = 'contacts', threshold = 0.8, className = '' }) {
  const plan = usePlan(app)
  if (plan.internal || !plan.ready) return null
  const max = plan.limits?.[limit]
  const used = plan.usage?.[limit]
  if (max == null || used == null || used < max * threshold) return null
  const full = used >= max
  const noun = limit === 'users' ? 'people' : limit
  return (
    <UpgradePrompt
      compact
      app={app}
      requiredTier="pro"
      isAdmin={plan.isAdmin}
      className={className}
      title={full ? `You’ve reached the ${plan.tierLabel || 'Free'} plan limit` : `${used} of ${max} ${noun} used`}
      message={
        full
          ? `The ${plan.tierLabel || 'Free'} plan includes up to ${max} ${noun}. Upgrade ${APP_LABEL[app] || app} to Pro to add more.`
          : `The ${plan.tierLabel || 'Free'} plan includes up to ${max} ${noun}.`
      }
    />
  )
}

const PLAN_CODES = new Set(['PLAN_CONTACT_LIMIT', 'PLAN_USER_LIMIT', 'PLAN_FEATURE_REQUIRED'])

/**
 * Reads a plan-limit error from an API failure (axios error, fetch JSON body, or a thrown Error with
 * `.details`). Returns props for <UpgradePrompt> or null when it is not a plan error.
 */
export function planErrorDetails(error) {
  const body = error?.response?.data ?? error?.data ?? error?.body ?? error
  const err = body?.error ?? body
  const details = err?.details ?? error?.details ?? {}
  if (!PLAN_CODES.has(details.code)) return null
  refreshSaasAccess()
  return {
    code: details.code,
    app: details.app || details.apps?.[0] || 'crm',
    requiredTier: details.requiredTier || 'pro',
    title: details.code === 'PLAN_FEATURE_REQUIRED' ? 'Upgrade required' : 'Plan limit reached',
    message: err?.message || error?.message || 'Your plan does not include this.',
  }
}

export default PlanGate
