'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Flame,
  Plus,
  Snowflake,
  ThermometerSun,
  Users,
  Pencil,
  Phone,
  Mail,
  Trash2,
  MoreHorizontal,
  Link2,
  CalendarPlus,
} from 'lucide-react'
import {
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
  TableSortDropdown,
  TableRowActionMenuPortal,
  TabsWithActions,
  buildUserSelectOptions,
  useTableColumnPreferences,
  useTableSort,
} from '@webfudge/ui'
import {
  listLeads,
  bulkAssign,
  bulkUpdateStatus,
  createLead,
  deleteLead,
  type LeadFilters,
} from '../lib/api/leadService'
import { listProjects } from '../lib/api/projectService'
import { listOrgUsers, userLabel } from '../lib/api/userService'
import TierPill from './TierPill'
import LeadStatusBadge from './LeadStatusBadge'
import EstatePageHeader from './EstatePageHeader'
import { formatPageTimeCell } from './PageTimeCell'
import { formatTimeline, formatPurpose, formatSource } from '../lib/format'
import {
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  type LeadStatus,
  type OrgUser,
  type RealEstateLead,
  type RealEstateProject,
} from '../lib/types'

const PAGE_SIZE = 15

const SOURCE_OPTIONS = [
  { value: '', label: 'All sources' },
  { value: 'meta_instant_form', label: 'Meta form' },
  { value: 'meta_whatsapp', label: 'Meta WhatsApp' },
  { value: 'landing_page', label: 'Landing page' },
  { value: 'manual', label: 'Manual' },
]

const TIMELINE_OPTIONS = [
  { value: '', label: 'Not disclosed' },
  { value: 'immediate', label: 'Immediate' },
  { value: 'three_to_six_months', label: '3–6 months' },
  { value: 'browsing', label: 'Just browsing' },
]

const PURPOSE_OPTIONS = [
  { value: '', label: 'Not disclosed' },
  { value: 'own_use', label: 'Own use' },
  { value: 'investment', label: 'Investment' },
]

interface AddLeadForm {
  name: string
  phone: string
  email: string
  budgetRange: string
  timeline: string
  purpose: string
  configInterest: string
  project: string
  assignedTo: string
}

const EMPTY_ADD_FORM: AddLeadForm = {
  name: '',
  phone: '',
  email: '',
  budgetRange: '',
  timeline: '',
  purpose: '',
  configInterest: '',
  project: '',
  assignedTo: '',
}

const ALL_TOGGLEABLE_COLUMNS = [
  { key: 'project', label: 'Project' },
  { key: 'budgetRange', label: 'Budget' },
  { key: 'timeline', label: 'Timeline' },
  { key: 'purpose', label: 'Purpose' },
  { key: 'pageTimeSeconds', label: 'Page time' },
  { key: 'score', label: 'Score' },
  { key: 'tier', label: 'Tier' },
  { key: 'status', label: 'Status' },
  { key: 'assignedTo', label: 'Assigned' },
  { key: 'source', label: 'Source' },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email' },
  { key: 'createdAt', label: 'Created' },
]

const DEFAULT_ON_KEYS = new Set([
  'project',
  'budgetRange',
  'timeline',
  'purpose',
  'pageTimeSeconds',
  'score',
  'tier',
  'status',
  'assignedTo',
])

const DEFAULT_COLUMN_WIDTHS: Record<string, number> = {
  _select: 48,
  name: 240,
  project: 160,
  budgetRange: 130,
  timeline: 130,
  purpose: 120,
  pageTimeSeconds: 120,
  score: 90,
  tier: 110,
  status: 140,
  assignedTo: 180,
  source: 130,
  phone: 150,
  email: 210,
  createdAt: 160,
  actions: 150,
}

const MIN_COLUMN_WIDTHS: Record<string, number> = {
  _select: 48,
  name: 200,
  actions: 130,
}

