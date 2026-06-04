'use client'

import { HR_GLASS_SURFACE_CLASS } from '../../lib/navigation'

/** Shared dashboard / widget surface — matches topbar & sidebar glass */
export const HR_GLASS_CARD_CLASS = `${HR_GLASS_SURFACE_CLASS} rounded-2xl border border-white/40 shadow-xl ring-1 ring-orange-100/30`

export default function HRGlassCard({ children, className = '', as: Tag = 'div', ...props }) {
  return (
    <Tag className={`${HR_GLASS_CARD_CLASS} p-5 sm:p-6 ${className}`} {...props}>
      {children}
    </Tag>
  )
}
