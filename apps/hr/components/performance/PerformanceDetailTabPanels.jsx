'use client'

import { AlertTriangle, ClipboardList, FileText, MessageSquare, Target, TrendingUp } from 'lucide-react'
import {
  Avatar,
  Badge,
  Card,
  DashboardProgressRow,
  InfoRow,
  InfoSection,
  TableCellDateOnly,
  TableCellOrangePill,
  progressBarColorForValue,
} from '@webfudge/ui'
import HRStatusBadge from '../shared/HRStatusBadge'
import {
  getGoalAverageProgress,
  getGoalScopeLabel,
  getKeyResultStatusLabel,
  parsePipMilestonePercent,
} from '../../lib/performancePage'

export function ReviewCycleOverviewPanel({ cycle }) {
  if (!cycle) return null

  const completion = Number(cycle.completion || 0)
  const isActive = cycle.status === 'Active'

  return (
    <div className="space-y-6">
      <Card variant="elevated" className="rounded-xl">
        <div className="mb-6 flex flex-col gap-4 border-b border-gray-100 pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <Avatar
              alt={cycle.name}
              fallback={cycle.name?.charAt(0) || '?'}
              size="lg"
              className="!h-20 !w-20 shrink-0 bg-gray-600 text-xl text-white"
            />
            <div className="min-w-0 text-left">
              <h2 className="text-xl font-semibold text-gray-900">{cycle.name}</h2>
              <p className="mt-0.5 text-base text-gray-500">{cycle.period}</p>
              <div className="mt-2 sm:hidden">
                <HRStatusBadge status={cycle.status} />
              </div>
            </div>
          </div>
          <div className="hidden shrink-0 sm:block">
            <HRStatusBadge status={cycle.status} />
          </div>
        </div>

        <InfoSection title="Cycle details" icon={ClipboardList} isFirst>
          <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
            <InfoRow label="Period" value={cycle.period || '—'} />
            <InfoRow label="Due date">
              <TableCellDateOnly dateString={cycle.due} />
            </InfoRow>
            <InfoRow label="Status">
              <HRStatusBadge status={cycle.status} />
            </InfoRow>
            <InfoRow label="Completion" value={`${completion}%`} emphasize />
          </div>
        </InfoSection>
      </Card>

      <Card variant="elevated" className="rounded-xl p-6">
        <InfoSection title="Progress" icon={ClipboardList} isFirst>
          <DashboardProgressRow
            label={isActive ? 'Cycle completion' : 'Final completion'}
            meta={isActive ? 'In progress' : 'Closed'}
            percent={completion}
            barColor={progressBarColorForValue(completion)}
            avatarFallback={cycle.name?.charAt(0) || '?'}
            avatarClassName="bg-orange-100 text-orange-700"
          />
        </InfoSection>
      </Card>
    </div>
  )
}

export function GoalOverviewPanel({ goal }) {
  if (!goal) return null

  const average = getGoalAverageProgress(goal)
  const onTrack = average >= 50
  const scopeLabel = getGoalScopeLabel(goal)

  return (
    <div className="space-y-6">
      <Card variant="elevated" className="rounded-xl">
        <div className="mb-6 flex flex-col gap-4 border-b border-gray-100 pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <Avatar
              alt={goal.objective}
              fallback={goal.objective?.charAt(0) || '?'}
              size="lg"
              className="!h-20 !w-20 shrink-0 bg-gray-600 text-xl text-white"
            />
            <div className="min-w-0 text-left">
              <h2 className="text-xl font-semibold text-gray-900">{goal.objective}</h2>
              <p className="mt-0.5 text-base text-gray-500">{goal.reviewCycle || scopeLabel}</p>
              <div className="mt-2 sm:hidden">
                <Badge variant={onTrack ? 'success' : 'warning'} size="sm">
                  {onTrack ? 'On Track' : 'At Risk'}
                </Badge>
              </div>
            </div>
          </div>
          <div className="hidden shrink-0 sm:block">
            <Badge variant={onTrack ? 'success' : 'warning'} size="sm">
              {onTrack ? 'On Track' : 'At Risk'}
            </Badge>
          </div>
        </div>

        <InfoSection title="Objective details" icon={Target} isFirst>
          <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
            <InfoRow label="Scope">
              <TableCellOrangePill value={scopeLabel} />
            </InfoRow>
            <InfoRow label="Review cycle" value={goal.reviewCycle || '—'} />
            <InfoRow label="Average progress" value={`${average}%`} emphasize />
            <InfoRow
              label="Key results"
              value={`${goal.keyResults?.length || 0}`}
              emphasize
            />
          </div>
        </InfoSection>
      </Card>

      <Card variant="elevated" className="rounded-xl p-6">
        <InfoSection title="Key results" icon={Target} isFirst>
          <div className="space-y-4">
            {(goal.keyResults || []).map((keyResult) => (
              <DashboardProgressRow
                key={keyResult.label}
                label={keyResult.label}
                meta={getKeyResultStatusLabel(keyResult.progress)}
                percent={keyResult.progress}
                barColor={progressBarColorForValue(keyResult.progress)}
                avatarFallback={keyResult.label.charAt(0) || '?'}
                avatarClassName="bg-orange-100 text-orange-700"
              />
            ))}
          </div>
        </InfoSection>
      </Card>
    </div>
  )
}

