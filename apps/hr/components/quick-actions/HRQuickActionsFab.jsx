'use client'

import { QuickActionsFab } from '@webfudge/ui'
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

  const actions = HR_QUICK_ACTION_ITEMS.map((item) => {
    const styles = QUICK_ACTION_STYLES[item.action] ?? QUICK_ACTION_STYLES['add-employee']
    return {
      label: item.label,
      icon: item.icon,
      onClick: () => openQuickAction(item.action),
      ...styles,
    }
  })

  return <QuickActionsFab actions={actions} menuWidth="w-56" />
}
