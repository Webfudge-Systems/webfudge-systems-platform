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
  AlertCircle,
  LayoutGrid,
} from 'lucide-react'
import PMPageHeader from '../../components/PMPageHeader'
import projectService from '../../lib/api/projectService'
import { transformProject, formatDate } from '../../lib/api/dataTransformers'

const STATUS_TABS = [
  { id: 'all', label: 'All' },
  { id: 'SCHEDULED', label: 'Scheduled' },
  { id: 'IN_PROGRESS', label: 'In Progress' },
  { id: 'COMPLETED', label: 'Completed' },
  { id: 'CANCELLED', label: 'Cancelled' },
]

function getProjectStatusBadge(status) {
  const map = {
    SCHEDULED: { variant: 'primary', label: 'Scheduled' },
    IN_PROGRESS: { variant: 'warning', label: 'In Progress' },
    COMPLETED: { variant: 'success', label: 'Completed' },
    CANCELLED: { variant: 'danger', label: 'Cancelled' },
    INTERNAL_REVIEW: { variant: 'purple', label: 'In Review' },
  }
  return map[status] || { variant: 'default', label: status || '—' }
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
      if (activeTab !== 'all') params.status = activeTab
      if (searchQuery) params.search = searchQuery

      const res = await projectService.getAllProjects(params)
      const raw = res?.data || []
      setProjects(raw.map(transformProject).filter(Boolean))
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
        ? projects.length
        : projects.filter((p) => p.strapiStatus === tab.id).length,
  }))

  const totalPages = Math.ceil(totalProjects / pageSize)

  // Table columns
  const columns = [
    {
      key: 'name',
      title: 'Project',
      render: (value, row) => (
        <button
          onClick={() => router.push(`/projects/${row.slug || row.id}`)}
          className="flex items-center gap-3 hover:text-orange-600 transition-colors text-left"
        >
          <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
            <FolderOpen className="w-4 h-4 text-orange-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">{value || '—'}</p>
            {row.clientName && (
              <p className="text-xs text-gray-500">{row.clientName}</p>
            )}
          </div>
        </button>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      render: (value, row) => {
        const s = getProjectStatusBadge(row.strapiStatus)
        return <Badge variant={s.variant}>{s.label}</Badge>
      },
    },
    {
      key: 'startDate',
      title: 'Start',
      render: (value) => (
        <span className="text-sm text-gray-600">{formatDate(value, 'short') || '—'}</span>
      ),
    },
    {
      key: 'endDate',
      title: 'End / Deadline',
      render: (value) => (
        <span className="text-sm text-gray-600">{formatDate(value, 'short') || '—'}</span>
      ),
    },
    {
      key: 'team',
      title: 'Team',
      render: (value, row) => {
        const team = row.team || []
        if (team.length === 0) return <span className="text-xs text-gray-400">—</span>
        return (
          <div className="flex items-center -space-x-2">
            {team.slice(0, 4).map((member, i) => (
              <Avatar
                key={i}
                fallback={(member.name || member.username || '?').charAt(0).toUpperCase()}
                size="sm"
                className="border-2 border-white"
                title={member.name || member.username}
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
      key: 'actions',
      title: '',
      render: (_, row) => (
        <div className="flex items-center gap-1 justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => { e.stopPropagation(); router.push(`/projects/${row.slug || row.id}`) }}
            title="View"
          >
            <Eye className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => { e.stopPropagation(); setDeleteModal({ open: true, project: row }) }}
            title="Delete"
            className="text-red-500 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ]

  const stats = [
    {
      title: 'Total Projects',
      value: String(totalProjects),
      icon: FolderOpen,
      colorScheme: 'blue',
    },
    {
      title: 'In Progress',
      value: String(projects.filter((p) => p.strapiStatus === 'IN_PROGRESS').length),
      icon: Clock,
      colorScheme: 'yellow',
    },
    {
      title: 'Completed',
      value: String(projects.filter((p) => p.strapiStatus === 'COMPLETED').length),
      icon: FolderCheck,
      colorScheme: 'green',
    },
    {
      title: 'Team Members',
      value: String([...new Set(projects.flatMap((p) => (p.team || []).map((m) => m.id)))].length),
      icon: Users,
      colorScheme: 'purple',
    },
  ]

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PMPageHeader
        title="Projects"
        subtitle="Manage and track all your projects"
        showProfile
        actions={
          <Button variant="primary" onClick={() => router.push('/projects/add')}>
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </Button>
        }
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
        showSearch
        searchQuery={searchQuery}
        onSearchChange={(q) => { setSearchQuery(q); setCurrentPage(1) }}
        searchPlaceholder="Search projects..."
        showAdd
        onAddClick={() => router.push('/projects/add')}
        addTitle="New Project"
        showExport
        onExportClick={handleExport}
        exportTitle="Export CSV"
        showViewToggle
        activeView={activeView}
        onViewChange={setActiveView}
        viewOptions={['list', 'board']}
        variant="glass"
      />

      {/* Content */}
      {loading ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-12 flex justify-center">
            <TableSkeleton rows={5} columns={5} />
          </div>
        </div>
      ) : projects.length === 0 ? (
        <>
          <TableResultsCount count={0} />
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <Table
              columns={columns}
              data={[]}
              keyField="id"
              variant="modernEmbedded"
            />
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
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <Table
              columns={columns}
              data={projects}
              keyField="id"
              variant="modernEmbedded"
              onRowClick={(row) => router.push(`/projects/${row.slug || row.id}`)}
            />
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-white">
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