const SORT_COLUMN_OPTIONS = [
  { key: 'name', label: 'Lead name' },
  { key: 'score', label: 'Score' },
  { key: 'tier', label: 'Tier' },
  { key: 'status', label: 'Status' },
  { key: 'budgetRange', label: 'Budget' },
  { key: 'timeline', label: 'Timeline' },
  { key: 'purpose', label: 'Purpose' },
  { key: 'pageTimeSeconds', label: 'Page time' },
  { key: 'source', label: 'Source' },
  { key: 'createdAt', label: 'Created' },
]

const SORTABLE_KEYS = SORT_COLUMN_OPTIONS.map((o) => o.key)

interface ModalFilters {
  status: string
  source: string
  project: string
  assignedTo: string
  createdFrom: string
  createdTo: string
}

const EMPTY_MODAL_FILTERS: ModalFilters = {
  status: '',
  source: '',
  project: '',
  assignedTo: '',
  createdFrom: '',
  createdTo: '',
}

interface ActionMenuAnchor {
  id: string | number
  top: number
  left: number
  triggerEl: HTMLElement
}

export interface LeadsWorkspaceProps {
  /** When set, scopes the whole workspace to a single project. */
  lockedProjectId?: string | number
  /** Render the Estate page header (title/subtitle/breadcrumb + Add button). */
  showHeader?: boolean
  /** Render the tier KPI card row. */
  showKpis?: boolean
  title?: string
  subtitle?: string
  breadcrumb?: { label: string; href?: string }[]
}

