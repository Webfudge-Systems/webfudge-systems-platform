'use client'

import { useMemo, useState } from 'react'
import {
  Briefcase,
  Users,
  CalendarClock,
  FileCheck,
  Plus,
  Star,
  MapPin,
  Video,
} from 'lucide-react'
import {
  Button,
  Table,
  KPICard,
  TabsWithActions,
  Avatar,
  TableCellText,
  TableCellDateOnly,
  TableCellOrangePill,
  Card,
} from '@webfudge/ui'
import HRPageHeader from '../../../components/layout/HRPageHeader'
import HRStatusBadge from '../../../components/shared/HRStatusBadge'
import {
  OPEN_JOBS,
  CANDIDATES,
  INTERVIEWS,
  OFFERS,
} from '../../../lib/mock-data/recruitment'
import {
  computeRecruitmentStats,
  filterOpenJobs,
  filterCandidates,
  filterInterviews,
  filterOffers,
  getRecruitmentTabItems,
  getPipelineCandidates,
  PIPELINE_STAGES,
} from '../../../lib/recruitmentPage'
import { useHRQuickActions } from '../../../components/quick-actions/HRQuickActionsContext'
import { HR_QUICK_ACTION_IDS } from '../../../lib/quickActions'

const JOB_STATUS_FILTERS = ['', 'Open', 'Paused']
const STAGE_FILTERS = ['', ...PIPELINE_STAGES]

function RatingStars({ rating }) {
  return (
    <div className="flex items-center gap-0.5 text-amber-500" aria-label={`${rating} out of 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${i < rating ? 'fill-current' : 'text-gray-200'}`}
        />
      ))}
    </div>
  )
}

