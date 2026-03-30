'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@webfudge/auth'
import {
  KPICard,
  Card,
  Table,
  TableResultsCount,
  TableEmptyBelow,
  TabsWithActions,
  Modal,
  Button,
  Badge,
  Avatar,
  LoadingSpinner,
  TableSkeleton,
} from '@webfudge/ui'
import {
  FolderOpen,
  FolderCheck,
  Clock,
  Users,
  Plus,
  Trash2,
  Eye,
  Edit3,
  AlertCircle,
  LayoutGrid,
  CalendarDays,
} from 'lucide-react'
import PMPageHeader from '../../components/PMPageHeader'
import projectService from '../../lib/api/projectService'
import { transformProject, formatDate, transformProjectStatus } from '../../lib/api/dataTransformers'

const STATUS_TABS = [
  { id: 'all', label: 'All Projects' },
  { id: 'ACTIVE', label: 'Active' },
  { id: 'PLANNING', label: 'Planning' },
  { id: 'COMPLETED', label: 'Completed' },
  { id: 'ON_HOLD', label: 'On Hold' },
  { id: 'OVERDUE', label: 'Overdue' },
]

function getProjectStatusBadge(status) {
  const map = {
    ACTIVE: { variant: 'primary', label: 'Active' },
    PLANNING: { variant: 'warning', label: 'Planning' },
    IN_PROGRESS: { variant: 'warning', label: 'In Progress' },
    ON_HOLD: { variant: 'purple', label: 'On Hold' },
    COMPLETED: { variant: 'success', label: 'Completed' },
    CANCELLED: { variant: 'danger', label: 'Cancelled' },
  }
  return map[status] || { variant: 'default', label: status || '—' }
}

function isProjectOverdue(project) {
  if (!project?.endDate) return false
  const due = new Date(project.endDate)
  if (Number.isNaN(due.getTime())) return false
  return due < new Date() && project.strapiStatus !== 'COMPLETED' && project.strapiStatus !== 'CANCELLED'
}