export default function LeadsWorkspace({
  lockedProjectId,
  showHeader = false,
  showKpis = true,
  title = 'Leads',
  subtitle = 'Sorted by score — hot leads at the top, always.',
  breadcrumb,
}: LeadsWorkspaceProps) {
  const router = useRouter()
  const locked = lockedProjectId != null && lockedProjectId !== ''
  const lockedProject = locked ? String(lockedProjectId) : ''

  const toggleableColumns = useMemo(
    () => (locked ? ALL_TOGGLEABLE_COLUMNS.filter((c) => c.key !== 'project') : ALL_TOGGLEABLE_COLUMNS),
    [locked]
  )
  const reorderableColumnKeys = useMemo(
    () => toggleableColumns.map((c) => c.key),
    [toggleableColumns]
  )
  const defaultColumnVisibility = useMemo(
    () =>
      toggleableColumns.reduce<Record<string, boolean>>((acc, { key }) => {
        acc[key] = DEFAULT_ON_KEYS.has(key)
        return acc
      }, {}),
    [toggleableColumns]
  )

  // Separate persisted preferences per context so the locked (project) view and
  // the global list don't clobber each other's column order/visibility.
  const keyBase = locked ? 'reCrm.leads.project' : 'reCrm.leads'

  const [leads, setLeads] = useState<RealEstateLead[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [pageCount, setPageCount] = useState(1)
  const [page, setPage] = useState(1)

  const [activeTab, setActiveTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [showFilterModal, setShowFilterModal] = useState(false)
  const [draftFilters, setDraftFilters] = useState<ModalFilters>(EMPTY_MODAL_FILTERS)
  const [appliedFilters, setAppliedFilters] = useState<ModalFilters>(EMPTY_MODAL_FILTERS)

  const [projects, setProjects] = useState<RealEstateProject[]>([])
  const [orgUsers, setOrgUsers] = useState<OrgUser[]>([])

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkStatus, setBulkStatus] = useState('')
  const [bulkAssignee, setBulkAssignee] = useState('')
  const [bulkBusy, setBulkBusy] = useState(false)

  const [tierCounts, setTierCounts] = useState({ total: 0, hot: 0, warm: 0, cold: 0 })
  const [countsLoading, setCountsLoading] = useState(true)
  const [countsRefreshKey, setCountsRefreshKey] = useState(0)

  const [sortOpen, setSortOpen] = useState(false)
  const [moreActionMenu, setMoreActionMenu] = useState<ActionMenuAnchor | null>(null)
  const [leadToDelete, setLeadToDelete] = useState<RealEstateLead | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [showAddModal, setShowAddModal] = useState(false)
  const [addForm, setAddForm] = useState<AddLeadForm>(EMPTY_ADD_FORM)
  const [addError, setAddError] = useState('')
  const [addSaving, setAddSaving] = useState(false)

  const searchTimer = useRef<ReturnType<typeof setTimeout>>()

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
    visibilityStorageKey: `${keyBase}.tableColumnVisibility`,
    orderStorageKey: `${keyBase}.tableColumnOrder`,
    widthsStorageKey: `${keyBase}.tableColumnWidths`,
    defaultVisibility: defaultColumnVisibility,
    reorderableKeys: reorderableColumnKeys,
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
    storageKey: `${keyBase}.tableSort`,
    defaultRules: [{ key: 'score', direction: 'desc' }],
  })

  const sortApiParam = useMemo(() => {
    if (!sortRules.length) return 'score:desc'
    const rule = sortRules[0] as { key: string; direction: string }
    return `${rule.key}:${rule.direction}`
  }, [sortRules])

  useEffect(() => {
    listProjects().then((res) => setProjects(res.data))
    listOrgUsers().then(setOrgUsers)
  }, [])

  useEffect(() => {
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300)
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

  const baseFilters: LeadFilters = useMemo(
    () => ({
      status: appliedFilters.status || undefined,
      source: appliedFilters.source || undefined,
      project: locked ? lockedProject : appliedFilters.project || undefined,
      assignedTo: appliedFilters.assignedTo || undefined,
      q: debouncedSearch || undefined,
      createdFrom: appliedFilters.createdFrom
        ? new Date(appliedFilters.createdFrom).toISOString()
        : undefined,
      createdTo: appliedFilters.createdTo
        ? new Date(`${appliedFilters.createdTo}T23:59:59`).toISOString()
        : undefined,
    }),
    [appliedFilters, debouncedSearch, locked, lockedProject]
  )

  const filters: LeadFilters = useMemo(
    () => ({
      ...baseFilters,
      tier: activeTab !== 'all' ? activeTab : undefined,
    }),
    [baseFilters, activeTab]
  )

  useEffect(() => {
    let cancelled = false
    setCountsLoading(true)
    const count = (tier?: string) =>
      listLeads({ page: 1, pageSize: 1, filters: { ...baseFilters, tier } }).then(
        (res) => res.meta.pagination.total
      )
    Promise.all([count(), count('hot'), count('warm'), count('cold')]).then(
      ([total, hot, warm, cold]) => {
        if (cancelled) return
        setTierCounts({ total, hot, warm, cold })
        setCountsLoading(false)
      }
    )
    return () => {
      cancelled = true
    }
  }, [baseFilters, countsRefreshKey])

  const loadLeads = useCallback(() => {
    setLoading(true)
    listLeads({ page, pageSize: PAGE_SIZE, sort: sortApiParam, filters }).then((res) => {
      setLeads(res.data)
      setTotal(res.meta.pagination.total)
      setPageCount(res.meta.pagination.pageCount)
      setLoading(false)
    })
  }, [page, filters, sortApiParam])

  useEffect(() => {
    loadLeads()
  }, [loadLeads])

  const refreshData = useCallback(() => {
    loadLeads()
    setCountsRefreshKey((k) => k + 1)
  }, [loadLeads])

  useEffect(() => {
    setPage(1)
    setSelectedIds(new Set())
  }, [activeTab, debouncedSearch, appliedFilters, sortApiParam])

  const hasActiveFilters = Object.values(appliedFilters).some(Boolean)

  const toggleSelected = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const allOnPageSelected = leads.length > 0 && leads.every((l) => selectedIds.has(String(l.id)))

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (leads.every((l) => prev.has(String(l.id)))) return new Set()
      return new Set(leads.map((l) => String(l.id)))
    })
  }, [leads])

  const runBulk = async () => {
    const ids = Array.from(selectedIds)
    if (!ids.length || (!bulkStatus && !bulkAssignee)) return
    setBulkBusy(true)
    if (bulkStatus) await bulkUpdateStatus(ids, bulkStatus as LeadStatus)
    if (bulkAssignee) await bulkAssign(ids, Number(bulkAssignee))
    setBulkBusy(false)
    setBulkStatus('')
    setBulkAssignee('')
    setSelectedIds(new Set())
    refreshData()
  }

  const confirmDelete = async () => {
    if (!leadToDelete) return
    setDeleting(true)
    try {
      await deleteLead(leadToDelete.id)
      setLeads((prev) => prev.filter((l) => l.id !== leadToDelete.id))
      setLeadToDelete(null)
      refreshData()
    } finally {
      setDeleting(false)
    }
  }

  const openAddModal = useCallback(() => {
    setAddForm({ ...EMPTY_ADD_FORM, project: locked ? lockedProject : '' })
    setAddError('')
    setShowAddModal(true)
  }, [locked, lockedProject])

  const setAddField = useCallback(
    (key: keyof AddLeadForm, value: string) => setAddForm((f) => ({ ...f, [key]: value })),
    []
  )

  const submitAddLead = async () => {
    if (!addForm.name.trim()) {
      setAddError('Name is required')
      return
    }
    setAddError('')
    setAddSaving(true)
    try {
      await createLead({
        name: addForm.name.trim(),
        phone: addForm.phone || undefined,
        email: addForm.email || undefined,
        budgetRange: addForm.budgetRange || undefined,
        timeline: (addForm.timeline || undefined) as any,
        purpose: (addForm.purpose || undefined) as any,
        configInterest: addForm.configInterest || undefined,
        source: 'manual',
        project: addForm.project ? Number(addForm.project) : undefined,
        assignedTo: addForm.assignedTo ? Number(addForm.assignedTo) : undefined,
      })
      setShowAddModal(false)
      setAddForm(EMPTY_ADD_FORM)
      refreshData()
    } catch (err: any) {
      setAddError(err?.message || 'Failed to create lead. Please try again.')
    } finally {
      setAddSaving(false)
    }
  }

  const allTableColumns = useMemo(
    () => [
      {
        key: '_select',
        label: '',
        fixed: true,
        resizable: false,
        defaultWidth: '48px',
        className: '!px-4',
        headerClassName: '!px-4',
        render: (_: unknown, row: RealEstateLead) => (
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
            checked={selectedIds.has(String(row.id))}
            onClick={(e) => e.stopPropagation()}
            onChange={() => toggleSelected(String(row.id))}
            aria-label={`Select ${row.name}`}
          />
        ),
      },
      {
        key: 'name',
        label: 'Lead',
        fixed: true,
        defaultWidth: '240px',
        render: (_: unknown, row: RealEstateLead) => (
          <div className="min-w-0">
            <p className="truncate font-medium text-gray-900">{row.name}</p>
            <p className="truncate text-xs text-gray-500">
              {row.phone || row.email || formatSource(row.source)}
            </p>
          </div>
        ),
      },
      {
        key: 'project',
        visibilityKey: 'project',
        label: 'Project',
        defaultWidth: '160px',
        render: (_: unknown, row: RealEstateLead) => (
          <span className="truncate text-gray-700">{row.project?.name || '—'}</span>
        ),
      },
      {
        key: 'budgetRange',
        visibilityKey: 'budgetRange',
        label: 'Budget',
        defaultWidth: '130px',
        render: (value: string | null) => (
          <span className="whitespace-nowrap text-gray-700">{value || '—'}</span>
        ),
      },
      {
        key: 'timeline',
        visibilityKey: 'timeline',
        label: 'Timeline',
        defaultWidth: '130px',
        render: (value: string | null) => (
          <span className="whitespace-nowrap text-gray-700">{formatTimeline(value)}</span>
        ),
      },
      {
        key: 'purpose',
        visibilityKey: 'purpose',
        label: 'Purpose',
        defaultWidth: '120px',
        render: (value: string | null) => (
          <span className="whitespace-nowrap text-gray-700">{formatPurpose(value)}</span>
        ),
      },
      {
        key: 'pageTimeSeconds',
        visibilityKey: 'pageTimeSeconds',
        label: 'Page time',
        defaultWidth: '120px',
        render: (_: unknown, row: RealEstateLead) => formatPageTimeCell(row),
      },
      {
        key: 'score',
        visibilityKey: 'score',
        label: 'Score',
        defaultWidth: '90px',
        render: (value: number) => (
          <span className="font-bold tabular-nums text-gray-900">{value ?? 0}</span>
        ),
      },
      {
        key: 'tier',
        visibilityKey: 'tier',
        label: 'Tier',
        defaultWidth: '110px',
        render: (value: string) => <TierPill tier={(value as RealEstateLead['tier']) || 'cold'} />,
      },
      {
        key: 'status',
        visibilityKey: 'status',
        label: 'Status',
        defaultWidth: '140px',
        render: (value: LeadStatus) => <LeadStatusBadge status={value || 'new'} />,
      },
      {
        key: 'assignedTo',
        visibilityKey: 'assignedTo',
        label: 'Assigned',
        defaultWidth: '180px',
        render: (_: unknown, row: RealEstateLead) => (
          <span className="whitespace-nowrap text-gray-600">
            {row.assignedTo ? userLabel(row.assignedTo as OrgUser) : 'Unassigned'}
          </span>
        ),
      },
      {
        key: 'source',
        visibilityKey: 'source',
        label: 'Source',
        defaultWidth: '130px',
        render: (_: unknown, row: RealEstateLead) => (
          <span className="whitespace-nowrap capitalize text-gray-600">
            {formatSource(row.source)}
          </span>
        ),
      },
      {
        key: 'phone',
        visibilityKey: 'phone',
        label: 'Phone',
        defaultWidth: '150px',
        render: (_: unknown, row: RealEstateLead) => (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Phone className="h-4 w-4 flex-shrink-0 text-gray-400" />
            <span className="truncate">{row.phone || '—'}</span>
          </div>
        ),
      },
      {
        key: 'email',
        visibilityKey: 'email',
        label: 'Email',
        defaultWidth: '210px',
        render: (_: unknown, row: RealEstateLead) => (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Mail className="h-4 w-4 flex-shrink-0 text-gray-400" />
            <span className="truncate">{row.email || '—'}</span>
          </div>
        ),
      },
      {
        key: 'createdAt',
        visibilityKey: 'createdAt',
        label: 'Created',
        defaultWidth: '160px',
        render: (_: unknown, row: RealEstateLead) => (
          <span className="whitespace-nowrap text-gray-600">
            {row.createdAt ? new Date(row.createdAt).toLocaleDateString('en-IN') : '—'}
          </span>
        ),
      },
      {
        key: 'actions',
        label: 'Actions',
        fixed: true,
        resizable: false,
        defaultWidth: '150px',
        render: (_: unknown, row: RealEstateLead) => (
          <div className="flex min-w-[130px] items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
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
              title="Edit lead"
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation()
                router.push(`/leads/${row.id}/edit`)
              }}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="p-2 text-orange-600 hover:bg-orange-50 disabled:opacity-40"
              title="Send mail"
              disabled={!row.email}
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation()
                if (row.email) window.location.href = `mailto:${row.email}`
              }}
            >
              <Mail className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="p-2 text-red-600 hover:bg-red-50"
              title="Delete lead"
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation()
                setLeadToDelete(row)
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    [router, selectedIds, toggleSelected]
  )

  const visibleTableColumns = useMemo(() => {
    const byKey = Object.fromEntries(allTableColumns.map((c) => [c.key, c]))
    const out: any[] = []
    if (byKey._select) out.push(byKey._select)
    if (byKey.name) out.push(byKey.name)
    for (const key of columnOrder) {
      if (locked && key === 'project') continue
      if (columnVisibility[key] && byKey[key]) out.push(byKey[key])
    }
    if (byKey.actions) out.push(byKey.actions)
    return bindSortableColumns(out, SORTABLE_KEYS)
  }, [allTableColumns, columnVisibility, columnOrder, bindSortableColumns, locked])

  const projectOptions = useMemo(
    () => [
      { value: '', label: 'All projects' },
      ...projects.map((p) => ({ value: String(p.id), label: p.name })),
    ],
    [projects]
  )

  const userOptions = useMemo(
    () => [{ value: '', label: 'Anyone' }, ...buildUserSelectOptions(orgUsers)],
    [orgUsers]
  )

  const tabItems = useMemo(
    () => [
      { key: 'all', label: 'All leads', badge: String(tierCounts.total) },
      { key: 'hot', label: 'Hot', badge: String(tierCounts.hot) },
      { key: 'warm', label: 'Warm', badge: String(tierCounts.warm) },
      { key: 'cold', label: 'Cold', badge: String(tierCounts.cold) },
    ],
    [tierCounts]
  )

  return (
    <div className={showHeader ? 'space-y-6 p-4 md:p-6' : 'space-y-6'}>
      {showHeader && (
        <EstatePageHeader
          title={title}
          subtitle={subtitle}
          breadcrumb={breadcrumb}
          actions={
            <Button variant="primary" onClick={openAddModal}>
              <span className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add lead
              </span>
            </Button>
          }
        />
      )}

      {showKpis && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KPICard
            title="Total leads"
            value={countsLoading ? '—' : String(tierCounts.total)}
            subtitle="Matching current filters"
            icon={Users}
            colorScheme="orange"
            onClick={() => setActiveTab('all')}
          />
          <KPICard
            title="Hot leads"
            value={countsLoading ? '—' : String(tierCounts.hot)}
            subtitle="Score ≥ 70"
            icon={Flame}
            colorScheme="orange"
            onClick={() => setActiveTab('hot')}
          />
          <KPICard
            title="Warm leads"
            value={countsLoading ? '—' : String(tierCounts.warm)}
            subtitle="Nurture next"
            icon={ThermometerSun}
            colorScheme="orange"
            onClick={() => setActiveTab('warm')}
          />
          <KPICard
            title="Cold leads"
            value={countsLoading ? '—' : String(tierCounts.cold)}
            subtitle="Low intent"
            icon={Snowflake}
            colorScheme="orange"
            onClick={() => setActiveTab('cold')}
          />
        </div>
      )}

      {/* Tabs + toolbar (search / add / filter / columns / sort) */}
      <div className="relative" ref={toolbarRef}>
        <TabsWithActions
          tabs={tabItems}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          showSearch
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search name, phone, email…"
          showAdd
          onAddClick={openAddModal}
          addTitle="Add lead"
          showFilter
          onFilterClick={() => {
            setDraftFilters(appliedFilters)
            setShowFilterModal(true)
          }}
          filterTitle={hasActiveFilters ? 'Filters active' : 'Filter'}
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
          description="Lead and actions stay visible. Drag the grip to reorder; drag column edges in the table to resize."
          reorderableRows={toggleableColumns}
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

      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3">
          <span className="text-sm font-semibold text-orange-900">{selectedIds.size} selected</span>
          <div className="w-44">
            <Select
              value={bulkStatus}
              onChange={(v: string) => setBulkStatus(v)}
              options={LEAD_STATUSES.map((s) => ({ value: s, label: LEAD_STATUS_LABELS[s] }))}
              placeholder="Change status…"
            />
          </div>
          <div className="w-44">
            <Select
              value={bulkAssignee}
              onChange={(v: string) => setBulkAssignee(v)}
              options={buildUserSelectOptions(orgUsers)}
              placeholder="Assign to…"
            />
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={runBulk}
            disabled={bulkBusy || (!bulkStatus && !bulkAssignee)}
          >
            {bulkBusy ? 'Applying…' : 'Apply'}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
            Clear
          </Button>
        </div>
      )}

      <div className="text-sm text-gray-600">
        Showing <span className="font-semibold text-gray-900">{leads.length}</span> of{' '}
        <span className="font-semibold text-gray-900">{total}</span> lead{total !== 1 ? 's' : ''}
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner />
          </div>
        ) : leads.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No leads found"
            description={
              hasActiveFilters || debouncedSearch || activeTab !== 'all'
                ? 'No leads match the current filters.'
                : locked
                  ? 'No leads for this project yet. Link this project’s Meta campaign id and incoming leads route here automatically, or add one manually.'
                  : 'Leads arrive automatically from Meta instant forms once the integration is connected, or add one manually.'
            }
            action={
              <Button variant="primary" onClick={openAddModal}>
                Add lead
              </Button>
            }
          />
        ) : (
          <>
            <div className="border-b border-gray-200 bg-gray-50 px-4 py-2">
              <label className="flex w-fit cursor-pointer items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                  checked={allOnPageSelected}
                  onChange={toggleSelectAll}
                />
                Select page
              </label>
            </div>
            <Table
              columns={visibleTableColumns}
              data={leads}
              keyField="id"
              variant="modernEmbedded"
              onRowClick={(row: RealEstateLead) => router.push(`/leads/${row.id}`)}
              {...tableResizeProps}
            />
            {pageCount > 1 && (
              <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
                <Pagination
                  currentPage={page}
                  totalPages={pageCount}
                  totalItems={total}
                  itemsPerPage={PAGE_SIZE}
                  onPageChange={setPage}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Row "more" actions menu */}
      {moreActionMenu &&
        (() => {
          const row = leads.find((l) => l.id === moreActionMenu.id)
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
                  router.push(`/leads/${row.id}`)
                }}
              >
                <CalendarPlus className="h-4 w-4 shrink-0 text-teal-600" />
                Open &amp; schedule visit
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-teal-50 hover:text-teal-700"
                onClick={() => {
                  setMoreActionMenu(null)
                  navigator.clipboard.writeText(`${window.location.origin}/leads/${row.id}`)
                }}
              >
                <Link2 className="h-4 w-4 shrink-0 text-teal-600" />
                Copy URL
              </button>
            </TableRowActionMenuPortal>
          )
        })()}

      {/* Delete confirmation */}
      <Modal
        isOpen={!!leadToDelete}
        onClose={() => {
          if (!deleting) setLeadToDelete(null)
        }}
        title="Delete lead"
        size="md"
        closeOnBackdrop={!deleting}
      >
        {leadToDelete ? (
          <div className="space-y-5">
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
              <Trash2 className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
              <p className="text-sm text-red-900">
                <span className="font-semibold">This action cannot be undone</span>
              </p>
            </div>
            <p className="text-sm text-gray-700">
              Are you sure you want to delete{' '}
              <span className="font-semibold text-gray-900">{leadToDelete.name}</span>? This removes
              the lead, its score breakdown, and activity history.
            </p>
            <div className="mt-1 flex flex-col-reverse gap-3 border-t border-gray-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <Button
                type="button"
                variant="outline"
                disabled={deleting}
                onClick={() => setLeadToDelete(null)}
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
                {deleting ? 'Deleting…' : 'Delete lead'}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        isOpen={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        title="Filter leads"
        size="xl"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            label="Status"
            value={draftFilters.status}
            onChange={(v: string) => setDraftFilters((f) => ({ ...f, status: v }))}
            options={[
              { value: '', label: 'All statuses' },
              ...LEAD_STATUSES.map((s) => ({ value: s, label: LEAD_STATUS_LABELS[s] })),
            ]}
          />
          <Select
            label="Source"
            value={draftFilters.source}
            onChange={(v: string) => setDraftFilters((f) => ({ ...f, source: v }))}
            options={SOURCE_OPTIONS}
          />
          {!locked && (
            <Select
              label="Project"
              value={draftFilters.project}
              onChange={(v: string) => setDraftFilters((f) => ({ ...f, project: v }))}
              options={projectOptions}
            />
          )}
          <Select
            label="Assigned to"
            value={draftFilters.assignedTo}
            onChange={(v: string) => setDraftFilters((f) => ({ ...f, assignedTo: v }))}
            options={userOptions}
          />
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Created from</label>
            <input
              type="date"
              value={draftFilters.createdFrom}
              onChange={(e) => setDraftFilters((f) => ({ ...f, createdFrom: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Created to</label>
            <input
              type="date"
              value={draftFilters.createdTo}
              onChange={(e) => setDraftFilters((f) => ({ ...f, createdTo: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
          </div>
        </div>
        <div className="mt-6 flex justify-between">
          <Button
            variant="ghost"
            onClick={() => {
              setDraftFilters(EMPTY_MODAL_FILTERS)
              setAppliedFilters(EMPTY_MODAL_FILTERS)
              setShowFilterModal(false)
            }}
          >
            Reset
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowFilterModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setAppliedFilters(draftFilters)
                setShowFilterModal(false)
              }}
            >
              Apply filters
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add lead */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          if (!addSaving) setShowAddModal(false)
        }}
        title="Add lead"
        subtitle="Manually create a lead and route it to a project."
        size="lg"
        closeOnBackdrop={!addSaving}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            submitAddLead()
          }}
          className="space-y-5"
        >
          {addError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {addError}
            </div>
          )}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Name *</label>
            <Input
              value={addForm.name}
              onChange={(e: any) => setAddField('name', e.target.value)}
              placeholder="Lead name"
              className="w-full"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Phone</label>
              <Input
                value={addForm.phone}
                onChange={(e: any) => setAddField('phone', e.target.value)}
                placeholder="+91 …"
                className="w-full"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Email</label>
              <Input
                type="email"
                value={addForm.email}
                onChange={(e: any) => setAddField('email', e.target.value)}
                placeholder="lead@email.com"
                className="w-full"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Budget range</label>
              <Input
                value={addForm.budgetRange}
                onChange={(e: any) => setAddField('budgetRange', e.target.value)}
                placeholder="e.g. 80L–1.2Cr"
                className="w-full"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Configuration interest
              </label>
              <Input
                value={addForm.configInterest}
                onChange={(e: any) => setAddField('configInterest', e.target.value)}
                placeholder="e.g. 3BHK"
                className="w-full"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Timeline</label>
              <Select
                value={addForm.timeline}
                onChange={(value: string) => setAddField('timeline', value)}
                options={TIMELINE_OPTIONS}
                className="w-full"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Purpose</label>
              <Select
                value={addForm.purpose}
                onChange={(value: string) => setAddField('purpose', value)}
                options={PURPOSE_OPTIONS}
                className="w-full"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Project</label>
              <Select
                value={addForm.project}
                onChange={(value: string) => setAddField('project', value)}
                options={[{ value: '', label: 'No project' }, ...projectOptions.slice(1)]}
                className="w-full"
                disabled={locked}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Assign to</label>
              <Select
                value={addForm.assignedTo}
                onChange={(value: string) => setAddField('assignedTo', value)}
                options={[{ value: '', label: 'Unassigned' }, ...buildUserSelectOptions(orgUsers)]}
                className="w-full"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-gray-200 pt-5">
            <Button
              type="button"
              variant="outline"
              disabled={addSaving}
              onClick={() => setShowAddModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={addSaving}>
              {addSaving ? 'Saving…' : 'Create lead'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
