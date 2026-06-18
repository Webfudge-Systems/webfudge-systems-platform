'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Button,
  EmptyState,
  DashboardProgressRow,
} from '@webfudge/ui'
import HRDashboardInsightShell, { HRInsightCountBadge } from './HRDashboardInsightShell'
import { Clock } from 'lucide-react'
import { PENDING_APPROVALS } from '../../lib/mock-data/dashboard'

function approvalProgress(item) {
  if (item.overdue) return { percent: 100, barColor: 'red', avatarClassName: 'bg-red-500 text-white' }
  return { percent: 42, barColor: 'orange', avatarClassName: 'bg-orange-500 text-white' }
}

export default function PendingApprovalsWidget({ className = '' }) {
  const router = useRouter()
  const sorted = [...PENDING_APPROVALS].sort((a, b) => Number(b.overdue) - Number(a.overdue))
  const overdueCount = PENDING_APPROVALS.filter((a) => a.overdue).length

  return (
    <HRDashboardInsightShell
      fillHeight
      className={className}
      title="Pending approvals"
      badge={
        overdueCount > 0 ? (
          <HRInsightCountBadge tone="red">{overdueCount} overdue</HRInsightCountBadge>
        ) : (
          <HRInsightCountBadge tone="orange">{sorted.length}</HRInsightCountBadge>
        )
      }
      subtitle={
        overdueCount > 0 ? 'Leave & expenses awaiting action' : 'Leave and expense claims'
      }
      action={
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/leave')}
          className="!h-7 !px-2 text-[11px] font-semibold text-orange-600 hover:text-orange-700"
        >
          View all
        </Button>
      }
      panelClassName="flex min-h-0 flex-1 flex-col divide-y divide-gray-100/90 overflow-y-auto overscroll-contain [scrollbar-width:thin]"
    >
      {sorted.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="No pending approvals"
          description="Leave and expense requests will appear here."
          className="py-5"
        />
      ) : (
        sorted.map((item, index) => {
          const progress = approvalProgress(item)
          return (
            <Link
              key={`${item.title}-${index}`}
              href={item.href}
              className={`block w-full px-3 py-2 text-left transition-colors hover:bg-white/80 ${
                item.overdue ? 'bg-red-50/40' : ''
              }`}
            >
              <DashboardProgressRow
                label={item.title}
                meta={item.overdue ? 'Overdue' : 'Pending'}
                percent={progress.percent}
                avatarFallback={item.title.charAt(0).toUpperCase()}
                avatarClassName={progress.avatarClassName}
                barColor={progress.barColor}
                showPercent={false}
              />
            </Link>
          )
        })
      )}
    </HRDashboardInsightShell>
  )
}
