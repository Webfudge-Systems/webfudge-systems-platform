'use client'

import { useMemo, useState } from 'react'
import {
  Target,
  ClipboardList,
  MessageSquare,
  TrendingUp,
  AlertTriangle,
  Plus,
  FileText,
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
  ProgressBar,
} from '@webfudge/ui'
import HRPageHeader from '../../../components/layout/HRPageHeader'
import HRStatusBadge from '../../../components/shared/HRStatusBadge'
import { COMPANY_OKRS, REVIEW_CYCLES, APPRAISALS, PIPS } from '../../../lib/mock-data/performance'
import {
  computePerformanceStats,
  filterReviewCycles,
  filterAppraisals,
  filterPips,
  getPerformanceTabItems,
  PENDING_FEEDBACK,
  RECEIVED_FEEDBACK,
} from '../../../lib/performancePage'

const SECTION_CARD = 'rounded-2xl border border-gray-200 bg-white p-6 shadow-sm'
const APPRAISAL_STATUS_FILTERS = ['', 'Pending', 'Approved']

export default function PerformancePage() {
  const [activeTab, setActiveTab] = useState('goals')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const stats = useMemo(() => computePerformanceStats(), [])
  const tabItems = useMemo(() => getPerformanceTabItems(), [])

  const reviewRows = useMemo(
    () =>
      filterReviewCycles(REVIEW_CYCLES, searchQuery).map((row, index) => ({
        ...row,
        id: `rev-${index}`,
      })),
    [searchQuery]
  )

  const appraisalRows = useMemo(
    () => filterAppraisals(APPRAISALS, { search: searchQuery, statusFilter }),
    [searchQuery, statusFilter]
  )

  const pipRows = useMemo(() => filterPips(PIPS, searchQuery), [searchQuery])

  const reviewColumns = useMemo(
    () => [
      {
        key: 'name',
        label: 'CYCLE',
        fixed: true,
        render: (_, row) => (
          <div className="min-w-[200px]">
            <div className="font-medium text-gray-900">{row.name}</div>
            <div className="text-sm text-gray-500">{row.period}</div>
          </div>
        ),
      },
      {
        key: 'due',
        label: 'DUE',
        render: (_, row) => <TableCellDateOnly dateString={row.due} />,
      },
      {
        key: 'completion',
        label: 'COMPLETION',
        render: (_, row) => <TableCellText value={`${row.completion}%`} emphasized />,
      },
      {
        key: 'status',
        label: 'STATUS',
        render: (_, row) => <HRStatusBadge status={row.status} />,
      },
    ],
    []
  )

  const appraisalColumns = useMemo(
    () => [
      {
        key: 'employee',
        label: 'EMPLOYEE',
        fixed: true,
        render: (_, row) => (
          <div className="flex min-w-[180px] items-center gap-3">
            <Avatar alt={row.employee} fallback={row.employee?.charAt(0) || '?'} size="sm" />
            <div className="min-w-0">
              <div className="truncate font-medium text-gray-900">{row.employee}</div>
              <div className="truncate text-sm text-gray-500">{row.department}</div>
            </div>
          </div>
        ),
      },
      {
        key: 'rating',
        label: 'RATING',
        render: (_, row) => <TableCellText value={String(row.rating)} emphasized />,
      },
      {
        key: 'revision',
        label: 'REVISION',
        render: (_, row) => <TableCellText value={`${row.revision}%`} />,
      },
      {
        key: 'promotion',
        label: 'PROMOTION',
        render: (_, row) => (
          <TableCellOrangePill value={row.promotion === 'Yes' ? 'Recommended' : 'Not now'} />
        ),
      },
      {
        key: 'effective',
        label: 'EFFECTIVE',
        render: (_, row) => <TableCellDateOnly dateString={row.effective} />,
      },
      {
        key: 'status',
        label: 'STATUS',
        render: (_, row) => <HRStatusBadge status={row.status} />,
      },
    ],
    []
  )

  const pipColumns = useMemo(
    () => [
      {
        key: 'employee',
        label: 'EMPLOYEE',
        fixed: true,
        render: (_, row) => (
          <div className="min-w-[160px] font-medium text-gray-900">{row.employee}</div>
        ),
      },
      {
        key: 'manager',
        label: 'MANAGER',
        render: (_, row) => <TableCellText value={row.manager} />,
      },
      {
        key: 'start',
        label: 'START',
        render: (_, row) => <TableCellDateOnly dateString={row.start} />,
      },
      {
        key: 'duration',
        label: 'DURATION',
        render: (_, row) => <TableCellText value={row.duration} />,
      },
      {
        key: 'milestones',
        label: 'MILESTONES',
        render: (_, row) => <TableCellText value={row.milestones} emphasized />,
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
    activeTab === 'reviews'
      ? reviewRows.length
      : activeTab === 'appraisals'
        ? appraisalRows.length
        : activeTab === 'pips'
          ? pipRows.length
          : activeTab === 'feedback'
            ? PENDING_FEEDBACK.length
            : activeTab === 'goals'
              ? COMPANY_OKRS.length
              : 0

  return (
    <div className="min-h-full space-y-6 p-4 md:p-6">
      <HRPageHeader
        title="Performance"
        subtitle={`${stats.activeCycleName} · ${stats.cycleCompletion}% complete`}
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Performance', href: '/performance' },
        ]}
        showActions
        onImportClick={() => console.log('Import performance')}
        onExportClick={() => console.log('Export performance')}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Review Cycle"
          value={`${stats.cycleCompletion}%`}
          subtitle={stats.activeCycleName}
          icon={ClipboardList}
          colorScheme="orange"
        />
        <KPICard
          title="Company OKRs"
          value={stats.okrCount}
          subtitle={`${stats.krCount} key results`}
          icon={Target}
          colorScheme="orange"
        />
        <KPICard
          title="Pending Appraisals"
          value={stats.pendingAppraisals}
          subtitle={`${stats.totalAppraisals} total`}
          icon={TrendingUp}
          colorScheme="orange"
        />
        <KPICard
          title="Active PIPs"
          value={stats.activePips}
          subtitle={`${stats.pendingFeedback} feedback due`}
          icon={AlertTriangle}
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
        showSearch={activeTab !== 'goals'}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search..."
        showAdd
        onAddClick={() => console.log('Add goal')}
        addTitle="Add Goal"
        showFilter
        onFilterClick={() => console.log('Filter performance')}
        showExport
        onExportClick={() => console.log('Export performance')}
        exportTitle="Export"
        afterTabs={
          activeTab === 'appraisals' ? (
            <div className="hidden sm:block">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                aria-label="Filter by status"
              >
                <option value="">All statuses</option>
                {APPRAISAL_STATUS_FILTERS.filter(Boolean).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          ) : null
        }
      />

      {activeTab !== 'goals' && activeTab !== 'feedback' && (
        <div className="text-sm text-gray-600">
          Showing <span className="font-semibold text-gray-900">{resultCount}</span> result
          {resultCount !== 1 ? 's' : ''}
        </div>
      )}

      {activeTab === 'goals' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" className="bg-orange-500 hover:bg-orange-600" onClick={() => console.log('Add goal')}>
              <Plus className="mr-2 h-4 w-4" />
              Add Goal
            </Button>
            <Button variant="secondary" onClick={() => console.log('My goals')}>
              My Goals
            </Button>
          </div>
          {COMPANY_OKRS.map((o, i) => (
            <Card key={i} className={SECTION_CARD}>
              <div className="mb-4 flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50">
                  <Target className="h-5 w-5 text-orange-600" aria-hidden />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{o.objective}</h3>
              </div>
              <div className="space-y-4">
                {o.keyResults.map((kr) => (
                  <div key={kr.label}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="text-gray-700">{kr.label}</span>
                      <span className="font-medium text-orange-600">{kr.progress}%</span>
                    </div>
                    <ProgressBar value={kr.progress} />
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      {activeTab === 'reviews' && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <Table columns={reviewColumns} data={reviewRows} keyField="id" variant="modern" />
          {reviewRows.length === 0 && (
            <div className="border-t border-gray-200 p-12 text-center">
              <ClipboardList className="mx-auto mb-3 h-12 w-12 text-gray-300" />
              <h3 className="mb-2 text-lg font-semibold text-gray-700">No review cycles found</h3>
              <p className="text-sm text-gray-500">Try adjusting your search.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'feedback' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className={SECTION_CARD}>
            <div className="mb-4 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-orange-600" aria-hidden />
              <h3 className="font-semibold text-gray-900">Pending feedback requests</h3>
            </div>
            <ul className="divide-y divide-gray-100">
              {PENDING_FEEDBACK.map((item) => (
                <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.label}</p>
                    <p className="text-xs text-gray-500">Due {item.due}</p>
                  </div>
                  <Button variant="primary" size="sm" className="bg-orange-500 hover:bg-orange-600" onClick={() => console.log('Feedback', item.id)}>
                    Give Feedback
                  </Button>
                </li>
              ))}
            </ul>
          </Card>
          <Card className={SECTION_CARD}>
            <div className="mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-orange-600" aria-hidden />
              <h3 className="font-semibold text-gray-900">Received (anonymized)</h3>
            </div>
            <ul className="space-y-4">
              {RECEIVED_FEEDBACK.map((item) => (
                <li key={item.id} className="rounded-xl border border-gray-100 bg-gray-50/80 px-4 py-3">
                  <p className="text-sm italic text-gray-600">&ldquo;{item.quote}&rdquo;</p>
                  <p className="mt-1 text-xs text-gray-500">{item.period}</p>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}

      {activeTab === 'appraisals' && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <Table columns={appraisalColumns} data={appraisalRows} keyField="id" variant="modern" />
          {appraisalRows.length === 0 && (
            <div className="border-t border-gray-200 p-12 text-center">
              <TrendingUp className="mx-auto mb-3 h-12 w-12 text-gray-300" />
              <h3 className="mb-2 text-lg font-semibold text-gray-700">No appraisals found</h3>
              <p className="text-sm text-gray-500">Try adjusting your search or status filter.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'pips' && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <Table columns={pipColumns} data={pipRows} keyField="id" variant="modern" />
          {pipRows.length === 0 && (
            <div className="border-t border-gray-200 p-12 text-center">
              <AlertTriangle className="mx-auto mb-3 h-12 w-12 text-gray-300" />
              <h3 className="mb-2 text-lg font-semibold text-gray-700">No performance improvement plans</h3>
              <p className="text-sm text-gray-500">Try adjusting your search.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
