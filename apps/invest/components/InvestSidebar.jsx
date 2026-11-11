'use client'

import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { LoadingSpinner, SidebarProductBranding } from '@webfudge/ui'
import {
  LayoutDashboard,
  Briefcase,
  ArrowLeftRight,
  CalendarClock,
  PanelLeftClose,
  Plus,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Target,
  ShieldCheck,
} from 'lucide-react'
import { INVEST_SITE } from '../lib/site'
import { KIND_COLORS, formatPct } from '../lib/format'
import { useInvest } from './InvestDataProvider'
import TransactionModal from './TransactionModal'
import SipModal from './SipModal'

const NAV = [
  { id: 'dashboard', label: 'Portfolio', icon: LayoutDashboard, href: '/' },
  { id: 'holdings', label: 'Holdings', icon: Briefcase, href: '/holdings' },
  { id: 'transactions', label: 'Transactions', icon: ArrowLeftRight, href: '/transactions' },
  { id: 'sips', label: 'SIPs', icon: CalendarClock, href: '/sips' },
]

export default function InvestSidebar({ collapsed = false, onToggle }) {
  const pathname = usePathname()
  const { portfolio, loading, refreshPrices, refreshing } = useInvest()
  const [showAll, setShowAll] = useState(false)
  const [modal, setModal] = useState(null) // 'tx' | 'sip'

  const isActive = (href) => (href === '/' ? pathname === '/' : pathname.startsWith(href))

  const holdings = useMemo(
    () => portfolio.holdings.filter((h) => h.isOpen).sort((a, b) => b.currentValue - a.currentValue),
    [portfolio.holdings]
  )
  const shown = showAll ? holdings : holdings.slice(0, 5)

  const sectionRule = (label) =>
    !collapsed && (
      <div className="flex items-center gap-2 px-1 mb-2">
        <div className="flex-1 h-px bg-white/25" />
        <span className="text-[10px] uppercase tracking-wider text-brand-text-light font-semibold">{label}</span>
        <div className="flex-1 h-px bg-white/25" />
      </div>
    )

  const tools = [
    { label: 'Add transaction', icon: Plus, onClick: () => setModal('tx') },
    { label: 'New SIP', icon: CalendarClock, onClick: () => setModal('sip') },
  ]

  return (
    <div
      className={`${collapsed ? 'w-16' : 'w-64'} h-full min-h-0 bg-white backdrop-blur-xl border-r border-white/30 flex flex-col shadow-xl overflow-hidden transition-[width] duration-300 flex-shrink-0`}
    >
      <div className="shrink-0 px-4 pt-4 pb-3">
        <div className={`flex gap-2 ${collapsed ? 'flex-col items-center' : 'items-center justify-between'}`}>
          <Link href="/" className={collapsed ? 'flex shrink-0' : 'flex min-w-0 flex-1 items-center gap-2.5'} aria-label={`${INVEST_SITE.name} home`}>
            <Image
              src={INVEST_SITE.logoPath}
              alt={INVEST_SITE.brandName}
              width={collapsed ? 32 : 44}
              height={collapsed ? 32 : 44}
              className={collapsed ? 'h-8 w-8 object-contain' : 'h-11 w-11 shrink-0 object-contain'}
              priority
            />
            {!collapsed ? <SidebarProductBranding productName={INVEST_SITE.name} companyName={INVEST_SITE.brandName} /> : null}
          </Link>
          <button type="button" onClick={onToggle} className="shrink-0 p-2 rounded-lg hover:bg-gray-50 transition-colors" aria-label="Hide sidebar">
            <PanelLeftClose className="w-5 h-5 text-brand-foreground" strokeWidth={1.75} />
          </button>
        </div>
        {!collapsed ? <div className="mt-3 h-px w-full bg-gradient-to-r from-transparent via-orange-400/50 to-transparent" aria-hidden /> : null}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        <div className="px-3 pt-3 pb-2">
          {sectionRule('Navigate')}
          <div className={`grid gap-2.5 ${collapsed ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {NAV.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  title={collapsed ? item.label : undefined}
                  className={`relative rounded-xl px-2 py-3.5 flex flex-col items-center justify-center gap-1.5 min-h-[4.5rem] transition-all border shadow-md ${
                    active
                      ? 'bg-brand-primary text-white border-brand-primary/40 shadow-lg shadow-orange-500/25'
                      : 'bg-white/20 backdrop-blur-md border-white/30 text-brand-foreground hover:bg-white/35 hover:shadow-lg'
                  }`}
                >
                  <Icon className="w-6 h-6 shrink-0" strokeWidth={2} />
                  {!collapsed && <span className="text-xs font-semibold text-center leading-snug px-0.5 line-clamp-2">{item.label}</span>}
                </Link>
              )
            })}
          </div>
        </div>

        {!collapsed && (
          <div className="px-3 py-2 relative z-0">
            {sectionRule('Holdings')}
            <div className="rounded-xl border border-orange-200/80 bg-gradient-to-b from-orange-50/50 via-white to-white shadow-md overflow-hidden ring-1 ring-orange-100/60">
              <div className="flex items-center justify-between border-b border-orange-200/50 bg-gradient-to-r from-orange-500/12 via-orange-50/90 to-transparent px-3 py-2.5">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-orange-500/15 ring-1 ring-orange-300/40">
                    <Briefcase className="h-4 w-4 text-orange-600" strokeWidth={2.25} />
                  </span>
                  <span className="truncate text-xs font-bold tracking-wide text-orange-900">Open holdings</span>
                </span>
                <button
                  type="button"
                  onClick={() => setModal('tx')}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-orange-500 text-white shadow-sm shadow-orange-500/30 transition-colors hover:bg-orange-600"
                  title="Add transaction"
                  aria-label="Add transaction"
                >
                  <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                </button>
              </div>
              <div className="px-1.5 py-1.5">
                {loading ? (
                  <div className="flex justify-center py-6">
                    <LoadingSpinner size="sm" />
                  </div>
                ) : holdings.length === 0 ? (
                  <div className="px-3 py-6 text-center">
                    <p className="text-[11px] font-medium text-gray-700">No holdings yet</p>
                    <p className="mt-1 text-[11px] leading-snug text-gray-500">Add a transaction to start tracking.</p>
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {shown.map((h) => {
                      const active = pathname === `/holdings/${h.id}`
                      const pct = h.unrealisedPct
                      return (
                        <Link
                          key={h.id}
                          href={`/holdings/${h.id}`}
                          className={`flex items-center gap-2.5 rounded-lg border-l-[3px] py-2 pl-2 pr-2 transition-colors ${
                            active ? 'border-l-orange-500 bg-orange-100/70 shadow-sm shadow-orange-500/10' : 'border-l-transparent hover:border-l-orange-300/80 hover:bg-orange-50/80'
                          }`}
                        >
                          <span
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white shadow-sm"
                            style={{ background: KIND_COLORS[h.instrument.kind] || KIND_COLORS.other }}
                            aria-hidden
                          >
                            {(h.instrument.symbol || h.instrument.name || '?').charAt(0).toUpperCase()}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className={`block truncate text-sm font-medium ${active ? 'text-orange-950' : 'text-gray-800'}`}>
                              {h.instrument.symbol || h.instrument.name}
                            </span>
                            <span className={`block text-[11px] tabular-nums ${pct > 0 ? 'text-emerald-700' : pct < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                              {pct == null ? 'No price yet' : `${pct > 0 ? '▲' : pct < 0 ? '▼' : '•'} ${formatPct(pct)}`}
                            </span>
                          </span>
                        </Link>
                      )
                    })}
                  </div>
                )}
                {holdings.length > 5 ? (
                  <button
                    type="button"
                    onClick={() => setShowAll((v) => !v)}
                    className="mt-1 flex w-full items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-orange-700 hover:bg-orange-50"
                  >
                    {showAll ? (
                      <>
                        Show less <ChevronUp className="h-3.5 w-3.5" />
                      </>
                    ) : (
                      <>
                        Show all {holdings.length} <ChevronDown className="h-3.5 w-3.5" />
                      </>
                    )}
                  </button>
                ) : null}
                <div className="px-1 pb-1 pt-1">
                  <Link
                    href="/holdings"
                    className="flex w-full items-center gap-2 rounded-lg border border-orange-200/70 bg-white px-3 py-2 text-[11px] font-semibold text-orange-800 transition-colors hover:border-orange-300 hover:bg-orange-50"
                  >
                    <Briefcase className="h-3.5 w-3.5 shrink-0 text-orange-600" />
                    <span>All holdings</span>
                    <ChevronRight className="ml-auto h-3.5 w-3.5 text-orange-500" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {!collapsed && (
          <div className="px-3 pt-2 pb-2">
            {sectionRule('Tools')}
            <div className="rounded-xl border border-gray-300 bg-white shadow-md overflow-hidden ring-1 ring-black/[0.04]">
              <div className="flex items-center gap-1.5 px-3 py-2.5 border-b border-gray-200 bg-gray-50 text-xs font-semibold text-gray-900">
                <Target className="w-3.5 h-3.5 shrink-0 text-gray-600" />
                <span>Portfolio tools</span>
              </div>
              <div className="p-2 space-y-0.5">
                {tools.map((item) => {
                  const Icon = item.icon
                  return (
                    <button type="button" key={item.label} onClick={item.onClick} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-gray-800 font-medium hover:bg-gray-50 transition-colors group/item">
                      <Icon className="w-4 h-4 shrink-0 text-gray-500" />
                      <span className="flex-1">{item.label}</span>
                      <ChevronRight className="w-4 h-4 text-gray-400 opacity-0 group-hover/item:opacity-100" />
                    </button>
                  )
                })}
                <button
                  type="button"
                  onClick={() => refreshPrices(true)}
                  disabled={refreshing}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-gray-800 font-medium hover:bg-gray-50 transition-colors disabled:opacity-60"
                >
                  <RefreshCw className={`w-4 h-4 shrink-0 text-gray-500 ${refreshing ? 'animate-spin' : ''}`} />
                  <span className="flex-1">{refreshing ? 'Refreshing prices…' : 'Refresh prices'}</span>
                </button>
              </div>
            </div>
            <p className="mt-3 flex items-center gap-1.5 px-1 text-[11px] text-gray-500">
              <ShieldCheck className="h-3.5 w-3.5 text-orange-600" /> Internal only · finance access list
            </p>
          </div>
        )}
      </div>
      {/* Portaled: the sidebar's backdrop-blur would otherwise trap the fixed-position modal. */}
      {modal && typeof document !== 'undefined'
        ? createPortal(
            modal === 'tx' ? <TransactionModal isOpen onClose={() => setModal(null)} /> : <SipModal isOpen onClose={() => setModal(null)} />,
            document.body
          )
        : null}
    </div>
  )
}
