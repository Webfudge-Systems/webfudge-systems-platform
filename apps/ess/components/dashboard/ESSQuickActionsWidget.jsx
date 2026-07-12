'use client'

import Link from 'next/link'
import { Button, DashboardInsightShell } from '@webfudge/ui'
import { CalendarCheck, CalendarOff, Wallet } from 'lucide-react'

const ACTIONS = [
  { href: '/leave', label: 'Apply leave', icon: CalendarOff, variant: 'primary' },
  { href: '/attendance', label: 'Clock in / out', icon: CalendarCheck, variant: 'secondary' },
  { href: '/payroll', label: 'View payslip', icon: Wallet, variant: 'secondary' },
]

export default function ESSQuickActionsWidget({ className = '' }) {
  return (
    <DashboardInsightShell
      className={className}
      title="Quick actions"
      subtitle="Common self-service tasks"
      panelClassName="p-3"
    >
      <div className="flex flex-wrap gap-2">
        {ACTIONS.map((action) => {
          const Icon = action.icon
          return (
            <Button
              key={action.href}
              as={Link}
              href={action.href}
              variant={action.variant}
              className={action.variant === 'primary' ? 'bg-orange-500 hover:bg-orange-600' : ''}
            >
              <Icon className="mr-1.5 h-4 w-4" strokeWidth={2} />
              {action.label}
            </Button>
          )
        })}
      </div>
    </DashboardInsightShell>
  )
}
