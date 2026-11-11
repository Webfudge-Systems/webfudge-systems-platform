'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { SidebarProductBranding } from '@webfudge/ui'
import { useAuth, resolveUserDisplayName } from '@webfudge/auth'
import { LayoutDashboard, Briefcase, ArrowLeftRight, CalendarClock, PanelLeftClose, LogOut, ShieldCheck } from 'lucide-react'
import { INVEST_SITE } from '../lib/site'

const NAV = [
  { id: 'dashboard', label: 'Portfolio', icon: LayoutDashboard, href: '/' },
  { id: 'holdings', label: 'Holdings', icon: Briefcase, href: '/holdings' },
  { id: 'transactions', label: 'Transactions', icon: ArrowLeftRight, href: '/transactions' },
  { id: 'sips', label: 'SIPs', icon: CalendarClock, href: '/sips' },
]

export default function InvestSidebar({ onToggle }) {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  const isActive = (href) => (href === '/' ? pathname === '/' : pathname.startsWith(href))

  return (
    <div className="w-64 h-full min-h-0 bg-white border-r border-gray-100 flex flex-col shadow-xl overflow-hidden flex-shrink-0">
      <div className="shrink-0 px-4 pt-4 pb-3">
        <div className="flex items-center justify-between gap-2">
          <Link href="/" className="flex min-w-0 flex-1 items-center gap-2.5" aria-label={`${INVEST_SITE.name} home`}>
            <Image src={INVEST_SITE.logoPath} alt={INVEST_SITE.brandName} width={44} height={44} className="h-11 w-11 shrink-0 object-contain" priority />
            <SidebarProductBranding productName={INVEST_SITE.name} companyName={INVEST_SITE.brandName} />
          </Link>
          <button type="button" onClick={onToggle} className="shrink-0 p-2 rounded-lg hover:bg-gray-50 transition-colors" aria-label="Hide sidebar">
            <PanelLeftClose className="w-5 h-5 text-brand-foreground" strokeWidth={1.75} />
          </button>
        </div>
        <div className="mt-3 h-px w-full bg-gradient-to-r from-transparent via-orange-400/50 to-transparent" aria-hidden />
      </div>

      <nav className="flex-1 min-h-0 overflow-y-auto px-3 pt-3 pb-2">
        <div className="grid grid-cols-2 gap-2.5">
          {NAV.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            return (
              <Link
                key={item.id}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`rounded-xl px-2 py-3.5 flex flex-col items-center justify-center gap-1.5 min-h-[4.5rem] transition-all border shadow-md ${
                  active
                    ? 'bg-brand-primary text-white border-brand-primary/40 shadow-lg shadow-orange-500/25'
                    : 'bg-white border-gray-100 text-brand-foreground hover:bg-orange-50/60 hover:shadow-lg'
                }`}
              >
                <Icon className="w-6 h-6 shrink-0" strokeWidth={2} />
                <span className="text-xs font-semibold text-center leading-snug">{item.label}</span>
              </Link>
            )
          })}
        </div>

        <div className="mt-5 rounded-xl border border-orange-200/80 bg-orange-50/40 px-3 py-3 text-[11px] leading-relaxed text-gray-600">
          <p className="flex items-center gap-1.5 font-semibold text-orange-900">
            <ShieldCheck className="h-3.5 w-3.5" /> Internal only
          </p>
          <p className="mt-1">Webfudge&apos;s own investments. Visible only to the finance access list.</p>
        </div>
      </nav>

      <div className="shrink-0 border-t border-gray-100 px-4 py-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-gray-900">{resolveUserDisplayName(user) || user?.email}</p>
          <p className="truncate text-xs text-gray-500">{user?.email}</p>
        </div>
        <button type="button" onClick={logout} className="shrink-0 p-2 rounded-lg text-gray-500 hover:bg-gray-50 hover:text-gray-900" aria-label="Sign out" title="Sign out">
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
