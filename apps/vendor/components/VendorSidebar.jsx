'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useSearchParams } from 'next/navigation'
import { SidebarProductBranding } from '@webfudge/ui'
import {
  LayoutDashboard,
  Building2,
  Repeat,
  Receipt,
  Users,
  PieChart,
  Boxes,
  PanelLeftClose,
  ChevronRight,
  Activity,
  Hourglass,
  AlertTriangle,
  Ban,
} from 'lucide-react'
import vendorApi from '../lib/api'
import { useVendorStaff } from './VendorStaffContext'
import { VENDOR_SITE } from '../lib/site'

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/' },
  { id: 'organizations', label: 'Organizations', icon: Building2, href: '/organizations' },
  { id: 'subscriptions', label: 'Subscriptions', icon: Repeat, href: '/subscriptions' },
  { id: 'billing', label: 'Billing', icon: Receipt, href: '/billing' },
  { id: 'users', label: 'Users', icon: Users, href: '/users' },
  { id: 'reports', label: 'Reports', icon: PieChart, href: '/reports' },
]

const TOOLS = [{ label: 'Apps & plans', icon: Boxes, href: '/apps' }]

export default function VendorSidebar({ collapsed = false, onToggle }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { status } = useVendorStaff()
  const [health, setHealth] = useState(null)

  useEffect(() => {
    if (status !== 'staff') return
    vendorApi
      .overview()
      .then((o) =>
        setHealth({
          trialsEnding: o.trialsEndingSoon?.length || 0,
          atRisk: o.kpis?.atRiskOrganizations || 0,
          suspended: o.stageCounts?.suspended || 0,
        })
      )
      .catch(() => setHealth(null))
  }, [status, pathname])

  const isActive = (href) => (href === '/' ? pathname === '/' : pathname.startsWith(href))

  const healthItems = [
    { label: 'Trials ending in 7 days', count: health?.trialsEnding, icon: Hourglass, href: '/subscriptions?tab=ending', tone: 'text-orange-600' },
    { label: 'Organizations at risk', count: health?.atRisk, icon: AlertTriangle, href: '/organizations?tab=at_risk', tone: 'text-amber-600' },
    { label: 'Suspended', count: health?.suspended, icon: Ban, href: '/organizations?tab=suspended', tone: 'text-red-600' },
  ]

  const sectionRule = (label) =>
    !collapsed && (
      <div className="mb-2 flex items-center gap-2 px-1">
        <div className="h-px flex-1 bg-white/25" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-brand-text-light">{label}</span>
        <div className="h-px flex-1 bg-white/25" />
      </div>
    )

  return (
    <div
      className={`${
        collapsed ? 'w-16' : 'w-64'
      } flex h-full min-h-0 flex-shrink-0 flex-col overflow-hidden border-r border-white/30 bg-white shadow-xl backdrop-blur-xl transition-[width] duration-300`}
    >
      <div className="shrink-0 px-4 pb-3 pt-4">
        <div className="flex items-center justify-between gap-2">
          <Link href="/" className="flex min-w-0 flex-1 items-center gap-2.5" aria-label={`${VENDOR_SITE.name} home`}>
            <Image
              src={VENDOR_SITE.logoPath}
              alt={VENDOR_SITE.brandName}
              width={44}
              height={44}
              className="h-11 w-11 shrink-0 object-contain"
              priority
            />
            <SidebarProductBranding productName={VENDOR_SITE.name} companyName={VENDOR_SITE.brandName} />
          </Link>
          <button
            type="button"
            onClick={onToggle}
            className="shrink-0 rounded-lg p-2 transition-colors hover:bg-gray-50"
            aria-label="Hide sidebar"
          >
            <PanelLeftClose className="h-5 w-5 text-brand-foreground" strokeWidth={1.75} />
          </button>
        </div>
        <div className="mt-3 h-px w-full bg-gradient-to-r from-transparent via-orange-400/50 to-transparent" aria-hidden />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        <div className="px-3 pb-2 pt-3">
          {sectionRule('Navigate')}
          <div className="grid grid-cols-2 gap-2.5">
            {NAV.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`relative flex min-h-[4.5rem] flex-col items-center justify-center gap-1.5 rounded-xl border px-2 py-3.5 shadow-md transition-all ${
                    active
                      ? 'border-brand-primary/40 bg-brand-primary text-white shadow-lg shadow-orange-500/25'
                      : 'border-white/30 bg-white/20 text-brand-foreground backdrop-blur-md hover:bg-white/35 hover:shadow-lg'
                  }`}
                >
                  <Icon className="h-6 w-6 shrink-0" strokeWidth={2} />
                  <span className="line-clamp-2 px-0.5 text-center text-xs font-semibold leading-snug">{item.label}</span>
                </Link>
              )
            })}
          </div>
        </div>

        <div className="px-3 py-2">
          {sectionRule('Health')}
          <div className="overflow-hidden rounded-xl border border-orange-200/80 bg-gradient-to-b from-orange-50/50 via-white to-white shadow-md ring-1 ring-orange-100/60">
            <div className="flex items-center gap-2 border-b border-orange-200/50 bg-gradient-to-r from-orange-500/10 via-orange-50/90 to-transparent px-3 py-2.5">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-orange-500/15 ring-1 ring-orange-300/40">
                <Activity className="h-4 w-4 text-orange-600" strokeWidth={2.25} />
              </span>
              <span className="truncate text-xs font-bold tracking-wide text-orange-900">Needs attention</span>
            </div>
            <div className="space-y-0.5 p-1.5">
              {healthItems.map((item) => {
                const Icon = item.icon
                const [path, query] = item.href.split('?')
                const tab = new URLSearchParams(query).get('tab')
                const active = pathname === path && searchParams.get('tab') === tab
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-colors ${
                      active ? 'bg-orange-50 font-semibold text-gray-900' : 'font-medium text-gray-700 hover:bg-orange-50/70'
                    }`}
                  >
                    <Icon className={`h-4 w-4 shrink-0 ${item.tone}`} />
                    <span className="flex-1 truncate">{item.label}</span>
                    <span
                      className={`min-w-[1.5rem] rounded-full px-1.5 py-0.5 text-center text-[11px] font-bold ${
                        item.count ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {health ? item.count : '·'}
                    </span>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>

        <div className="px-3 pb-4 pt-2">
          {sectionRule('Catalog')}
          <div className="overflow-hidden rounded-xl border border-gray-300 bg-white shadow-md ring-1 ring-black/[0.04]">
            <div className="flex items-center gap-1.5 border-b border-gray-200 bg-gray-50 px-3 py-2.5 text-xs font-semibold text-gray-900">
              <Boxes className="h-3.5 w-3.5 shrink-0 text-gray-600" />
              <span>Products</span>
            </div>
            <div className="space-y-0.5 p-2">
              {TOOLS.map((item) => {
                const Icon = item.icon
                const active = isActive(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`group/item flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                      active ? 'bg-gray-50 font-semibold text-gray-900' : 'font-medium text-gray-800 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-gray-700' : 'text-gray-500'}`} />
                    <span className="flex-1">{item.label}</span>
                    <ChevronRight className="h-4 w-4 text-gray-400 opacity-0 group-hover/item:opacity-100" />
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
