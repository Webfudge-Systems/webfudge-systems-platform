'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Check, ChevronsUpDown, Plus } from 'lucide-react'
import { useAuth } from '@webfudge/auth'
import { api } from '../../lib/saas'

const HubContext = createContext(null)

/**
 * SaaS account data shared by the sidebar and the account screens: the signed-in user, their
 * organizations (with app access) and invitations. Returns null outside SaaS mode.
 */
export function useHub() {
  return useContext(HubContext)
}

export function initials(name) {
  return String(name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')
}

const ORG_COLORS = ['#0F0F0F', '#2F6F73', '#6A45E0', '#B84A0B', '#1F4FFF', '#0E9F6E']
export const orgColor = (id) => ORG_COLORS[Number(id) % ORG_COLORS.length]

/** Loads /api/saas/home once for the whole console. Pages render inside the normal sidebar shell. */
export function HubProvider({ children }) {
  const { user, currentOrg } = useAuth()
  const [home, setHome] = useState(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      setError('')
      setHome(await api('/api/saas/home'))
    } catch (e) {
      setError(e.message)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const orgs = home?.organizations || []
  const current = orgs.find((o) => o.id === currentOrg?.id) || orgs[0] || null

  return (
    <HubContext.Provider value={{ home, error, loading: !home && !error, reload: load, orgs, currentOrg: current, user: home?.user || user }}>
      {children}
    </HubContext.Provider>
  )
}

export default HubProvider

function OrgBadge({ org, size = 'h-8 w-8' }) {
  return (
    <span className={`flex ${size} flex-shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white`} style={{ background: orgColor(org.id) }}>
      {initials(org.name)}
    </span>
  )
}

/** Organization switcher for the sidebar (SaaS). Switching reloads so every screen reads the new org. */
export function SidebarOrgSwitcher({ collapsed = false }) {
  const hub = useHub()
  const { switchOrg } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false)
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const current = hub?.currentOrg
  if (!current) return null

  const choose = (id) => {
    setOpen(false)
    if (id === current.id) return
    if (switchOrg(id)) window.location.reload()
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        title={collapsed ? current.name : undefined}
        className={`flex w-full items-center gap-2.5 rounded-xl border border-gray-200 bg-white text-left transition-colors hover:bg-gray-50 ${
          collapsed ? 'justify-center p-1.5' : 'px-2.5 py-2'
        }`}
      >
        <OrgBadge org={current} />
        {!collapsed && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-gray-900">{current.name}</span>
              <span className="block truncate text-xs capitalize text-gray-500">{current.role}</span>
            </span>
            <ChevronsUpDown className="h-4 w-4 flex-shrink-0 text-gray-400" aria-hidden="true" />
          </>
        )}
      </button>
      {open && (
        <div role="menu" className={`absolute z-50 mt-2 rounded-xl border border-gray-200 bg-white p-1.5 shadow-lg ${collapsed ? 'left-0 w-64' : 'left-0 right-0'}`}>
          <p className="px-2.5 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500">Organizations</p>
          {hub.orgs.map((o) => (
            <button
              key={o.id}
              role="menuitem"
              type="button"
              onClick={() => choose(o.id)}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-gray-50"
            >
              <OrgBadge org={o} size="h-7 w-7" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-gray-900">{o.name}</span>
                <span className="block text-xs capitalize text-gray-500">{o.role}</span>
              </span>
              {o.id === current.id && <Check className="h-4 w-4 text-orange-600" aria-label="Current" />}
            </button>
          ))}
          <Link
            href="/setup/organization"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="mt-1 flex items-center gap-2.5 rounded-lg border-t border-gray-100 px-2.5 py-2.5 text-sm font-medium text-orange-600 hover:bg-orange-50"
          >
            <Plus className="h-4 w-4" aria-hidden="true" /> Create organization
          </Link>
        </div>
      )}
    </div>
  )
}
