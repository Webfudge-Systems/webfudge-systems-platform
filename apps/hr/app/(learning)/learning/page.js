'use client'

import { useMemo, useState } from 'react'
import {
  GraduationCap,
  BookOpen,
  Route,
  Award,
  Plus,
  Download,
  Clock,
} from 'lucide-react'
import {
  Button,
  Table,
  KPICard,
  TabsWithActions,
  Select,
  TableCellText,
  TableCellDateOnly,
  TableCellOrangePill,
  TableEmptyBelow,
  Card,
  TableResultsCount,
} from '@webfudge/ui'
import HRPageHeader from '../../../components/layout/HRPageHeader'
import HRModulePage from '../../../components/layout/HRModulePage'
import HRKpiRow from '../../../components/layout/HRKpiRow'
import HRDataTableCard from '../../../components/shared/HRDataTableCard'
import HRStatusBadge from '../../../components/shared/HRStatusBadge'
import { COURSES, LEARNING_PATHS, ASSIGNMENTS, CERTIFICATES } from '../../../lib/mock-data/learning'
import {
  computeLearningStats,
  filterCourses,
  filterLearningPaths,
  filterAssignments,
  filterCertificates,
  getLearningTabItems,
  getCourseCategories,
} from '../../../lib/learningPage'

export default function LearningPage() {
  const [activeTab, setActiveTab] = useState('courses')
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')

  const stats = useMemo(() => computeLearningStats(), [])
  const tabItems = useMemo(() => getLearningTabItems(), [])
  const categories = useMemo(() => getCourseCategories(), [])

  const courseRows = useMemo(
    () => filterCourses(COURSES, { search: searchQuery, categoryFilter }),
    [searchQuery, categoryFilter]
  )

  const pathRows = useMemo(
    () => filterLearningPaths(LEARNING_PATHS, searchQuery),
    [searchQuery]
  )

  const assignmentRows = useMemo(
    () => filterAssignments(ASSIGNMENTS, searchQuery),
    [searchQuery]
  )

  const certificateRows = useMemo(
    () => filterCertificates(CERTIFICATES, searchQuery),
    [searchQuery]
  )

  const courseColumns = useMemo(
    () => [
      {
        key: 'title',
        label: 'COURSE',
        fixed: true,
        render: (_, row) => (
          <div className="min-w-[220px]">
            <div className="font-medium text-gray-900">{row.title}</div>
            <div className="mt-0.5 flex items-center gap-1 text-sm text-gray-500">
              <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {row.duration}
            </div>
          </div>
        ),
      },
      {
        key: 'category',
        label: 'CATEGORY',
        render: (_, row) => <TableCellOrangePill value={row.category} />,
      },
      {
        key: 'enrolled',
        label: 'ENROLLED',
        render: (_, row) => <TableCellText value={String(row.enrolled)} emphasized />,
      },
      {
        key: 'completion',
        label: 'COMPLETION',
        render: (_, row) => <TableCellText value={`${row.completion}%`} emphasized />,
      },
    ],
    []
  )

  const pathColumns = useMemo(
    () => [
      {
        key: 'name',
        label: 'PATH',
        fixed: true,
        render: (_, row) => (
          <div className="min-w-[200px] font-medium text-gray-900">{row.name}</div>
        ),
      },
      {
        key: 'courses',
        label: 'COURSES',
        render: (_, row) => <TableCellText value={String(row.courses)} />,
      },
      {
        key: 'assigned',
        label: 'ASSIGNED TO',
        render: (_, row) => <TableCellOrangePill value={row.assigned} />,
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

  const assignmentColumns = useMemo(
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
        key: 'course',
        label: 'COURSE',
        render: (_, row) => <TableCellText value={row.course} />,
      },
      {
        key: 'assignedBy',
        label: 'ASSIGNED BY',
        render: (_, row) => <TableCellText value={row.assignedBy} />,
      },
      {
        key: 'due',
        label: 'DUE',
        render: (_, row) => <TableCellDateOnly dateString={row.due} />,
      },
      {
        key: 'progress',
        label: 'PROGRESS',
        render: (_, row) => <TableCellText value={`${row.progress}%`} emphasized />,
      },
      {
        key: 'status',
        label: 'STATUS',
        render: (_, row) => <HRStatusBadge status={row.status} />,
      },
    ],
    []
  )

  const certificateColumns = useMemo(
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
        key: 'course',
        label: 'COURSE',
        render: (_, row) => <TableCellText value={row.course} />,
      },
      {
        key: 'completed',
        label: 'COMPLETED',
        render: (_, row) => <TableCellDateOnly dateString={row.completed} />,
      },
      {
        key: 'certId',
        label: 'CERT ID',
        render: (_, row) => (
          <span className="font-mono text-sm text-gray-600">{row.certId}</span>
        ),
      },
      {
        key: 'actions',
        label: 'ACTIONS',
        fixed: true,
        render: () => (
          <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
            <Button variant="secondary" size="sm" onClick={() => console.log('Download cert')}>
              <Download className="mr-1 h-4 w-4" />
              Download
            </Button>
          </div>
        ),
      },
    ],
    []
  )

  const resultCount =
    activeTab === 'courses'
      ? courseRows.length
      : activeTab === 'paths'
        ? pathRows.length
        : activeTab === 'assignments'
          ? assignmentRows.length
          : activeTab === 'certificates'
            ? certificateRows.length
            : 0

  return (
    <HRModulePage className="!space-y-6">
      <HRPageHeader
        title="Learning & Development"
        subtitle={`${stats.totalCourses} courses · ${stats.avgCompletion}% avg completion`}
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Learning', href: '/learning' },
        ]}
        showActions
        showSearch
        onImportClick={() => console.log('Import learning')}
        onExportClick={() => console.log('Export learning')}
      />

      <HRKpiRow>
        <KPICard
          title="Courses"
          value={stats.totalCourses}
          subtitle={`${stats.totalEnrolled} enrollments`}
          icon={BookOpen}
          colorScheme="orange"
        />
        <KPICard
          title="Avg Completion"
          value={`${stats.avgCompletion}%`}
          subtitle="Across all courses"
          icon={GraduationCap}
          colorScheme="orange"
        />
        <KPICard
          title="Learning Paths"
          value={stats.activePaths}
          subtitle={`${stats.totalPaths} total paths`}
          icon={Route}
          colorScheme="orange"
        />
        <KPICard
          title="Certificates"
          value={stats.certificatesIssued}
          subtitle={`${stats.inProgressAssignments} in progress`}
          icon={Award}
          colorScheme="orange"
        />
      </HRKpiRow>

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
        onAddClick={() => console.log('Upload course')}
        addTitle="Upload Course"
        showFilter
        onFilterClick={() => console.log('Filter learning')}
        showExport
        onExportClick={() => console.log('Export learning')}
        exportTitle="Export"
        afterTabs={
          activeTab === 'courses' ? (
            <div className="hidden sm:block">
              <Select
                value={categoryFilter}
                onChange={setCategoryFilter}
                options={[{ value: '', label: 'All categories' }, ...categories.map((cat) => ({ value: cat, label: cat }))]}
                placeholder="All categories"
              />
            </div>
          ) : null
        }
      />

      <TableResultsCount count={resultCount} />

      {activeTab === 'courses' && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {courseRows.slice(0, 3).map((c) => (
              <Card
                key={c.id}
                className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
              >
                <div className={`h-1.5 ${c.color}`} />
                <div className="p-5">
                  <TableCellOrangePill value={c.category} />
                  <h3 className="mt-2 font-semibold text-gray-900">{c.title}</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {c.duration} · {c.enrolled} enrolled · {c.completion}% complete
                  </p>
                </div>
              </Card>
            ))}
          </div>
          <HRDataTableCard>
            <Table columns={courseColumns} data={courseRows} keyField="id" variant="modern" />
            {courseRows.length === 0 && (
              <div className="border-t border-gray-200">
                <TableEmptyBelow
                  icon={BookOpen}
                  title="No courses found"
                  description="Try adjusting your search or category filter."
                  action={<Button variant="primary" onClick={() => console.log('Upload course')}><Plus className="mr-2 h-4 w-4" />Upload Course</Button>}
                />
              </div>
            )}
          </HRDataTableCard>
        </>
      )}

      {activeTab === 'paths' && (
        <HRDataTableCard>
          <Table columns={pathColumns} data={pathRows} keyField="id" variant="modern" />
          {pathRows.length === 0 && (
            <div className="border-t border-gray-200">
              <TableEmptyBelow icon={Route} title="No learning paths found" description="Try adjusting your search." />
            </div>
          )}
        </HRDataTableCard>
      )}

      {activeTab === 'assignments' && (
        <HRDataTableCard>
          <Table columns={assignmentColumns} data={assignmentRows} keyField="id" variant="modern" />
          {assignmentRows.length === 0 && (
            <div className="border-t border-gray-200">
              <TableEmptyBelow icon={GraduationCap} title="No assignments found" description="Try adjusting your search." />
            </div>
          )}
        </HRDataTableCard>
      )}

      {activeTab === 'certificates' && (
        <HRDataTableCard>
          <Table columns={certificateColumns} data={certificateRows} keyField="id" variant="modern" />
          {certificateRows.length === 0 && (
            <div className="border-t border-gray-200">
              <TableEmptyBelow icon={Award} title="No certificates found" description="Try adjusting your search." />
            </div>
          )}
        </HRDataTableCard>
      )}
    </HRModulePage>
  )
}
