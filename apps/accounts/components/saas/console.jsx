'use client'

/**
 * SaaS account screens (Home, Apps & billing, invoices, profile) drawn with the same building blocks
 * as the internal Accounts console: the sidebar shell, AccountsPageHeader and @webfudge/ui cards.
 * Props mirror ./ui so pages can switch between the two without other changes.
 */

import { AlertCircle, CheckCircle2, Info } from 'lucide-react'
import { Badge as UiBadge, Card as UiCard } from '@webfudge/ui'
import AccountsPageHeader from '../AccountsPageHeader'
import { Spinner } from './ui'

export { AppIcon, Modal, PasswordInput, Spinner, TextInput } from './ui'

const cx = (...c) => c.filter(Boolean).join(' ')

/** Page frame used by every internal Accounts screen: padded white canvas with the shared header. */
export function PageFrame({ title, subtitle, breadcrumb, actions, children, showBack }) {
  return (
    <div className="p-4 space-y-4 bg-white min-h-full">
      <AccountsPageHeader title={title} subtitle={subtitle} breadcrumb={breadcrumb} showSearch showBack={showBack} />
      {actions ? <div className="flex flex-wrap items-center justify-end gap-2">{actions}</div> : null}
      {children}
    </div>
  )
}

const BUTTON = {
  primary: 'bg-orange-500 text-white shadow-md hover:bg-orange-600',
  dark: 'bg-orange-500 text-white shadow-md hover:bg-orange-600',
  outline: 'border border-gray-300 bg-white text-gray-800 hover:bg-gray-50',
  ghost: 'text-orange-600 hover:bg-orange-50',
  danger: 'border border-red-200 bg-white text-red-600 hover:bg-red-50',
}

export function Button({ variant = 'primary', size = 'md', loading = false, className, children, disabled, ...props }) {
  const sizes = { sm: 'min-h-[36px] px-3 text-sm', md: 'min-h-[40px] px-4 text-sm', lg: 'min-h-[44px] px-5 text-base' }
  return (
    <button
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        BUTTON[variant] || BUTTON.primary,
        sizes[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  )
}

/** Same look as an internal <Card glass>. */
export function Card({ title, subtitle, actions, className, children }) {
  return (
    <UiCard glass title={title} subtitle={subtitle} actions={actions} className={className}>
      {children}
    </UiCard>
  )
}

const BADGE = { neutral: 'default', orange: 'orange', green: 'success', red: 'danger', blue: 'info', dark: 'gray' }

export function Badge({ tone = 'neutral', children }) {
  return (
    <UiBadge variant={BADGE[tone] || 'default'} size="sm">
      {children}
    </UiBadge>
  )
}

const ALERT = {
  error: ['border-red-200 bg-red-50 text-red-800', AlertCircle],
  success: ['border-green-200 bg-green-50 text-green-800', CheckCircle2],
  info: ['border-gray-200 bg-gray-50 text-gray-700', Info],
  warn: ['border-orange-200 bg-orange-50 text-orange-800', AlertCircle],
}

export function Alert({ tone = 'error', children, className }) {
  const [style, Icon] = ALERT[tone] || ALERT.error
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={cx('flex gap-2.5 rounded-xl border px-4 py-3 text-sm leading-relaxed', style, className)}>
      <Icon className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
      <div>{children}</div>
    </div>
  )
}

export function LoadingBlock() {
  return (
    <div className="flex justify-center py-20" role="status" aria-label="Loading">
      <Spinner className="h-6 w-6 text-orange-500" />
    </div>
  )
}
