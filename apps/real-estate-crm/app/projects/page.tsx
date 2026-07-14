'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Building2,
  CheckCircle2,
  Clock3,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import {
  Badge,
  Button,
  EmptyState,
  Input,
  KPICard,
  LoadingSpinner,
  Modal,
  Pagination,
  Select,
  Table,
  TableColumnPicker,
  TableRowActionMenuPortal,
  TableSortDropdown,
  TabsWithActions,
  useTableColumnPreferences,
  useTableSort,
} from '@webfudge/ui'
import {
  createProject,
  deleteProject,
  listProjects,
  updateProject,
} from '../../lib/api/projectService'
import EstatePageHeader from '../../components/EstatePageHeader'
import { formatDate, formatInr } from '../../lib/format'
import {
  PROJECT_STATUSES,
  PROJECT_STATUS_LABELS,
  type ProjectStatus,
  type RealEstateProject,
} from '../../lib/types'

const PAGE_SIZE = 15

const STATUS_VARIANTS: Record<ProjectStatus, string> = {
  upcoming: 'info',
  active: 'success',
  sold_out: 'orange',
  archived: 'default',
}

const COLUMN_VISIBILITY_STORAGE_KEY = 'reCrm.projects.tableColumnVisibility'
const COLUMN_ORDER_STORAGE_KEY = 'reCrm.projects.tableColumnOrder'
const COLUMN_WIDTHS_STORAGE_KEY = 'reCrm.projects.tableColumnWidths'
const TABLE_SORT_STORAGE_KEY = 'reCrm.projects.tableSort'

const TOGGLEABLE_COLUMNS = [
  { key: 'location', label: 'Location' },
  { key: 'price', label: 'Price range' },
  { key: 'configurations', label: 'Configs' },
  { key: 'possessionDate', label: 'Possession' },
  { key: 'metaCampaignId', label: 'Meta campaign' },
  { key: 'status', label: 'Status' },
]

const REORDERABLE_COLUMN_KEYS = TOGGLEABLE_COLUMNS.map((c) => c.key)

const DEFAULT_COLUMN_VISIBILITY = TOGGLEABLE_COLUMNS.reduce<Record<string, boolean>>(
  (acc, { key }) => {
    acc[key] = true
    return acc
  },
  {}
)

const DEFAULT_COLUMN_WIDTHS: Record<string, number> = {
  name: 240,
  location: 160,
  price: 180,
  configurations: 150,
  possessionDate: 150,
  metaCampaignId: 170,
  status: 130,
  actions: 110,
}

const MIN_COLUMN_WIDTHS: Record<string, number> = {
  name: 200,
  actions: 100,
}

const SORT_COLUMN_OPTIONS = [
  { key: 'name', label: 'Project' },
  { key: 'location', label: 'Location' },
  { key: 'minPrice', label: 'Price' },
  { key: 'possessionDate', label: 'Possession' },
  { key: 'status', label: 'Status' },
  { key: 'createdAt', label: 'Created' },
]

const SORTABLE_KEYS = ['name', 'location', 'price', 'possessionDate', 'status']

interface ProjectForm {
  name: string
  developerName: string
  location: string
  minPrice: string
  maxPrice: string
  configurations: string
  possessionDate: string
  status: ProjectStatus
  landingPageUrl: string
  metaCampaignId: string
}

const EMPTY_FORM: ProjectForm = {
  name: '',
  developerName: '',
  location: '',
  minPrice: '',
  maxPrice: '',
  configurations: '',
  possessionDate: '',
  status: 'active',
  landingPageUrl: '',
  metaCampaignId: '',
}

function formFromProject(p: RealEstateProject): ProjectForm {
  return {
    name: p.name || '',
    developerName: p.developerName || '',
    location: p.location || '',
    minPrice: p.minPrice != null ? String(p.minPrice) : '',
    maxPrice: p.maxPrice != null ? String(p.maxPrice) : '',
    configurations: (p.configurations || []).join(', '),
    possessionDate: p.possessionDate || '',
    status: p.status || 'active',
    landingPageUrl: p.landingPageUrl || '',
    metaCampaignId: p.metaCampaignId || '',
  }
}

