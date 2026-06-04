'use client'

import { X } from 'lucide-react'
import { Button } from '@webfudge/ui'

export default function HRDrawer({ open, onClose, title, subtitle, children, footer, widthClass = 'max-w-lg' }) {
  if (!open) return null
  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose} aria-hidden />
      <div
        className={`fixed right-0 top-0 bottom-0 z-[60] w-full ${widthClass} bg-white shadow-xl flex flex-col`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="hr-drawer-title"
      >
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-6 py-4">
          <div className="min-w-0">
            <h2 id="hr-drawer-title" className="text-lg font-semibold text-gray-900">
              {title}
            </h2>
            {subtitle ? <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p> : null}
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-gray-50" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>
        {footer ? <div className="border-t border-gray-100 px-6 py-4 flex gap-2 justify-end">{footer}</div> : null}
      </div>
    </>
  )
}
