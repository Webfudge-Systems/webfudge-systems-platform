'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { Clock, Lock, Sparkles, X } from 'lucide-react'
import { getAppUrl } from '@webfudge/utils'

/** True when this app is deployed as part of the self-serve SaaS (NEXT_PUBLIC_PLATFORM_MODE=saas). */
export const IS_SAAS_PLATFORM = (process.env.NEXT_PUBLIC_PLATFORM_MODE || '').toLowerCase() === 'saas'

const API_BASE = (
  process.env.NEXT_PUBLIC_STRAPI_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === 'production' ? 'https://api.webfudge.in' : 'http://localhost:1338')
).replace(/\/$/, '')

const AppAccessContext = createContext(null)

/**
 * Which Webfudge apps the current organization has. On Internal every app counts as present.
 * Use it to hide links into another app (e.g. CRM tabs inside Projects) when it isn't added.
 */
export function useSaasApps() {
  const apps = useContext(AppAccessContext)
  return {
    ready: !IS_SAAS_PLATFORM || apps !== null,
    hasApp: (slug) => !IS_SAAS_PLATFORM || (apps !== null && Boolean(apps[slug]) && apps[slug].access !== 'locked'),
  }
}

const APP_NAMES = { crm: 'CRM', pm: 'Projects' }
const DAY_MS = 24 * 60 * 60 * 1000

const fmt = (value) =>
  value ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''

function Blocker({ icon: Icon, title, body, actionHref, actionLabel, secondaryHref, secondaryLabel }) {
  return (
    <div className="flex min-h-full items-center justify-center bg-[#FAFAF8] px-5 py-16">
      <div className="w-full max-w-md rounded-3xl border border-[#EDEDEA] bg-white p-8 text-center shadow-[0_30px_60px_-40px_rgba(0,0,0,.35)]">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFF1E8] text-[#B84A0B]">
          <Icon className="h-7 w-7" aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight text-[#0F0F0F]">{title}</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-[#5C5C5C]">{body}</p>
        <div className="mt-6 flex flex-col gap-2">
          {actionHref && (
            <a href={actionHref} className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-[#F5630F] px-6 font-semibold text-[#0F0F0F]">
              {actionLabel}
            </a>
          )}
          {secondaryHref && (
            <a href={secondaryHref} className="inline-flex min-h-[44px] items-center justify-center rounded-full px-6 text-[15px] font-semibold text-[#5C5C5C] hover:text-[#0F0F0F]">
              {secondaryLabel}
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * SaaS only: checks the organization's plan for this app and shows a trial banner, a read-only
 * banner, or a full-page message when the app is locked or not added. Internal deployments render
 * children untouched.
 */
export function SaasAccessGate({ app, children }) {
  const [state, setState] = useState(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!IS_SAAS_PLATFORM || !app) return
    let cancelled = false
    const load = async () => {
      const token = localStorage.getItem('auth-token')
      const orgId = localStorage.getItem('current-org-id')
      if (!token) return
      try {
        const res = await fetch(`${API_BASE}/api/saas/access`, {
          headers: { Authorization: `Bearer ${token}`, ...(orgId ? { 'X-Organization-Id': orgId } : {}) },
        })
        if (!res.ok) return
        const data = await res.json()
        if (!cancelled) setState(data)
      } catch {
        /* the app keeps working; the API itself enforces access */
      }
    }
    load()
    const onFocus = () => load()
    window.addEventListener('focus', onFocus)
    return () => {
      cancelled = true
      window.removeEventListener('focus', onFocus)
    }
  }, [app])

  if (!IS_SAAS_PLATFORM) return children
  if (!state) return <AppAccessContext.Provider value={null}>{children}</AppAccessContext.Provider>

  const accounts = getAppUrl('accounts')
  const name = APP_NAMES[app] || app
  const access = state.apps?.[app]
  const billingHref = `${accounts}/billing?app=${app}`

  if (!state.organization) {
    return (
      <Blocker
        icon={Sparkles}
        title="Set up your organization"
        body={`Create your organization in Webfudge Accounts to start using ${name}.`}
        actionHref={`${accounts}/setup/organization`}
        actionLabel="Set up organization"
      />
    )
  }

  if (!access) {
    return (
      <Blocker
        icon={Sparkles}
        title={`${state.organization.name} hasn’t added ${name} yet`}
        body={state.isAdmin ? `Start a free 14-day trial of ${name} — no card needed.` : `Ask an admin of ${state.organization.name} to add ${name}.`}
        actionHref={state.isAdmin ? billingHref : null}
        actionLabel="Start free trial"
        secondaryHref={`${accounts}/home`}
        secondaryLabel="Back to Webfudge Home"
      />
    )
  }

  if (access.access === 'locked') {
    return (
      <Blocker
        icon={Lock}
        title={`${name} is locked`}
        body={
          state.isAdmin
            ? `Choose a plan to unlock ${name} for ${state.organization.name}. Your data is kept until ${fmt(access.deleteAfter)}.`
            : `Ask an admin of ${state.organization.name} to choose a plan. Your data is kept until ${fmt(access.deleteAfter)}.`
        }
        actionHref={state.isAdmin ? billingHref : null}
        actionLabel="Choose a plan"
        secondaryHref={`${accounts}/home`}
        secondaryLabel="Back to Webfudge Home"
      />
    )
  }

  let banner = null
  if (access.access === 'read_only') {
    banner = {
      tone: 'bg-[#B42318] text-white',
      icon: Lock,
      text: `${name} is read-only — the ${access.state === 'trial_ended' ? 'trial' : 'plan'} ended on ${fmt(access.endsAt)}. It locks on ${fmt(access.lockAt)}.`,
      sticky: true,
    }
  } else if (access.state === 'trial' && !dismissed) {
    const soon = access.daysLeft <= 3
    banner = {
      tone: soon ? 'bg-[#0F0F0F] text-white' : 'bg-[#FFF1E8] text-[#5C3412]',
      icon: Clock,
      text: `${name} free trial · ${access.daysLeft} day${access.daysLeft === 1 ? '' : 's'} left (ends ${fmt(access.endsAt)})`,
      sticky: soon,
    }
  } else if (access.state === 'active' && access.cancelAtPeriodEnd && access.endsAt && new Date(access.endsAt) - Date.now() < 7 * DAY_MS && !dismissed) {
    banner = { tone: 'bg-[#FFF1E8] text-[#5C3412]', icon: Clock, text: `Your ${name} plan ends on ${fmt(access.endsAt)}.`, sticky: false }
  }

  return (
    <AppAccessContext.Provider value={state.apps || {}}>
      {banner && (
        <div role="status" className={`flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-2 text-sm ${banner.tone}`}>
          <banner.icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
          <span>{banner.text}</span>
          {state.isAdmin ? (
            <a href={billingHref} className="font-semibold underline underline-offset-2">
              Choose a plan
            </a>
          ) : (
            <span className="opacity-80">Ask an admin to choose a plan.</span>
          )}
          {!banner.sticky && (
            <button type="button" onClick={() => setDismissed(true)} className="ml-1 rounded p-1 opacity-70 hover:opacity-100" aria-label="Dismiss">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
      {children}
    </AppAccessContext.Provider>
  )
}

export default SaasAccessGate
