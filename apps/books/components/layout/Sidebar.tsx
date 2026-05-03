'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { clsx } from 'clsx'
import { Avatar } from '@webfudge/ui'
import { resolveUserDisplayName, resolveUserInitials, resolveUserRole, useAuth } from '@webfudge/auth'
import {
  Banknote,
  BarChart3,
  ChevronRight,
  FileText,
  Briefcase,
  Calculator,
  Clock3,
  HelpCircle,
  Home,
  Moon,
  Package,
  Plus,
  Receipt,
  Sun,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useBooksTheme } from '@/components/theme/BooksThemeProvider'

type SidebarProps = {
  onConfigureFeatures: () => void
}

type RailLink = {
  type: 'link'
  href: string
  icon: LucideIcon
  label: string
  isActive: (pathname: string) => boolean
}

export default function Sidebar({ onConfigureFeatures }: SidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { user } = useAuth()
  const { isDark, toggleTheme } = useBooksTheme()
  const collapsed = true
  const [quickOpen, setQuickOpen] = useState(false)
  const quickRef = useRef<HTMLDivElement | null>(null)

  const quickActionItems = useMemo(
    () =>
      [
        { label: 'Create Invoice', href: '/sales/invoices/new' },
        { label: 'Create Customer', href: '/sales/customers/new' },
        { label: 'Create Expense', href: '/purchases/expenses/new' },
        { label: 'Create Project', href: '/time-tracking/projects/new' },
      ] as const,
    []
  )

  useEffect(() => {
    const close = (e: MouseEvent) => {
      const t = e.target as Node
      if (quickRef.current && !quickRef.current.contains(t)) setQuickOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const primaryLinks: RailLink[] = [
    {
      type: 'link',
      href: '/home',
      icon: Home,
      label: 'Dashboard',
      isActive: (p) => p === '/home' || p === '/',
    },
    {
      type: 'link',
      href: '/items/all',
      icon: Package,
      label: 'Items',
      isActive: (p) => p.startsWith('/items'),
    },
    {
      type: 'link',
      href: '/banking',
      icon: Banknote,
      label: 'Banking',
      isActive: (p) => p.startsWith('/banking'),
    },
    {
      type: 'link',
      href: '/sales',
      icon: Receipt,
      label: 'Sales',
      isActive: (p) => p.startsWith('/sales'),
    },
    {
      type: 'link',
      href: '/purchases',
      icon: Briefcase,
      label: 'Purchases',
      isActive: (p) => p.startsWith('/purchases'),
    },
    {
      type: 'link',
      href: '/time-tracking/projects',
      icon: Clock3,
      label: 'Time Tracking',
      isActive: (p) => p.startsWith('/time-tracking'),
    },
    {
      type: 'link',
      href: '/accountant',
      icon: Calculator,
      label: 'Accountant',
      isActive: (p) => p.startsWith('/accountant'),
    },
    {
      type: 'link',
      href: '/reports',
      icon: BarChart3,
      label: 'Reports',
      isActive: (p) => p.startsWith('/reports'),
    },
    {
      type: 'link',
      href: '/documents',
      icon: FileText,
      label: 'Documents',
      isActive: (p) => p.startsWith('/documents'),
    },
  ]

  const railBtnClass = (active: boolean) =>
    active
      ? 'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EA580C] text-white shadow-[0_0_0_1px_rgba(234,88,12,0.35)]'
      : 'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--books-text-secondary)] transition-colors hover:bg-[var(--books-bg-elevated)] hover:text-[var(--books-text-primary)]'

  /** Shared rail chrome; overflow per-shell (nav scrolls when viewport is short). */
  const railPillBaseClass = clsx('books-shell-surface books-shell-surface--rail border-0')

  /** Icon row inside a shared rail pill (theme / quick) — matches help+avatar grouping. */
  const railPillIconBtnClass = (pressed: boolean) =>
    clsx(
      'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors',
      pressed
        ? 'bg-[var(--books-bg-elevated)] text-[var(--books-text-primary)]'
        : 'text-[var(--books-text-secondary)] hover:bg-[var(--books-bg-elevated)] hover:text-[var(--books-text-primary)]'
    )

  /** Shorter top pill (moon / +): smaller targets + less vertical chrome */
  const railTopIconBtnClass = (pressed: boolean) =>
    clsx(
      'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors',
      pressed
        ? 'bg-[var(--books-bg-elevated)] text-[var(--books-text-primary)]'
        : 'text-[var(--books-text-secondary)] hover:bg-[var(--books-bg-elevated)] hover:text-[var(--books-text-primary)]'
    )

  const sidebarWidth = 'w-16'

  return (
    <aside
      className={`books-hide-scrollbar relative z-40 flex h-full min-h-0 shrink-0 flex-col items-center gap-0 overflow-y-auto overflow-x-hidden bg-transparent px-3 py-2 pb-4 sm:py-2.5 ${sidebarWidth}`}
    >
      <div className="flex w-full shrink-0 flex-col items-center gap-2 pt-2 sm:pt-3">
        <div
          className={clsx(
            railPillBaseClass,
            'flex w-full flex-col items-center gap-1.5 overflow-hidden px-2 py-2 sm:gap-2 sm:py-2'
          )}
        >
          <button
            type="button"
            onClick={toggleTheme}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            className={railTopIconBtnClass(false)}
          >
            {isDark ? (
              <Moon className="h-4 w-4" aria-hidden />
            ) : (
              <Sun className="h-4 w-4 text-[#EA580C]" aria-hidden />
            )}
          </button>

          <div className="relative flex justify-center" ref={quickRef}>
            <button
              type="button"
              title="Quick actions"
              onClick={() => setQuickOpen((v) => !v)}
              className={railTopIconBtnClass(quickOpen)}
            >
              <Plus className="h-4 w-4" aria-hidden />
            </button>
          {quickOpen ? (
            <div className="absolute left-full top-0 z-[120] ml-2 w-56 overflow-hidden rounded-xl border-[0.5px] border-[color:var(--books-border)] bg-[var(--books-bg-card)] py-1 shadow-xl">
              <p className="border-b border-[color:var(--books-border)] px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--books-text-secondary)]">
                Quick actions
              </p>
              {quickActionItems.map((item) => (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => {
                    setQuickOpen(false)
                    router.push(item.href)
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-[var(--books-text-primary)] hover:bg-[var(--books-bg-elevated)]"
                >
                  <ChevronRight className="h-4 w-4 text-[var(--books-text-tertiary)]" aria-hidden />
                  {item.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setQuickOpen(false)
                  onConfigureFeatures()
                }}
                className="flex w-full items-center gap-2 border-t border-[color:var(--books-border)] px-3 py-2.5 text-left text-sm text-[var(--books-text-primary)] hover:bg-[var(--books-bg-elevated)]"
              >
                <ChevronRight className="h-4 w-4 text-[var(--books-text-tertiary)]" aria-hidden />
                Configure features
              </button>
            </div>
          ) : null}
          </div>
        </div>
      </div>

      {/* Nav + utility pills: natural height; <aside> scrolls if viewport is short (scrollbar hidden). */}
      <div className="mt-4 flex w-full shrink-0 flex-col gap-3 sm:mt-5">
        <div
          className={clsx(
            railPillBaseClass,
            'flex w-full shrink-0 flex-col px-1.5 py-2.5 sm:py-2.5'
          )}
        >
          <nav className="flex flex-col gap-0.5" aria-label="Main">
            {primaryLinks.map((item, i) => {
              const Icon = item.icon
              const active = item.isActive(pathname)
              const showDivider = i === 2 || i === 4
              return (
                <div key={item.href}>
                  {showDivider ? <div className="my-1 h-px bg-[color:var(--books-border)]" /> : null}
                  <Link
                    href={item.href}
                    title={item.label}
                    className={`flex items-center gap-2 rounded-lg px-0 ${collapsed ? 'justify-center' : 'justify-start'} py-1`}
                    aria-current={active ? 'page' : undefined}
                  >
                    <span className={railBtnClass(active)}>
                      <Icon className={clsx('h-3.5 w-3.5', active && 'stroke-[1.75]')} aria-hidden />
                    </span>
                    {!collapsed ? (
                      <span
                        className={`text-sm ${active ? 'font-medium text-[#EA580C]' : 'text-[var(--books-text-secondary)]'}`}
                      >
                        {item.label}
                      </span>
                    ) : null}
                  </Link>
                </div>
              )
            })}
          </nav>
        </div>

        {/* Utilities: help + avatar */}
        <div className="w-full shrink-0">
          <div
            className={clsx(
              railPillBaseClass,
              'flex flex-col items-center overflow-hidden px-2 py-2 sm:py-2',
              collapsed ? 'gap-1.5' : 'gap-2'
            )}
          >
            <button type="button" title="Help" className={railTopIconBtnClass(false)}>
              <HelpCircle className="h-4 w-4" aria-hidden />
            </button>
            <div
              className="flex items-center gap-2"
              title={`${resolveUserDisplayName(user)} · ${resolveUserRole(user)}`}
            >
              <Avatar
                shape="circle"
                fallback={resolveUserInitials(user)}
                alt={resolveUserDisplayName(user)}
                size="sm"
                className="h-8 w-8 border-0 bg-[#EA580C] font-semibold text-white"
              />
              {!collapsed ? (
                <span className="text-sm font-medium text-[var(--books-text-primary)]">{resolveUserInitials(user)}</span>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
