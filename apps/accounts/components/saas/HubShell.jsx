'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ChevronDown, Grid3X3, LogOut, Plus, User, Check, Shield } from 'lucide-react'
import { useAuth } from '@webfudge/auth'
import { api, APP_META, openAppUrl } from '../../lib/saas'
import { AppIcon, FullPageSpinner } from './ui'

const HubContext = createContext(null)

/** Data for the Home hub pages: the signed-in user, their organizations (with app access) and invitations. */
export function useHub() {
  return useContext(HubContext)
}

function useOutsideClose(open, setOpen) {
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
  }, [open, setOpen])
  return ref
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

function OrgSwitcher({ orgs, current, onSwitch }) {
  const [open, setOpen] = useState(false)
  const ref = useOutsideClose(open, setOpen)
  if (!current) return null
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex min-h-[44px] max-w-[260px] items-center gap-2.5 rounded-xl border border-[#EDEDEA] bg-[#FAFAF8] py-1.5 pl-1.5 pr-3 text-left hover:bg-[#F4F4F2]"
      >
        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white" style={{ background: orgColor(current.id) }}>
          {initials(current.name)}
        </span>
        <span className="truncate text-[15px] font-semibold">{current.name}</span>
        <ChevronDown className="h-4 w-4 flex-shrink-0 text-[#5C5C5C]" aria-hidden="true" />
      </button>
      {open && (
        <div role="menu" className="absolute left-0 top-full z-40 mt-2 w-72 rounded-2xl border border-[#EDEDEA] bg-white p-2 shadow-[0_20px_50px_-20px_rgba(0,0,0,.35)]">
          <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#5C5C5C]">Your organizations</p>
          {orgs.map((o) => (
            <button
              key={o.id}
              role="menuitem"
              type="button"
              onClick={() => {
                onSwitch(o.id)
                setOpen(false)
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-[#F4F4F2]"
            >
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white" style={{ background: orgColor(o.id) }}>
                {initials(o.name)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{o.name}</span>
                <span className="block text-xs text-[#5C5C5C]">{o.role}</span>
              </span>
              {o.id === current.id && <Check className="h-4 w-4 text-[#B84A0B]" aria-label="Current" />}
            </button>
          ))}
          <Link href="/setup/organization" role="menuitem" className="mt-1 flex items-center gap-3 rounded-xl border-t border-[#F1F1EE] px-3 py-3 text-sm font-semibold hover:bg-[#F4F4F2]">
            <Plus className="h-4 w-4" aria-hidden="true" /> Create an organization
          </Link>
        </div>
      )}
    </div>
  )
}

function AppLauncher({ org }) {
  const [open, setOpen] = useState(false)
  const ref = useOutsideClose(open, setOpen)
  const apps = (org?.apps || []).filter((a) => APP_META[a.slug])
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label="Open app launcher" className="flex h-11 w-11 items-center justify-center rounded-xl text-[#3A3A3A] hover:bg-[#F4F4F2]">
        <Grid3X3 className="h-5 w-5" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-40 mt-2 w-72 rounded-2xl border border-[#EDEDEA] bg-white p-4 shadow-[0_20px_50px_-20px_rgba(0,0,0,.35)]">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-[#5C5C5C]">{org?.name}</p>
          <div className="grid grid-cols-3 gap-2 text-center">
            {apps.map((a) => {
              const href = openAppUrl(a.slug, org.id)
              const locked = a.access === 'locked'
              return (
                <a key={a.slug} href={locked ? '/billing' : href} className="rounded-xl p-2 hover:bg-[#F4F4F2]">
                  <AppIcon src={APP_META[a.slug].icon} size={48} tint={APP_META[a.slug].tint} className="mx-auto" />
                  <span className="mt-1.5 block text-[13px] font-medium">{APP_META[a.slug].name}</span>
                  {locked && <span className="block text-[11px] text-[#B42318]">Locked</span>}
                </a>
              )
            })}
            <Link href="/billing" className="rounded-xl p-2 hover:bg-[#F4F4F2]">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border-[1.5px] border-dashed border-[#CFCFCA] text-[#5C5C5C]">
                <Plus className="h-5 w-5" />
              </span>
              <span className="mt-1.5 block text-[13px] font-medium">Add app</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

function UserMenu({ user, onSignOut }) {
  const [open, setOpen] = useState(false)
  const ref = useOutsideClose(open, setOpen)
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label="Your account" className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F5630F] text-sm font-bold text-[#0F0F0F]">
        {initials(name)}
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-40 mt-2 w-64 rounded-2xl border border-[#EDEDEA] bg-white p-2 shadow-[0_20px_50px_-20px_rgba(0,0,0,.35)]">
          <div className="px-3 pb-2 pt-2">
            <p className="truncate text-sm font-semibold">{name}</p>
            <p className="truncate text-xs text-[#5C5C5C]">{user?.email}</p>
          </div>
          <Link role="menuitem" href="/profile" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-[#F4F4F2]">
            <User className="h-4 w-4" aria-hidden="true" /> Profile and password
          </Link>
          <Link role="menuitem" href="/" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-[#F4F4F2]">
            <Shield className="h-4 w-4" aria-hidden="true" /> Admin console
          </Link>
          <button role="menuitem" type="button" onClick={onSignOut} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-[#F4F4F2]">
            <LogOut className="h-4 w-4" aria-hidden="true" /> Sign out
          </button>
        </div>
      )}
    </div>
  )
}

const TABS = [
  { href: '/home', label: 'Home' },
  { href: '/billing', label: 'Apps & billing' },
  { href: '/users', label: 'Members' },
  { href: '/settings', label: 'Organization' },
  { href: '/profile', label: 'Profile' },
]

export default function HubShell({ children }) {
  const { user, currentOrg, switchOrg, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
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

  const signOut = () => {
    logout()
    router.replace('/login')
  }

  if (!home && !error) return <FullPageSpinner />

  return (
    <HubContext.Provider value={{ home, reload: load, orgs, currentOrg: current, user: home?.user || user }}>
      <div className="min-h-screen bg-[#FAFAF8] font-primary text-[#0F0F0F]">
        <header className="sticky top-0 z-30 border-b border-[#EDEDEA] bg-white/90 backdrop-blur print:hidden">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-2.5 sm:px-6">
            <Link href="/home" aria-label="Webfudge Accounts home">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/webfudge-mark-orange.svg" alt="Webfudge" className="h-8 w-auto" />
            </Link>
            <OrgSwitcher orgs={orgs} current={current} onSwitch={(id) => switchOrg(id)} />
            <div className="ml-auto flex items-center gap-1">
              <AppLauncher org={current} />
              <UserMenu user={home?.user || user} onSignOut={signOut} />
            </div>
          </div>
          <nav aria-label="Accounts" className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-3 sm:px-5">
            {TABS.map((t) => {
              const active = pathname === t.href || (t.href !== '/home' && pathname.startsWith(t.href))
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  aria-current={active ? 'page' : undefined}
                  className={`whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium ${active ? 'border-[#F5630F] text-[#0F0F0F]' : 'border-transparent text-[#5C5C5C] hover:text-[#0F0F0F]'}`}
                >
                  {t.label}
                </Link>
              )
            })}
          </nav>
        </header>
        <main className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6">
          {error ? (
            <div className="rounded-2xl bg-[#FDECEA] p-5 text-sm text-[#8A1C12]">
              {error}{' '}
              <button type="button" onClick={load} className="font-semibold underline">
                Try again
              </button>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </HubContext.Provider>
  )
}