function formatNumericDate(dateString) {
  if (!dateString) return '—'
  const d = new Date(dateString)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

export default function ProjectsPage() {
  const { user } = useAuth()
  const router = useRouter()

  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeView, setActiveView] = useState('list')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalProjects, setTotalProjects] = useState(0)
  const [deleteModal, setDeleteModal] = useState({ open: false, project: null })
  const [deleting, setDeleting] = useState(false)
  const pageSize = 10

  const loadProjects = useCallback(async () => {
    try {
      setLoading(true)
      const params = {
        pageSize,
        page: currentPage,
        sort: 'updatedAt:desc',
      }
      if (activeTab !== 'all' && activeTab !== 'OVERDUE') params.status = activeTab
      if (searchQuery) params.search = searchQuery

      const res = await projectService.getAllProjects(params)
      const raw = res?.data || []
      const transformed = raw.map(transformProject).filter(Boolean)
      const filtered =
        activeTab === 'OVERDUE' ? transformed.filter(isProjectOverdue) : transformed
      setProjects(filtered)
      setTotalProjects(res?.meta?.pagination?.total || raw.length)
    } catch (err) {
      console.error('Load projects error:', err)
    } finally {
      setLoading(false)
    }
  }, [activeTab, searchQuery, currentPage])

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  const handleDelete = async () => {
    if (!deleteModal.project) return
    try {
      setDeleting(true)
      await projectService.deleteProject(deleteModal.project.id)
      setDeleteModal({ open: false, project: null })
      loadProjects()
    } catch (err) {
      console.error('Delete project error:', err)
    } finally {
      setDeleting(false)
    }
  }

  const handleExport = () => {
    const rows = projects.map((p) => [
      p.name, p.status, p.startDate, p.endDate, p.teamSize || 0,
    ])
    const csv = [
      ['Name', 'Status', 'Start Date', 'End Date', 'Team Size'],
      ...rows,
    ]
      .map((r) => r.join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'projects.csv'
    a.click()
  }

  // Tab counts
  const tabsWithBadges = STATUS_TABS.map((tab) => ({
    ...tab,
    badge:
      tab.id === 'all'
        ? totalProjects
        : tab.id === 'OVERDUE'
          ? projects.filter(isProjectOverdue).length
          : projects.filter((p) => p.strapiStatus === tab.id).length,
  }))

  const totalPages = Math.ceil(totalProjects / pageSize)

  // Table columns
  const columns = [
    {
      key: 'name',
      title: 'Project Name',
      render: (value, row) => (
        <button
          onClick={() => router.push(`/projects/${row.slug || row.id}`)}
          className="flex items-center gap-3 hover:text-orange-600 transition-colors text-left"
        >
          {(() => {
            const colors = [
              'bg-orange-500',
              'bg-blue-500',
              'bg-green-500',
              'bg-purple-500',
              'bg-pink-500',
              'bg-yellow-500',
            ]
            const color = colors[(row?.name?.charCodeAt?.(0) || 0) % colors.length]
            return (
              <div className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center flex-shrink-0`}>
                <span className="text-white text-sm font-bold">
                  {(row?.name || 'P').charAt(0).toUpperCase()}
                </span>
              </div>
            )
          })()}
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 text-sm truncate">
              {value || '—'}
            </p>
          </div>
        </button>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      render: (_, row) => {
        const label = transformProjectStatus(row.strapiStatus)
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <select
              value={row.strapiStatus}
              className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-200 bg-white cursor-pointer"
              aria-label="Project status"
              onChange={() => {
                // UI-only dropdown in this view; real update handled in project detail.
              }}
            >
              {['ACTIVE', 'PLANNING', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED'].map((k) => (
                <option key={k} value={k}>
                  {transformProjectStatus(k)}
                </option>
              ))}
            </select>
          </div>
        )
      },
    },
    {
      key: 'projectManager',
      title: 'Project Lead',
      render: (_, row) => {
        const lead = row.projectManager
        if (!lead) return <span className="text-xs text-gray-400">—</span>
        return (
          <div className="flex items-center gap-2">
            <Avatar
              size="sm"
              fallback={(lead.name || 'U').charAt(0).toUpperCase()}
              className="bg-white/0"
            />
            <span className="text-sm text-gray-700 truncate max-w-[160px]">{lead.name}</span>
          </div>
        )
      },
    },
    {
      key: 'progress',
      title: 'Progress',
      render: (_, row) => {
        const progress = typeof row.progress === 'number' ? row.progress : 0
        return (
          <div className="min-w-[180px]">
            <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-orange-500 rounded-full"
                style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
              />
            </div>
            <div className="text-xs text-gray-600 mt-2">{progress}%</div>
          </div>
        )
      },
    },
    {
      key: 'team',
      title: 'Team',
      render: (_, row) => {
        const team = row.teamMembers || []
        if (!team.length) return <span className="text-xs text-gray-400">—</span>
        return (
          <div className="flex items-center -space-x-2">
            {team.slice(0, 4).map((member, i) => (
              <Avatar
                key={i}
                size="sm"
                fallback={(member.name || '?').charAt(0).toUpperCase()}
                className="border-2 border-white"
                title={member.name}
              />
            ))}
            {team.length > 4 && (
              <span className="w-7 h-7 rounded-full bg-gray-100 border-2 border-white text-xs text-gray-600 flex items-center justify-center font-medium">
                +{team.length - 4}
              </span>
            )}
          </div>
        )
      },
    },
    {
      key: 'dates',
      title: 'Dates',
      render: (_, row) => (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <CalendarDays className="w-3.5 h-3.5 text-gray-400" />
            <span>{formatNumericDate(row.startDate)}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <CalendarDays className="w-3.5 h-3.5 text-gray-400" />
            <span>{formatNumericDate(row.endDate)}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'tasks',
      title: 'Tasks',
      render: (_, row) => (
        <span className="text-sm text-gray-700">{row.totalTasks ?? 0}</span>
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (_, row) => (
        <div className="flex items-center gap-2 justify-end">
          <Button
            variant="ghost"
            size="sm"
            className="!px-2 !py-1 text-orange-500 hover:text-orange-600"
            onClick={(e) => {
              e.stopPropagation()
              router.push(`/projects/${row.slug || row.id}`)
            }}
          >
            <Eye className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="!px-2 !py-1 text-orange-500 hover:text-orange-600"
            onClick={(e) => {
              e.stopPropagation()
              router.push(`/projects/${row.slug || row.id}`)
            }}
          >
            <Edit3 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="!px-2 !py-1 text-red-500 hover:text-red-700 hover:bg-red-50"
            onClick={(e) => {
              e.stopPropagation()
              setDeleteModal({ open: true, project: row })
            }}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ]

  const overdueCount = projects.filter(isProjectOverdue).length
  const activeCount = projects.filter((p) => p.strapiStatus === 'ACTIVE').length
  const planningCount = projects.filter((p) => p.strapiStatus === 'PLANNING').length
  const completedCount = projects.filter((p) => p.strapiStatus === 'COMPLETED').length

  const stats = [
    {
      title: 'Active Projects',
      value: String(activeCount),
      subtitle: activeCount === 0 ? 'No projects' : `${activeCount} projects`,
      icon: FolderOpen,
      colorScheme: 'orange',
    },
    {
      title: 'Planning Projects',
      value: String(planningCount),
      subtitle: planningCount === 0 ? 'No projects' : `${planningCount} projects`,
      icon: Clock,
      colorScheme: 'blue',
    },
    {
      title: 'Completed Projects',
      value: String(completedCount),
      subtitle: completedCount === 0 ? 'No projects' : `${completedCount} projects`,
      icon: FolderCheck,
      colorScheme: 'green',
    },
    {
      title: 'Overdue Projects',
      value: String(overdueCount),
      subtitle: overdueCount === 0 ? 'No projects' : `${overdueCount} overdue`,
      icon: AlertCircle,
      colorScheme: 'red',
    },
  ]

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PMPageHeader
        title="Projects"
        subtitle="Manage and track all your projects"
        showProfile
        breadcrumb={[
          { label: 'Dashboard', href: '/' },
          { label: 'Projects' },
        ]}
        showSearch
        searchPlaceholder="Search projects..."
        onSearchChange={(q) => {
          setSearchQuery(q)
          setCurrentPage(1)
        }}
        showActions
        onAddClick={() => router.push('/projects/add')}
        // Only for matching the reference header layout; actual filtering is handled by tabs/search.
        onFilterClick={() => {}}
        onExportClick={handleExport}
      />

      {/* KPI stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <KPICard
            key={stat.title}
            title={stat.title}
            value={stat.value}
            icon={stat.icon}
            colorScheme={stat.colorScheme}
          />
        ))}
      </div>

      {/* Tabs + Search + View Toggle */}
      <TabsWithActions
        tabs={tabsWithBadges}
        activeTab={activeTab}
        onTabChange={(id) => { setActiveTab(id); setCurrentPage(1) }}
        showSearch={false}
        showAdd={false}
        showExport={false}
        showViewToggle
        activeView={activeView}
        onViewChange={setActiveView}
        viewOptions={['list', 'board']}
        variant="glass"
      />

      {/* Content */}
      {loading ? (
        <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-lg overflow-hidden">
          <div className="p-12 flex justify-center">
            <TableSkeleton rows={5} columns={5} />
          </div>
        </div>
      ) : projects.length === 0 ? (
        <>
          <TableResultsCount count={0} />
          <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-lg overflow-hidden">
            <TableEmptyBelow
              icon={FolderOpen}
              title="No projects found"
              description={
                searchQuery || activeTab !== 'all'
                  ? 'Try adjusting your search or filters.'
                  : 'Create your first project to get started.'
              }
              action={
                !searchQuery && activeTab === 'all' ? (
                  <Button variant="primary" onClick={() => router.push('/projects/add')}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Project
                  </Button>
                ) : null
              }
            />
          </div>
        </>
      ) : activeView === 'list' ? (
        <>
          <TableResultsCount count={totalProjects} />
          <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-lg overflow-hidden">
            <Table
              columns={columns}
              data={projects}
              keyField="id"
              variant="modernEmbedded"
              onRowClick={(row) => router.push(`/projects/${row.slug || row.id}`)}
            />
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 bg-white/50 backdrop-blur-md">
                <p className="text-sm text-gray-500">
                  Page {currentPage} of {totalPages} ({totalProjects} total)
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        /* Grid / Board view */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => {
            const s = getProjectStatusBadge(project.strapiStatus)
            return (
              <Card
                key={project.id}
                hoverable
                padding
                variant="default"
                onClick={() => router.push(`/projects/${project.slug || project.id}`)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                    <FolderOpen className="w-5 h-5 text-orange-600" />
                  </div>
                  <Badge variant={s.variant}>{s.label}</Badge>
                </div>
                <h3 className="font-semibold text-gray-900 mb-1 truncate">{project.name}</h3>
                {project.clientName && (
                  <p className="text-sm text-gray-500 mb-3">{project.clientName}</p>
                )}
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center -space-x-2">
                    {(project.team || []).slice(0, 3).map((m, i) => (
                      <Avatar
                        key={i}
                        fallback={(m.name || '?').charAt(0).toUpperCase()}
                        size="sm"
                        className="border-2 border-white"
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); setDeleteModal({ open: true, project }) }}
                      className="text-red-400 hover:text-red-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Delete Modal */}
      <Modal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, project: null })}
        title="Delete Project"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-red-50 rounded-xl">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-red-800">This action cannot be undone</p>
              <p className="text-sm text-red-600 mt-0.5">
                All tasks, comments, and data associated with{' '}
                <strong>{deleteModal.project?.name}</strong> will be permanently deleted.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setDeleteModal({ open: false, project: null })}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete Project'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
