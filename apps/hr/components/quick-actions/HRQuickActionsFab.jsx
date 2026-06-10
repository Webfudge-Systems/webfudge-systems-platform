'use client'

import { useState, useEffect, useRef } from 'react'
import { Plus, ChevronRight, X } from 'lucide-react'
import { HR_QUICK_ACTION_ITEMS } from '../../lib/navigation'
import { useHRQuickActions } from './HRQuickActionsContext'

const QUICK_ACTION_STYLES = {
  'add-employee': {
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
  },
  'apply-leave': {
    color: 'text-sky-600',
    bgColor: 'bg-sky-50',
    borderColor: 'border-sky-200',
  },
  'new-expense': {
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
  },
  'post-job': {
    color: 'text-violet-600',
    bgColor: 'bg-violet-50',
    borderColor: 'border-violet-200',
  },
}

export default function HRQuickActionsFab() {
  const { openQuickAction } = useHRQuickActions()
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
    return undefined
  }, [open])

  if (HR_QUICK_ACTION_ITEMS.length === 0) return null

  const handleAction = (actionId) => {
    setOpen(false)
    openQuickAction(actionId)
  }

  return (
    <div ref={rootRef} className="fixed bottom-5 right-5 z-[200] flex flex-col items-end gap-2">
      {open && (
        <div className="w-56 rounded-xl border border-gray-200 bg-white shadow-2xl overflow-hidden max-h-[min(70vh,24rem)] overflow-y-auto">
          <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
              Quick actions
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md p-1 text-gray-400 hover:bg-gray-50 hover:text-gray-600"
              aria-label="Close"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="p-1.5">
            {HR_QUICK_ACTION_ITEMS.map((item) => {
              const QIcon = item.icon
              const styles = QUICK_ACTION_STYLES[item.action] ?? QUICK_ACTION_STYLES['add-employee']
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleAction(item.action)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-gray-800 transition-colors hover:bg-gray-50"
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${styles.bgColor} ${styles.borderColor}`}
                  >
                    <QIcon className={`h-4 w-4 ${styles.color}`} />
                  </div>
                  <span className="flex-1 font-medium">{item.label}</span>
                  <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
                </button>
              )
            })}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/30 transition-all hover:scale-105 hover:shadow-xl ${
          open ? 'rotate-45' : ''
        }`}
        aria-expanded={open}
        aria-label={open ? 'Close quick actions' : 'Quick actions'}
        title="Quick actions"
      >
        <Plus className="h-6 w-6" strokeWidth={2.5} />
      </button>
    </div>
  )
}