export default function RecruitmentPage() {
  const { openQuickAction } = useHRQuickActions()
  const [activeTab, setActiveTab] = useState('jobs')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [stageFilter, setStageFilter] = useState('')

  const stats = useMemo(() => computeRecruitmentStats(), [])
  const tabItems = useMemo(() => getRecruitmentTabItems(), [])

  const jobRows = useMemo(
    () => filterOpenJobs(OPEN_JOBS, { search: searchQuery, statusFilter }),
    [searchQuery, statusFilter]
  )

  const candidateRows = useMemo(
    () => filterCandidates(CANDIDATES, { search: searchQuery, stageFilter }),
    [searchQuery, stageFilter]
  )

  const pipelineCandidates = useMemo(
    () => getPipelineCandidates(CANDIDATES, searchQuery),
    [searchQuery]
  )

  const interviewRows = useMemo(
    () => filterInterviews(INTERVIEWS, searchQuery),
    [searchQuery]
  )

  const offerRows = useMemo(
    () => filterOffers(OFFERS, searchQuery),
    [searchQuery]
  )

  const jobColumns = useMemo(
    () => [
      {
        key: 'title',
        label: 'ROLE',
        fixed: true,
        render: (_, row) => (
          <div className="min-w-[200px]">
            <div className="font-medium text-gray-900">{row.title}</div>
            <div className="mt-0.5 flex items-center gap-1 text-sm text-gray-500">
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {row.location}
            </div>
          </div>
        ),
      },
      {
        key: 'department',
        label: 'DEPARTMENT',
        render: (_, row) => <TableCellOrangePill value={row.department} />,
      },
      {
        key: 'applications',
        label: 'APPLICATIONS',
        render: (_, row) => <TableCellText value={String(row.applications)} emphasized />,
      },
      {
        key: 'posted',
        label: 'POSTED',
        render: (_, row) => <TableCellDateOnly dateString={row.posted} />,
      },
      {
        key: 'status',
        label: 'STATUS',
        render: (_, row) => <HRStatusBadge status={row.status} />,
      },
    ],
    []
  )

  const candidateColumns = useMemo(
    () => [
      {
        key: 'name',
        label: 'CANDIDATE',
        fixed: true,
        render: (_, row) => (
          <div className="flex min-w-[180px] items-center gap-3">
            <Avatar alt={row.name} fallback={row.name?.charAt(0) || '?'} size="sm" />
            <div className="min-w-0">
              <div className="truncate font-medium text-gray-900">{row.name}</div>
              <div className="truncate text-sm text-gray-500">{row.role}</div>
            </div>
          </div>
        ),
      },
      {
        key: 'source',
        label: 'SOURCE',
        render: (_, row) => <TableCellText value={row.source} />,
      },
      {
        key: 'applied',
        label: 'APPLIED',
        render: (_, row) => <TableCellDateOnly dateString={row.applied} />,
      },
      {
        key: 'stage',
        label: 'STAGE',
        render: (_, row) => <TableCellOrangePill value={row.stage} />,
      },
      {
        key: 'rating',
        label: 'RATING',
        render: (_, row) => <RatingStars rating={row.rating} />,
      },
    ],
    []
  )

  const interviewColumns = useMemo(
    () => [
      {
        key: 'candidate',
        label: 'CANDIDATE',
        fixed: true,
        render: (_, row) => (
          <div className="min-w-[160px]">
            <div className="font-medium text-gray-900">{row.candidate}</div>
            <div className="text-sm text-gray-500">{row.role}</div>
          </div>
        ),
      },
      {
        key: 'round',
        label: 'ROUND',
        render: (_, row) => <TableCellOrangePill value={row.round} />,
      },
      {
        key: 'interviewer',
        label: 'INTERVIEWER',
        render: (_, row) => <TableCellText value={row.interviewer} />,
      },
      {
        key: 'datetime',
        label: 'SCHEDULED',
        render: (_, row) => <TableCellText value={row.datetime} emphasized />,
      },
      {
        key: 'format',
        label: 'FORMAT',
        render: (_, row) => (
          <span className="inline-flex items-center gap-1 text-sm text-gray-600">
            <Video className="h-4 w-4 text-orange-500" aria-hidden />
            {row.format}
          </span>
        ),
      },
      {
        key: 'status',
        label: 'STATUS',
        render: (_, row) => <HRStatusBadge status={row.status} />,
      },
    ],
    []
  )

  const offerColumns = useMemo(
    () => [
      {
        key: 'candidate',
        label: 'CANDIDATE',
        fixed: true,
        render: (_, row) => (
          <div className="min-w-[160px]">
            <div className="font-medium text-gray-900">{row.candidate}</div>
            <div className="text-sm text-gray-500">{row.role}</div>
          </div>
        ),
      },
      {
        key: 'ctc',
        label: 'CTC',
        render: (_, row) => (
          <TableCellText value={`₹${row.ctc.toLocaleString('en-IN')}`} emphasized />
        ),
      },
      {
        key: 'offerDate',
        label: 'OFFER DATE',
        render: (_, row) => <TableCellDateOnly dateString={row.offerDate} />,
      },
      {
        key: 'status',
        label: 'STATUS',
        render: (_, row) => <HRStatusBadge status={row.status} />,
      },
    ],
    []
  )

  const resultCount =
    activeTab === 'jobs'
      ? jobRows.length
      : activeTab === 'candidates'
        ? candidateRows.length
        : activeTab === 'interviews'
          ? interviewRows.length
          : activeTab === 'offers'
            ? offerRows.length
            : activeTab === 'pipeline'
              ? pipelineCandidates.length
              : 0

  return (
    <div className="min-h-full space-y-6 p-4 md:p-6">
      <HRPageHeader
        title="Recruitment"
        subtitle={`${stats.openJobs} open role${stats.openJobs === 1 ? '' : 's'} · ${stats.inPipeline} in pipeline`}
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Recruitment', href: '/recruitment' },
        ]}
        showActions
        onImportClick={() => console.log('Import recruitment')}
        onExportClick={() => console.log('Export recruitment')}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Open Jobs"
          value={stats.openJobs}
          subtitle={`${stats.totalApplications} applications`}
          icon={Briefcase}
          colorScheme="orange"
        />
        <KPICard
          title="In Pipeline"
          value={stats.inPipeline}
          subtitle={`${stats.totalCandidates} total candidates`}
          icon={Users}
          colorScheme="orange"
        />
        <KPICard
          title="Interviews"
          value={stats.scheduledInterviews}
          subtitle="Scheduled this week"
          icon={CalendarClock}
          colorScheme="orange"
        />
        <KPICard
          title="Offers"
          value={stats.activeOffers}
          subtitle={`${stats.hired} hired`}
          icon={FileCheck}
          colorScheme="orange"
        />
      </div>

      <TabsWithActions
        tabs={tabItems.map((item) => ({
          key: item.key,
          label: item.label,
          badge: item.count > 0 ? String(item.count) : undefined,
        }))}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        showSearch
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search..."
        showAdd
        onAddClick={() => openQuickAction(HR_QUICK_ACTION_IDS.POST_JOB)}
        addTitle="Post New Job"
        showFilter
        onFilterClick={() => console.log('Filter recruitment')}
        showExport
        onExportClick={() => console.log('Export recruitment')}
        exportTitle="Export"
        afterTabs={
          activeTab === 'jobs' ? (
            <div className="hidden sm:block">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                aria-label="Filter by job status"
              >
                <option value="">All statuses</option>
                {JOB_STATUS_FILTERS.filter(Boolean).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          ) : activeTab === 'candidates' ? (
            <div className="hidden sm:block">
              <select
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                aria-label="Filter by stage"
              >
                <option value="">All stages</option>
                {STAGE_FILTERS.filter(Boolean).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          ) : null
        }
      />

      {activeTab !== 'pipeline' && (
        <div className="text-sm text-gray-600">
          Showing <span className="font-semibold text-gray-900">{resultCount}</span> result
          {resultCount !== 1 ? 's' : ''}
        </div>
      )}

      {activeTab === 'jobs' && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <Table columns={jobColumns} data={jobRows} keyField="id" variant="modern" />
          {jobRows.length === 0 && (
            <div className="border-t border-gray-200 p-12 text-center">
              <Briefcase className="mx-auto mb-3 h-12 w-12 text-gray-300" />
              <h3 className="mb-2 text-lg font-semibold text-gray-700">No open jobs found</h3>
              <p className="mb-4 text-sm text-gray-500">Try adjusting your search or filters.</p>
              <Button variant="primary" onClick={() => openQuickAction(HR_QUICK_ACTION_IDS.POST_JOB)}>
                <Plus className="mr-2 h-4 w-4" />
                Post New Job
              </Button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'pipeline' && (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {PIPELINE_STAGES.map((stage) => {
            const cards = pipelineCandidates.filter((c) => c.stage === stage)
            return (
              <div
                key={stage}
                className="min-w-[220px] flex-shrink-0 rounded-2xl border border-gray-200 bg-gray-50/80 p-3"
              >
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                    {stage}
                  </h4>
                  <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
                    {cards.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {cards.map((c) => (
                    <Card
                      key={c.id}
                      className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm transition-shadow hover:shadow-md"
                    >
                      <div className="flex items-center gap-2">
                        <Avatar alt={c.name} fallback={c.name?.charAt(0) || '?'} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-gray-900">{c.name}</p>
                          <p className="truncate text-xs text-gray-500">{c.role}</p>
                        </div>
                      </div>
                      <div className="mt-2">
                        <RatingStars rating={c.rating} />
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {activeTab === 'candidates' && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <Table columns={candidateColumns} data={candidateRows} keyField="id" variant="modern" />
          {candidateRows.length === 0 && (
            <div className="border-t border-gray-200 p-12 text-center">
              <Users className="mx-auto mb-3 h-12 w-12 text-gray-300" />
              <h3 className="mb-2 text-lg font-semibold text-gray-700">No candidates found</h3>
              <p className="text-sm text-gray-500">Try adjusting your search or stage filter.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'interviews' && (
        <>
          <div className="flex justify-end">
            <Button variant="primary" className="bg-orange-500 hover:bg-orange-600" onClick={() => console.log('Schedule')}>
              <Plus className="mr-2 h-4 w-4" />
              Schedule Interview
            </Button>
          </div>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <Table columns={interviewColumns} data={interviewRows} keyField="id" variant="modern" />
            {interviewRows.length === 0 && (
              <div className="border-t border-gray-200 p-12 text-center">
                <CalendarClock className="mx-auto mb-3 h-12 w-12 text-gray-300" />
                <h3 className="mb-2 text-lg font-semibold text-gray-700">No interviews scheduled</h3>
                <p className="text-sm text-gray-500">Try adjusting your search.</p>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'offers' && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <Table columns={offerColumns} data={offerRows} keyField="id" variant="modern" />
          {offerRows.length === 0 && (
            <div className="border-t border-gray-200 p-12 text-center">
              <FileCheck className="mx-auto mb-3 h-12 w-12 text-gray-300" />
              <h3 className="mb-2 text-lg font-semibold text-gray-700">No offers found</h3>
              <p className="text-sm text-gray-500">Try adjusting your search.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