export function PipOverviewPanel({ pip }) {
  if (!pip) return null

  const milestonePercent = parsePipMilestonePercent(pip.milestones)
  const isActive = pip.status === 'Active'

  return (
    <div className="space-y-6">
      <Card variant="elevated" className="rounded-xl">
        <div className="mb-6 flex flex-col gap-4 border-b border-gray-100 pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <Avatar
              alt={pip.employee}
              fallback={pip.employee?.charAt(0) || '?'}
              size="lg"
              className="!h-20 !w-20 shrink-0 bg-gray-600 text-xl text-white"
            />
            <div className="min-w-0 text-left">
              <h2 className="text-xl font-semibold text-gray-900">{pip.employee}</h2>
              <p className="mt-0.5 text-base text-gray-500">Manager: {pip.manager || '—'}</p>
              <div className="mt-2 sm:hidden">
                <HRStatusBadge status={pip.status} />
              </div>
            </div>
          </div>
          <div className="hidden shrink-0 sm:block">
            <HRStatusBadge status={pip.status} />
          </div>
        </div>

        <InfoSection title="PIP details" icon={AlertTriangle} isFirst>
          <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
            <InfoRow label="Manager" value={pip.manager || '—'} />
            <InfoRow label="Start date">
              <TableCellDateOnly dateString={pip.start} />
            </InfoRow>
            <InfoRow label="Duration" value={pip.duration || '—'} />
            <InfoRow label="Milestones" value={pip.milestones || '—'} emphasize />
            <InfoRow label="Status">
              <HRStatusBadge status={pip.status} />
            </InfoRow>
          </div>
        </InfoSection>
      </Card>

      <Card variant="elevated" className="rounded-xl p-6">
        <InfoSection title="Milestone progress" icon={AlertTriangle} isFirst>
          <DashboardProgressRow
            label={pip.milestones || '0/0'}
            meta={isActive ? 'In progress' : pip.status}
            percent={milestonePercent}
            barColor={progressBarColorForValue(milestonePercent)}
            avatarFallback={pip.employee?.charAt(0) || '?'}
            avatarClassName="bg-orange-100 text-orange-700"
          />
        </InfoSection>
      </Card>
    </div>
  )
}

export function PendingFeedbackOverviewPanel({ item }) {
  if (!item) return null

  return (
    <div className="space-y-6">
      <Card variant="elevated" className="rounded-xl">
        <div className="mb-6 flex flex-col gap-4 border-b border-gray-100 pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <Avatar
              alt={item.label}
              fallback={item.label?.charAt(0) || '?'}
              size="lg"
              className="!h-20 !w-20 shrink-0 bg-gray-600 text-xl text-white"
            />
            <div className="min-w-0 text-left">
              <h2 className="text-xl font-semibold text-gray-900">{item.label}</h2>
              <p className="mt-0.5 text-base text-gray-500">{item.reviewCycle || 'Review cycle'}</p>
              <div className="mt-2 sm:hidden">
                <HRStatusBadge status="Pending" />
              </div>
            </div>
          </div>
          <div className="hidden shrink-0 sm:block">
            <HRStatusBadge status="Pending" />
          </div>
        </div>

        <InfoSection title="Request details" icon={MessageSquare} isFirst>
          <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
            <InfoRow label="Type">
              <TableCellOrangePill value={item.type || 'Peer'} />
            </InfoRow>
            <InfoRow label="Due date">
              <TableCellDateOnly dateString={item.due} />
            </InfoRow>
            <InfoRow label="Review cycle" value={item.reviewCycle || '—'} emphasize />
          </div>
        </InfoSection>
      </Card>
    </div>
  )
}

