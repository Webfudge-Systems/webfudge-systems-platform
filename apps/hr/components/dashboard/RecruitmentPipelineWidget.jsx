'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Button,
  EmptyState,
  DashboardProgressRow,
} from '@webfudge/ui'
import HRDashboardInsightShell, { HRInsightCountBadge } from './HRDashboardInsightShell'
import { Briefcase } from 'lucide-react'
import { OPEN_JOBS, CANDIDATES, INTERVIEWS, OFFERS } from '../../lib/mock-data/recruitment'

const PIPELINE_ROWS = [
  {
    key: 'openRoles',
    label: 'Open roles',
    barColor: 'orange',
    avatarFallback: 'J',
    avatarClassName: 'bg-orange-500 text-white',
  },
  {
    key: 'inPipeline',
    label: 'In pipeline',
    barColor: 'blue',
    avatarFallback: 'C',
    avatarClassName: 'bg-blue-500 text-white',
  },
  {
    key: 'interviews',
    label: 'Interviews',
    barColor: 'purple',
    avatarFallback: 'I',
    avatarClassName: 'bg-violet-500 text-white',
  },
  {
    key: 'offers',
    label: 'Offers out',
    barColor: 'green',
    avatarFallback: 'O',
    avatarClassName: 'bg-emerald-500 text-white',
  },
]

function buildRecruitmentSnapshot() {
  const openRoles = OPEN_JOBS.filter((job) => job.status === 'Open').length
  const totalRoles = OPEN_JOBS.length
  const inPipeline = CANDIDATES.filter(
    (candidate) => !['Hired', 'Rejected'].includes(candidate.stage)
  ).length
  const interviews = INTERVIEWS.filter((item) => item.status === 'Scheduled').length
  const offers = OFFERS.filter((item) => item.status === 'Sent').length
  const totalCandidates = CANDIDATES.length

  return {
    openRoles,
    totalRoles,
    inPipeline,
    totalCandidates,
    interviews,
    offers,
    openPct: totalRoles > 0 ? Math.round((openRoles / totalRoles) * 100) : 0,
    pipelinePct: totalCandidates > 0 ? Math.round((inPipeline / totalCandidates) * 100) : 0,
    interviewPct: inPipeline > 0 ? Math.min(100, Math.round((interviews / inPipeline) * 100)) : 0,
    offerPct: inPipeline > 0 ? Math.min(100, Math.round((offers / inPipeline) * 100)) : 0,
  }
}

function rowMeta(key, snap) {
  if (key === 'openRoles') {
    return snap.openRoles === 1 ? '1 open role' : `${snap.openRoles} open roles`
  }
  if (key === 'inPipeline') {
    return snap.inPipeline === 1 ? '1 candidate' : `${snap.inPipeline} candidates`
  }
  if (key === 'interviews') {
    return snap.interviews === 1 ? '1 scheduled' : `${snap.interviews} scheduled`
  }
  return snap.offers === 1 ? '1 pending' : `${snap.offers} pending`
}

function rowPercent(key, snap) {
  if (key === 'openRoles') return snap.openPct
  if (key === 'inPipeline') return snap.pipelinePct
  if (key === 'interviews') return snap.interviewPct
  return snap.offerPct
}

export default function RecruitmentPipelineWidget({ className = '' }) {
  const router = useRouter()
  const snap = useMemo(() => buildRecruitmentSnapshot(), [])
  const hasData = snap.totalRoles > 0 || snap.totalCandidates > 0

  return (
    <HRDashboardInsightShell
      fillHeight
      className={className}
      title="Recruitment pipeline"
      badge={<HRInsightCountBadge tone="blue">{snap.openRoles}</HRInsightCountBadge>}
      subtitle="Open roles & candidate flow"
      action={
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/recruitment')}
          className="!h-7 !px-2 text-[11px] font-semibold text-orange-600 hover:text-orange-700"
        >
          View all
        </Button>
      }
      panelClassName="flex min-h-0 flex-1 flex-col divide-y divide-gray-100/90 overflow-y-auto overscroll-contain [scrollbar-width:thin]"
    >
      {!hasData ? (
        <EmptyState
          icon={Briefcase}
          title="No open roles"
          description="Job postings and candidates will appear here."
          className="py-5"
        />
      ) : (
        PIPELINE_ROWS.map((row) => (
          <Link
            key={row.key}
            href="/recruitment"
            className="block w-full px-3 py-2 text-left transition-colors hover:bg-white/80"
          >
            <DashboardProgressRow
              label={row.label}
              meta={rowMeta(row.key, snap)}
              percent={rowPercent(row.key, snap)}
              avatarFallback={row.avatarFallback}
              avatarClassName={row.avatarClassName}
              barColor={row.barColor}
              showPercent={false}
            />
          </Link>
        ))
      )}
    </HRDashboardInsightShell>
  )
}
