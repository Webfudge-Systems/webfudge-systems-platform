'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { SidebarProductBranding } from '@webfudge/ui'
import { PanelLeftClose, ChevronRight, Clock } from 'lucide-react'
import {
  ESS_NAVIGATE_TILES,
  ESS_PORTAL_TOOLS,
  ESS_SIDEBAR_SURFACE_CLASS,
  essTileIsActive,
  isEssNavItemActive,
} from '../../lib/navigation'
import { ESS_SITE } from '../../lib/site'

export default function ESSSidebar({ collapsed = false, onToggle }) {
  const pathname = usePathname()

  const sectionRule = (id) =>
    !collapsed && (
      <div className="flex items-center gap-2 px-1 mb-2">
        <div className="flex-1 h-px bg-white/25" />
        <span className="text-[10px] uppercase tracking-wider text-brand-text-light font-semibold">
          {id}
        </span>
        <div className="flex-1 h-px bg-white/25" />
      </div>
    )

  return (
    <div
      className={`${
        collapsed ? 'w-16' : 'w-64'
      } h-full min-h-0 ${ESS_SIDEBAR_SURFACE_CLASS} flex flex-col overflow-hidden transition-[width] duration-300 flex-shrink-0`}
    >
      <div className="shrink-0 px-4 pt-4 pb-3">
        <div
          className={`flex gap-2 ${
            collapsed ? 'flex-col items-center' : 'items-center justify-between'
          }`}
        >
          {collapsed ? (
            <Link href="/overview" className="flex shrink-0" aria-label={`${ESS_SITE.name} home`}>
              <Image
                src={ESS_SITE.logoPath}
                alt={ESS_SITE.brandName}
                width={32}
                height={32}
                className="h-8 w-8 object-contain"
                priority
              />
            </Link>
          ) : (
            <Link
              href="/overview"
              className="flex min-w-0 flex-1 items-center gap-2.5"
              aria-label={`${ESS_SITE.name} home`}
            >
              <Image
                src={ESS_SITE.logoPath}
                alt={ESS_SITE.brandName}
                width={44}
                height={44}
                className="h-11 w-11 shrink-0 object-contain"
                priority
              />
              <SidebarProductBranding
                productName={ESS_SITE.name}
                companyName={ESS_SITE.brandName}
              />
            </Link>
          )}
          <button
            type="button"
            onClick={onToggle}
            className="shrink-0 p-2 rounded-lg hover:bg-gray-50 transition-colors"
            aria-label="Hide sidebar"
          >
            <PanelLeftClose className="w-5 h-5 text-brand-foreground" strokeWidth={1.75} />
          </button>
        </div>
        {!collapsed ? (
          <div
            className="mt-3 h-px w-full bg-gradient-to-r from-transparent via-orange-400/50 to-transparent"
            aria-hidden
          />
        ) : null}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        <div className="px-3 pt-3 pb-2">
          {sectionRule('Navigate')}
          <div className={`grid gap-2.5 ${collapsed ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {ESS_NAVIGATE_TILES.map((item) => {
              const Icon = item.icon
              const active = essTileIsActive(pathname, item)
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`relative rounded-xl px-2 py-3.5 flex flex-col items-center justify-center gap-1.5 min-h-[4.5rem] transition-all border shadow-md ${
                    active
                      ? 'bg-brand-primary text-white border-brand-primary/40 shadow-lg shadow-orange-500/25'
                      : 'bg-white/20 backdrop-blur-md border-white/30 text-brand-foreground hover:bg-white/35 hover:shadow-lg'
                  }`}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className="w-6 h-6 shrink-0" strokeWidth={2} />
                  {!collapsed && (
                    <span className="text-xs font-semibold text-center leading-snug px-0.5 line-clamp-2">
                      {item.label}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        </div>

        {!collapsed && ESS_PORTAL_TOOLS.length > 0 && (
          <div className="px-3 pt-2 pb-4">
            {sectionRule('History')}
            <div className="rounded-xl border border-gray-300 bg-white shadow-md overflow-hidden ring-1 ring-black/[0.04]">
              <div className="flex items-center gap-1.5 px-3 py-2.5 border-b border-gray-200 bg-gray-50 text-xs font-semibold text-gray-900">
                <Clock className="w-3.5 h-3.5 shrink-0 text-gray-600" />
                <span>Your timeline</span>
              </div>
              <div className="p-2 space-y-0.5">
                {ESS_PORTAL_TOOLS.map((item) => {
                  const Icon = item.icon
                  const active = isEssNavItemActive(pathname, item.href)
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors group/item ${
                        active
                          ? 'bg-orange-50 text-orange-950 font-semibold ring-1 ring-orange-200/80'
                          : 'text-gray-800 font-medium hover:bg-gray-50'
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 shrink-0 ${active ? 'text-orange-600' : 'text-gray-500'}`}
                        strokeWidth={2}
                      />
                      <span className="flex-1">{item.label}</span>
                      <ChevronRight
                        className={`w-4 h-4 shrink-0 ${
                          active ? 'text-orange-400' : 'text-gray-400 opacity-0 group-hover/item:opacity-100'
                        }`}
                      />
                    </Link>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {collapsed && ESS_PORTAL_TOOLS.length > 0 && (
          <div className="px-2 py-2 flex flex-col items-center gap-2">
            {ESS_PORTAL_TOOLS.map((item) => {
              const Icon = item.icon
              const active = isEssNavItemActive(pathname, item.href)
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`p-3 rounded-xl border shadow-md transition-all ${
                    active
                      ? 'bg-brand-primary text-white border-brand-primary/40 shadow-lg shadow-orange-500/25'
                      : 'bg-white/20 border-white/30 text-brand-foreground hover:bg-white/35'
                  }`}
                  title={item.label}
                >
                  <Icon className="w-5 h-5" strokeWidth={2} />
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