export function ReceivedFeedbackOverviewPanel({ item }) {
  if (!item) return null

  return (
    <div className="space-y-6">
      <Card variant="elevated" className="rounded-xl">
        <div className="mb-6 flex flex-col gap-4 border-b border-gray-100 pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <Avatar
              alt="Feedback"
              fallback={item.quote?.charAt(0) || '?'}
              size="lg"
              className="!h-20 !w-20 shrink-0 bg-orange-100 text-xl text-orange-700"
            />
            <div className="min-w-0 text-left">
              <h2 className="text-xl font-semibold text-gray-900">Anonymized feedback</h2>
              <p className="mt-0.5 text-base text-gray-500">{item.period || '—'}</p>
              <div className="mt-2 sm:hidden">
                <TableCellOrangePill value={item.type || 'Peer'} />
              </div>
            </div>
          </div>
          <div className="hidden shrink-0 sm:block">
            <TableCellOrangePill value={item.type || 'Peer'} />
          </div>
        </div>

        <InfoSection title="Feedback" icon={FileText} isFirst>
          <div className="grid grid-cols-1 gap-x-6 gap-y-4">
            <blockquote className="rounded-xl border border-gray-100 bg-gray-50/80 px-4 py-3 text-base italic text-gray-700">
              &ldquo;{item.quote}&rdquo;
            </blockquote>
            <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              <InfoRow label="Period" value={item.period || '—'} emphasize />
              {item.sourceLabel ? (
                <InfoRow label="Related request" value={item.sourceLabel} />
              ) : null}
            </div>
          </div>
        </InfoSection>
      </Card>
    </div>
  )
}

export function AppraisalOverviewPanel({ appraisal }) {
  if (!appraisal) return null

  const promotionLabel = appraisal.promotion === 'Yes' ? 'Recommended' : 'Not now'

  return (
    <div className="space-y-6">
      <Card variant="elevated" className="rounded-xl">
        <div className="mb-6 flex flex-col gap-4 border-b border-gray-100 pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <Avatar
              alt={appraisal.employee}
              fallback={appraisal.employee?.charAt(0) || '?'}
              size="lg"
              className="!h-20 !w-20 shrink-0 bg-gray-600 text-xl text-white"
            />
            <div className="min-w-0 text-left">
              <h2 className="text-xl font-semibold text-gray-900">{appraisal.employee}</h2>
              <p className="mt-0.5 text-base text-gray-500">{appraisal.department || '—'}</p>
              <div className="mt-2 sm:hidden">
                <HRStatusBadge status={appraisal.status} />
              </div>
            </div>
          </div>
          <div className="hidden shrink-0 sm:block">
            <HRStatusBadge status={appraisal.status} />
          </div>
        </div>

        <InfoSection title="Appraisal summary" icon={TrendingUp} isFirst>
          <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
            <InfoRow label="Rating" value={String(appraisal.rating ?? '—')} emphasize />
            <InfoRow label="Salary revision" value={`${appraisal.revision ?? 0}%`} emphasize />
            <InfoRow label="Promotion">
              <TableCellOrangePill value={promotionLabel} />
            </InfoRow>
            <InfoRow label="Effective date">
              <TableCellDateOnly dateString={appraisal.effective} />
            </InfoRow>
            <InfoRow label="Department" value={appraisal.department || '—'} />
            <InfoRow label="Status">
              <HRStatusBadge status={appraisal.status} />
            </InfoRow>
          </div>
        </InfoSection>
      </Card>
    </div>
  )
}