function payloadFromForm(form: ProjectForm): Partial<RealEstateProject> {
  return {
    name: form.name.trim(),
    developerName: form.developerName.trim() || null,
    location: form.location.trim() || null,
    minPrice: form.minPrice ? Number(form.minPrice) : null,
    maxPrice: form.maxPrice ? Number(form.maxPrice) : null,
    configurations: form.configurations
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    possessionDate: form.possessionDate || null,
    status: form.status,
    landingPageUrl: form.landingPageUrl.trim() || null,
    metaCampaignId: form.metaCampaignId.trim() || null,
  }
}

interface ActionMenuAnchor {
  id: string | number
  top: number
  left: number
  triggerEl: HTMLElement
}

export default function ProjectsPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<RealEstateProject[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)

  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const searchTimer = useRef<ReturnType<typeof setTimeout>>()

  const [sortOpen, setSortOpen] = useState(false)
  const [moreActionMenu, setMoreActionMenu] = useState<ActionMenuAnchor | null>(null)
  const [projectToDelete, setProjectToDelete] = useState<RealEstateProject | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [editing, setEditing] = useState<RealEstateProject | 'new' | null>(null)
  const [form, setForm] = useState<ProjectForm>(EMPTY_FORM)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const {
    columnVisibility,
    columnOrder,
    columnPickerOpen,
    setColumnPickerOpen,
    columnDropIndicator,
    toolbarRef,
    setColumnVisible,
    handleColumnDragStart,
    handleColumnDragEnd,
    handleColumnRowDragOver,
    handleColumnListDragLeave,
    handleColumnDrop,
    resetColumnTablePreferences,
    tableResizeProps,
  } = useTableColumnPreferences({
    visibilityStorageKey: COLUMN_VISIBILITY_STORAGE_KEY,
    orderStorageKey: COLUMN_ORDER_STORAGE_KEY,
    widthsStorageKey: COLUMN_WIDTHS_STORAGE_KEY,
    defaultVisibility: DEFAULT_COLUMN_VISIBILITY,
    reorderableKeys: REORDERABLE_COLUMN_KEYS,
    defaultWidths: DEFAULT_COLUMN_WIDTHS,
    minWidths: MIN_COLUMN_WIDTHS,
  })

  const {
    sortRules,
    hasActiveSort,
    addSortRule,
    removeSortRule,
    setRuleDirection,
    moveSortRule,
    clearSort,
    bindSortableColumns,
  } = useTableSort({
    storageKey: TABLE_SORT_STORAGE_KEY,
    defaultRules: [{ key: 'createdAt', direction: 'desc' }],
  })

  const reload = useCallback(() => {
    setLoading(true)
    listProjects().then((res) => {
      setProjects(res.data)
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (params.get('new') === '1') {
      openCreate()
      params.delete('new')
      const qs = params.toString()
      router.replace(`/projects${qs ? `?${qs}` : ''}`)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => setDebouncedSearch(searchQuery.trim().toLowerCase()), 250)
    return () => clearTimeout(searchTimer.current)
  }, [searchQuery])

  useEffect(() => {
    if (!columnPickerOpen && !sortOpen) return
    const onDocMouseDown = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setColumnPickerOpen(false)
        setSortOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [columnPickerOpen, sortOpen, setColumnPickerOpen, toolbarRef])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, sortRules])

  const filtered = useMemo(() => {
    let rows = projects
    if (debouncedSearch) {
      rows = rows.filter((p) =>
        [p.name, p.developerName, p.location, p.metaCampaignId]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(debouncedSearch))
      )
    }
    const rule = sortRules[0] as { key: string; direction: string } | undefined
    if (rule) {
      const dir = rule.direction === 'asc' ? 1 : -1
      rows = [...rows].sort((a, b) => {
        const key = rule.key === 'price' ? 'minPrice' : rule.key
        const av = (a as any)[key]
        const bv = (b as any)[key]
        if (av == null && bv == null) return 0
        if (av == null) return 1
        if (bv == null) return -1
        if (key === 'minPrice') return (Number(av) - Number(bv)) * dir
        if (key === 'possessionDate' || key === 'createdAt') {
          return (new Date(av).getTime() - new Date(bv).getTime()) * dir
        }
        return String(av).localeCompare(String(bv)) * dir
      })
    }
    return rows
  }, [projects, debouncedSearch, sortRules])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageRows = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page]
  )

  const activeCount = useMemo(() => projects.filter((p) => p.status === 'active').length, [projects])
  const upcomingCount = useMemo(
    () => projects.filter((p) => p.status === 'upcoming').length,
    [projects]
  )

  const openCreate = () => {
    setForm(EMPTY_FORM)
    setError('')
    setEditing('new')
  }

  const openEdit = (project: RealEstateProject) => {
    setForm(formFromProject(project))
    setError('')
    setEditing(project)
  }

  const save = async () => {
    if (!form.name.trim()) {
      setError('Project name is required')
      return
    }
    setBusy(true)
    setError('')
    try {
      if (editing === 'new') {
        await createProject(payloadFromForm(form))
      } else if (editing) {
        await updateProject(editing.id, payloadFromForm(form))
      }
      setEditing(null)
      reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save project')
    } finally {
      setBusy(false)
    }
  }

  const confirmDelete = async () => {
    if (!projectToDelete) return
    setDeleting(true)
    try {
      await deleteProject(projectToDelete.id)
      setProjectToDelete(null)
      reload()
    } finally {
      setDeleting(false)
    }
  }

  const setField = (key: keyof ProjectForm) => (value: string) =>
    setForm((f) => ({ ...f, [key]: value }))

  const allTableColumns = useMemo(
    () => [
      {
        key: 'name',
        label: 'Project',
        fixed: true,
        defaultWidth: '240px',
        render: (_: unknown, row: RealEstateProject) => (
          <div className="min-w-0">
            <p className="truncate font-medium text-gray-900">{row.name}</p>
            <p className="truncate text-xs text-gray-500">{row.developerName || '—'}</p>
          </div>
        ),
      },
      {
        key: 'location',
        visibilityKey: 'location',
        label: 'Location',
        defaultWidth: '160px',
        render: (value: string | null) => <span className="whitespace-nowrap text-gray-700">{value || '—'}</span>,
      },
      {
        key: 'price',
        visibilityKey: 'price',
        label: 'Price range',
        defaultWidth: '180px',
        render: (_: unknown, row: RealEstateProject) => (
          <span className="whitespace-nowrap text-gray-700">
            {row.minPrice || row.maxPrice
              ? `${formatInr(row.minPrice)} – ${formatInr(row.maxPrice)}`
              : '—'}
          </span>
        ),
      },
      {
        key: 'configurations',
        visibilityKey: 'configurations',
        label: 'Configs',
        defaultWidth: '150px',
        render: (value: string[] | null) => (
          <span className="whitespace-nowrap text-gray-700">{(value || []).join(', ') || '—'}</span>
        ),
      },
      {
        key: 'possessionDate',
        visibilityKey: 'possessionDate',
        label: 'Possession',
        defaultWidth: '150px',
        render: (value: string | null) => (
          <span className="whitespace-nowrap text-gray-700">{formatDate(value)}</span>
        ),
      },
      {
        key: 'metaCampaignId',
        visibilityKey: 'metaCampaignId',
        label: 'Meta campaign',
        defaultWidth: '170px',
        render: (value: string | null) =>
          value ? (
            <span className="whitespace-nowrap font-mono text-xs text-gray-600">{value}</span>
          ) : (
            <span className="text-gray-400">not linked</span>
          ),
      },
      {
        key: 'status',
        visibilityKey: 'status',
        label: 'Status',
        defaultWidth: '130px',
        render: (value: ProjectStatus) => (
          <Badge variant={STATUS_VARIANTS[value] || 'default'} size="sm">
            {PROJECT_STATUS_LABELS[value] || value || '—'}
          </Badge>
        ),
      },
      {
        key: 'actions',
        label: 'Actions',
        fixed: true,
        resizable: false,
        defaultWidth: '110px',
        render: (_: unknown, row: RealEstateProject) => (
          <div className="flex min-w-[90px] items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="sm"
              className="p-2 text-teal-600 hover:bg-teal-50"
              title="More options"
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.stopPropagation()
                const r = e.currentTarget.getBoundingClientRect()
                setMoreActionMenu((prev) =>
                  prev?.id === row.id
                    ? null
                    : { id: row.id, top: r.bottom + 4, left: r.left, triggerEl: e.currentTarget }
                )
              }}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="p-2 text-emerald-600 hover:bg-emerald-50"
              title="Edit project"
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation()
                openEdit(row)
              }}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="p-2 text-red-600 hover:bg-red-50"
              title="Delete project"
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation()
                setProjectToDelete(row)
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    []
  )

  const visibleTableColumns = useMemo(() => {
    const byKey = Object.fromEntries(allTableColumns.map((c) => [c.key, c]))
    const out: any[] = []
    if (byKey.name) out.push(byKey.name)
    for (const key of columnOrder) {
      if (columnVisibility[key] && byKey[key]) out.push(byKey[key])
    }
    if (byKey.actions) out.push(byKey.actions)
    return bindSortableColumns(out, SORTABLE_KEYS)
  }, [allTableColumns, columnVisibility, columnOrder, bindSortableColumns])

  return (
    <div className="space-y-6 p-4 md:p-6">
      <EstatePageHeader
        title="Projects"
        subtitle="Properties marketed through Meta campaigns and landing pages."
        breadcrumb={[
          { label: 'Dashboard', href: '/' },
          { label: 'Projects', href: '/projects' },
        ]}
        actions={
          <Button variant="primary" onClick={openCreate}>
            <span className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add project
            </span>
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KPICard title="Total projects" value={String(projects.length)} icon={Building2} colorScheme="orange" />
        <KPICard title="Active" value={String(activeCount)} icon={CheckCircle2} colorScheme="orange" />
        <KPICard title="Upcoming" value={String(upcomingCount)} icon={Clock3} colorScheme="orange" />
      </div>

      <div className="relative" ref={toolbarRef}>
        <TabsWithActions
          tabs={[{ key: 'all', label: 'All projects', badge: String(projects.length) }]}
          activeTab="all"
          onTabChange={() => {}}
          showSearch
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search name, developer, location…"
          showAdd
          onAddClick={openCreate}
          addTitle="Add project"
          showColumnVisibility
          onColumnVisibilityClick={() => {
            setColumnPickerOpen((o: boolean) => !o)
            setSortOpen(false)
          }}
          columnVisibilityTitle="Show, hide, or reorder columns"
          showSort
          onSortClick={() => {
            setSortOpen((o) => !o)
            setColumnPickerOpen(false)
          }}
          hasActiveSort={hasActiveSort}
          sortTitle="Sort columns"
        />
        <TableSortDropdown
          open={sortOpen}
          sortRules={sortRules}
          columnOptions={SORT_COLUMN_OPTIONS}
          onAddRule={addSortRule}
          onRemoveRule={removeSortRule}
          onSetDirection={setRuleDirection}
          onMoveRule={moveSortRule}
          onClear={clearSort}
        />
        <TableColumnPicker
          open={columnPickerOpen}
          description="Project and actions stay visible. Drag the grip to reorder; drag column edges in the table to resize."
          reorderableRows={TOGGLEABLE_COLUMNS}
          columnVisibility={columnVisibility}
          columnOrder={columnOrder}
          columnDropIndicator={columnDropIndicator}
          onSetVisible={setColumnVisible}
          onDragStart={handleColumnDragStart}
          onDragEnd={handleColumnDragEnd}
          onRowDragOver={handleColumnRowDragOver}
          onListDragLeave={handleColumnListDragLeave}
          onDrop={handleColumnDrop}
          onReset={resetColumnTablePreferences}
        />
      </div>

      <div className="text-sm text-gray-600">
        Showing <span className="font-semibold text-gray-900">{pageRows.length}</span> of{' '}
        <span className="font-semibold text-gray-900">{filtered.length}</span> project
        {filtered.length !== 1 ? 's' : ''}
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No projects found"
            description={
              debouncedSearch
                ? 'No projects match your search.'
                : 'Create a project, link its Meta campaign id, and leads will route to it automatically.'
            }
            action={
              <Button variant="primary" onClick={openCreate}>
                Add project
              </Button>
            }
          />
        ) : (
          <>
            <Table
              columns={visibleTableColumns}
              data={pageRows}
              keyField="id"
              variant="modernEmbedded"
              onRowClick={(row: RealEstateProject) => router.push(`/projects/${row.id}`)}
              {...tableResizeProps}
            />
            {pageCount > 1 && (
              <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
                <Pagination
                  currentPage={page}
                  totalPages={pageCount}
                  totalItems={filtered.length}
                  itemsPerPage={PAGE_SIZE}
                  onPageChange={setPage}
                />
              </div>
            )}
          </>
        )}
      </div>

      {moreActionMenu &&
        (() => {
          const row = projects.find((p) => p.id === moreActionMenu.id)
          if (!row) return null
          return (
            <TableRowActionMenuPortal
              open
              anchor={{
                top: moreActionMenu.top,
                left: moreActionMenu.left,
                triggerEl: moreActionMenu.triggerEl,
              }}
              onClose={() => setMoreActionMenu(null)}
            >
              <button
                type="button"
                className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-teal-50 hover:text-teal-700"
                onClick={() => {
                  setMoreActionMenu(null)
                  router.push(`/projects/${row.id}`)
                }}
              >
                <Building2 className="h-4 w-4 shrink-0 text-teal-600" />
                Open project
              </button>
            </TableRowActionMenuPortal>
          )
        })()}

      <Modal
        isOpen={!!projectToDelete}
        onClose={() => {
          if (!deleting) setProjectToDelete(null)
        }}
        title="Delete project"
        size="md"
        closeOnBackdrop={!deleting}
      >
        {projectToDelete ? (
          <div className="space-y-5">
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
              <Trash2 className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
              <p className="text-sm text-red-900">
                <span className="font-semibold">This action cannot be undone</span>
              </p>
            </div>
            <p className="text-sm text-gray-700">
              Are you sure you want to delete{' '}
              <span className="font-semibold text-gray-900">{projectToDelete.name}</span>? Leads linked
              to this project will remain but lose their project reference.
            </p>
            <div className="mt-1 flex flex-col-reverse gap-3 border-t border-gray-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <Button
                type="button"
                variant="outline"
                disabled={deleting}
                onClick={() => setProjectToDelete(null)}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                disabled={deleting}
                onClick={confirmDelete}
                className="w-full min-w-[9rem] sm:w-auto"
              >
                {deleting ? 'Deleting…' : 'Delete project'}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        isOpen={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'Add project' : 'Edit project'}
        size="xl"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Project name"
            required
            value={form.name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setField('name')(e.target.value)}
            placeholder="Skyline Residences"
          />
          <Input
            label="Developer"
            value={form.developerName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setField('developerName')(e.target.value)}
            placeholder="Acme Developers"
          />
          <Input
            label="Location"
            value={form.location}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setField('location')(e.target.value)}
            placeholder="Baner, Pune"
          />
          <Select
            label="Status"
            value={form.status}
            onChange={(v: ProjectStatus) => setForm((f) => ({ ...f, status: v }))}
            options={PROJECT_STATUSES.map((s) => ({ value: s, label: PROJECT_STATUS_LABELS[s] }))}
          />
          <Input
            label="Min price (₹)"
            type="number"
            value={form.minPrice}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setField('minPrice')(e.target.value)}
            placeholder="8000000"
          />
          <Input
            label="Max price (₹)"
            type="number"
            value={form.maxPrice}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setField('maxPrice')(e.target.value)}
            placeholder="15000000"
          />
          <Input
            label="Configurations (comma-separated)"
            value={form.configurations}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setField('configurations')(e.target.value)}
            placeholder="2BHK, 3BHK"
          />
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Possession date</label>
            <input
              type="date"
              value={form.possessionDate}
              onChange={(e) => setField('possessionDate')(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
          </div>
          <Input
            label="Landing page URL"
            value={form.landingPageUrl}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setField('landingPageUrl')(e.target.value)}
            placeholder="https://…"
          />
          <Input
            label="Meta campaign ID"
            value={form.metaCampaignId}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setField('metaCampaignId')(e.target.value)}
            placeholder="1203981234567"
          />
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setEditing(null)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={save} disabled={busy}>
            {busy ? 'Saving…' : editing === 'new' ? 'Create project' : 'Save changes'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
