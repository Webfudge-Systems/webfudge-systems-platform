'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Button,
  DashboardInsightShell,
  DashboardProgressRow,
  EmptyState,
  InsightCountBadge,
} from '@webfudge/ui'
import { Clock } from 'lucide-react'

export default function ESSPendingRequestsWidget({ requests = [], className = '' }) {
  const router = useRouter()

  return (
    <DashboardInsightShell
      className={className}
      title="Pending approvals"
      badge={
        requests.length > 0 ? (
          <InsightCountBadge tone="orange">{requests.length}</InsightCountBadge>
        ) : null
      }
      subtitle="Leave requests awaiting HR action"
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
      panelClassName="flex min-h-0 flex-col divide-y divide-gray-100/90 overflow-y-auto overscroll-contain [scrollbar-width:thin]"
    >
      {requests.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="No pending requests"
          description="Your leave requests awaiting approval will appear here."
          className="py-5"
        />
      ) : (
        requests.map((row) => (
          <Link
            key={row.id}
            href="/leave"
            className="block w-full px-3 py-2.5 text-left transition-colors hover:bg-white/80"
          >
            <DashboardProgressRow
              label={row.type}
              meta={`${row.days} day(s)`}
              percent={55}
              avatarFallback={row.type.charAt(0).toUpperCase()}
              avatarClassName="bg-orange-500 text-white"
              barColor="orange"
              showPercent={false}
            />
            <p className="mt-1 pl-9 text-[10px] text-gray-500">
              {row.from} → {row.to}
            </p>
          </Link>
        ))
      )}
    </DashboardInsightShell>
  )
}
