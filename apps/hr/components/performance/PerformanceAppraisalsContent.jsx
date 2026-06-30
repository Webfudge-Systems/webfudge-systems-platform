'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Edit, Eye, Plus, Trash2, TrendingUp } from 'lucide-react'
import {
  Button,
  Modal,
  Table,
  TableColumnPicker,
  TableEmptyBelow,
  TableResultsCount,
  TableSortDropdown,
  TabsWithActions,
  useTableColumnPreferences,
  useTableSort,
} from '@webfudge/ui'
import HRDataTableCard from '../shared/HRDataTableCard'
import AddAppraisalModal from './AddAppraisalModal'
import AppraisalDetailModal from './AppraisalDetailModal'
import AppraisalEditModal from './AppraisalEditModal'
import {
  AppraisalEffectiveCell,
  AppraisalEmployeeCell,
  AppraisalPromotionPill,
  AppraisalRatingCell,
  AppraisalRevisionCell,
  AppraisalStatusPill,
} from './PerformanceAppraisalTableCells'
import {
  APPRAISALS_UPDATED_EVENT,
  deleteAppraisal,
  isCustomAppraisal,
  listAppraisals,
} from '../../lib/performanceAppraisalsService'
import {
  appraisalSortValue,
  filterAppraisals,
  getAppraisalTabItems,
  matchesAppraisalTab,
} from '../../lib/performancePage'

const TABLE_SORT_STORAGE_KEY = 'hr.performance.appraisals.tableSort'
const COLUMN_VISIBILITY_STORAGE_KEY = 'hr.performance.appraisals.tableColumnVisibility'
const COLUMN_ORDER_STORAGE_KEY = 'hr.performance.appraisals.tableColumnOrder'
const COLUMN_WIDTHS_STORAGE_KEY = 'hr.performance.appraisals.tableColumnWidths'

const DEFAULT_COLUMN_WIDTHS = {
  employee: 280,
  rating: 110,
  revision: 110,
  promotion: 140,
  effective: 130,
  status: 130,
  actions: 160,
}

const MIN_COLUMN_WIDTHS = { actions: 140 }

const TOGGLEABLE_COLUMNS = [
  { key: 'rating', label: 'Rating' },
  { key: 'revision', label: 'Revision' },
  { key: 'promotion', label: 'Promotion' },
  { key: 'effective', label: 'Effective date' },
  { key: 'status', label: 'Status' },
]

const DEFAULT_COLUMN_VISIBILITY = TOGGLEABLE_COLUMNS.reduce((acc, { key }) => ({ ...acc, [key]: true }), {})
const SORT_COLUMN_OPTIONS = [{ key: 'employee', label: 'Employee' }, ...TOGGLEABLE_COLUMNS]
const SORTABLE_KEYS = SORT_COLUMN_OPTIONS.map((column) => column.key)

const EMPTY_COPY = {
  all: {
    title: 'No appraisals found',
    description: 'Add employee appraisals to finalize ratings and revisions.',
  },
  pending: {
    title: 'No pending appraisals',
    description: 'Appraisals awaiting approval will appear here.',
  },
  approved: {
    title: 'No approved appraisals',
    description: 'Approved appraisals are listed here after sign-off.',
  },
}

export default function PerformanceAppraisalsContent() {
  const [appraisals, setAppraisals] = useState([])
  const [activeTab, setActiveTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [sortPickerOpen, setSortPickerOpen] = useState(false)
  const [selectedAppraisal, setSelectedAppraisal] = useState(null)
  const [editingAppraisal, setEditingAppraisal] = useState(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [actionError, setActionError] = useState('')

  const openDetail = (appraisal) => setSelectedAppraisal(appraisal)
  const openEdit = (appraisal) => {
    setSelectedAppraisal(null)
    setEditingAppraisal(appraisal)
  }
  const closeDetail = () => {
    if (deleting) return
    setSelectedAppraisal(null)
    setDeleteOpen(false)
  }
  const closeEdit = () => {
    setEditingAppraisal(null)
  }

  const loadAppraisals = useCallback(() => {
    setAppraisals(listAppraisals())
  }, [])

  useEffect(() => {
    loadAppraisals()
  }, [loadAppraisals])

  useEffect(() => {
    const onUpdated = () => loadAppraisals()
    window.addEventListener(APPRAISALS_UPDATED_EVENT, onUpdated)
    return () => window.removeEventListener(APPRAISALS_UPDATED_EVENT, onUpdated)
  }, [loadAppraisals])

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
    reorderableKeys: TOGGLEABLE_COLUMNS.map((column) => column.key),
    defaultWidths: DEFAULT_COLUMN_WIDTHS,
    minWidths: MIN_COLUMN_WIDTHS,
  })

  const {
    sortRules,
    sortData,
    bindSortableColumns,
    hasActiveSort,
    addSortRule,
    removeSortRule,
    setRuleDirection,
    moveSortRule,
    clearSort,
    maxRules: sortMaxRules,
  } = useTableSort({ storageKey: TABLE_SORT_STORAGE_KEY })

  const handleAppraisalSaved = useCallback((saved) => {
    loadAppraisals()
    setSearchQuery('')
    if (saved?.status === 'Approved') {
      setActiveTab('approved')
      return
    }
    if (saved?.status === 'Pending') {
      setActiveTab('pending')
      return
    }
    setActiveTab('all')
  }, [loadAppraisals])

  useEffect(() => {
    if (!columnPickerOpen && !sortPickerOpen) return undefined
    const onDocMouseDown = (event) => {
      if (toolbarRef.current?.contains(event.target)) return
      setColumnPickerOpen(false)
      setSortPickerOpen(false)
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [columnPickerOpen, sortPickerOpen, setColumnPickerOpen, toolbarRef])

  const tabItems = useMemo(() => getAppraisalTabItems(appraisals), [appraisals])

  const filteredAppraisals = useMemo(() => {
    return filterAppraisals(appraisals, searchQuery).filter((row) => matchesAppraisalTab(row, activeTab))
  }, [appraisals, searchQuery, activeTab])

  const sortedRows = useMemo(
    () => sortData(filteredAppraisals, (row, key) => appraisalSortValue(row, key)),
    [filteredAppraisals, sortData, sortRules],
  )

  const tableRows = useMemo(
    () => sortedRows.map((row) => ({ ...row, id: row.id || row.employee })),
    [sortedRows],
  )

  const appraisalColumns = useMemo(
    () => [
      {
        key: 'employee',
        label: 'EMPLOYEE',
        fixed: true,
        render: (_, row) => <AppraisalEmployeeCell row={row} />,
      },
      {
        key: 'rating',
        visibilityKey: 'rating',
        label: 'RATING',
        render: (_, row) => <AppraisalRatingCell row={row} />,
      },
      {
        key: 'revision',
        visibilityKey: 'revision',
        label: 'REVISION',
        render: (_, row) => <AppraisalRevisionCell row={row} />,
      },
      {
        key: 'promotion',
        visibilityKey: 'promotion',
        label: 'PROMOTION',
        render: (_, row) => <AppraisalPromotionPill row={row} />,
      },
      {
        key: 'effective',
        visibilityKey: 'effective',
        label: 'EFFECTIVE',
        render: (_, row) => <AppraisalEffectiveCell row={row} />,
      },
      {
        key: 'status',
        visibilityKey: 'status',
        label: 'STATUS',
        render: (_, row) => <AppraisalStatusPill row={row} />,
      },
      {
        key: 'actions',
        label: 'ACTIONS',
        fixed: true,
        resizable: false,
        width: 160,
        defaultWidth: '160px',
        headerClassName: 'whitespace-nowrap text-right',
        className: 'whitespace-nowrap text-right align-middle',
        render: (_, row) => (
          <div
            className="flex min-w-[140px] shrink-0 items-center justify-end gap-0.5"
            onClick={(event) => event.stopPropagation()}
          >
            <Button
              variant="ghost"
              size="sm"
              className="p-2 text-emerald-600 hover:bg-emerald-50"
              title="View appraisal"
              onClick={() => openDetail(row)}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="p-2 text-orange-600 hover:bg-orange-50"
              title={isCustomAppraisal(row) ? 'Edit appraisal' : 'Sample appraisal cannot be edited'}
              onClick={() => openEdit(row)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="p-2 text-red-600 hover:bg-red-50"
              title={isCustomAppraisal(row) ? 'Delete appraisal' : 'Sample appraisal cannot be deleted'}
              disabled={!isCustomAppraisal(row)}
              onClick={() => {
                setActionError('')
                setSelectedAppraisal(row)
                setDeleteOpen(true)
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    [],
  )

  const visibleColumns = useMemo(() => {
    const byKey = Object.fromEntries(appraisalColumns.map((column) => [column.key, column]))
    const out = []
    if (byKey.employee) out.push(byKey.employee)
    for (const key of columnOrder) {
      const column = byKey[key]
      if (!column?.visibilityKey || !columnVisibility[column.visibilityKey]) continue
      out.push(column)
    }
    if (byKey.actions) out.push(byKey.actions)
    return bindSortableColumns(out, SORTABLE_KEYS)
  }, [appraisalColumns, columnOrder, columnVisibility, bindSortableColumns])

  const emptyCopy = EMPTY_COPY[activeTab] || EMPTY_COPY.all

  const handleDelete = async () => {
    if (!selectedAppraisal?.id) return
    try {
      setDeleting(true)
      setActionError('')
      deleteAppraisal(selectedAppraisal.id)
      setDeleteOpen(false)
      setSelectedAppraisal(null)
      setEditingAppraisal((current) => (current?.id === selectedAppraisal.id ? null : current))
      loadAppraisals()
    } catch (error) {
      setActionError(error?.message || 'Failed to delete appraisal')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <div className="relative" ref={toolbarRef}>
        <TabsWithActions
          tabs={tabItems.map((item) => ({
            key: item.key,
            label: item.label,
            badge: String(item.count),
          }))}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          showSearch
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search appraisals..."
          showAdd
          onAddClick={() => setAddOpen(true)}
          addTitle="Add Appraisal"
          showColumnVisibility
          onColumnVisibilityClick={() => {
            setSortPickerOpen(false)
            setColumnPickerOpen((open) => !open)
          }}
          columnVisibilityTitle="Show or hide columns"
          showSort
          onSortClick={() => {
            setColumnPickerOpen(false)
            setSortPickerOpen((open) => !open)
          }}
          hasActiveSort={hasActiveSort}
          sortTitle="Sort appraisals (Shift+click headers for multi-sort)"
          showExport
          onExportClick={() => console.log('Export appraisals')}
          exportTitle="Export"
          variant="glass"
        />
        <TableSortDropdown
          open={sortPickerOpen}
          sortRules={sortRules}
          columnOptions={SORT_COLUMN_OPTIONS}
          onAddRule={addSortRule}
          onRemoveRule={removeSortRule}
          onSetDirection={setRuleDirection}
          onMoveRule={moveSortRule}
          onClear={clearSort}
          maxRules={sortMaxRules}
        />
        <TableColumnPicker
          open={columnPickerOpen}
          description="Employee and actions stay visible. Drag column edges in the table to resize."
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

      {actionError ? <p className="text-sm text-red-600">{actionError}</p> : null}

      <TableResultsCount count={tableRows.length} />

      <HRDataTableCard>
        <Table
          columns={visibleColumns}
          data={tableRows}
          keyField="id"
          variant="modernEmbedded"
          {...tableResizeProps}
          onRowClick={(row) => openDetail(row)}
        />
        {tableRows.length === 0 ? (
          <TableEmptyBelow
            icon={TrendingUp}
            title={emptyCopy.title}
            description={emptyCopy.description}
            action={
              <Button variant="primary" onClick={() => setAddOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Appraisal
              </Button>
            }
          />
        ) : null}
      </HRDataTableCard>

      <AddAppraisalModal open={addOpen} onClose={() => setAddOpen(false)} onSaved={handleAppraisalSaved} />

      <AppraisalDetailModal
        appraisal={selectedAppraisal}
        open={Boolean(selectedAppraisal) && !deleteOpen && !editingAppraisal}
        onClose={closeDetail}
        onEdit={openEdit}
        onDelete={() => setDeleteOpen(true)}
        deleting={deleting}
      />

      <AppraisalEditModal
        appraisal={editingAppraisal}
        open={Boolean(editingAppraisal)}
        onClose={closeEdit}
        onSaved={async (updated) => {
          handleAppraisalSaved(updated)
          await loadAppraisals()
        }}
      />

      <Modal isOpen={deleteOpen} onClose={() => !deleting && setDeleteOpen(false)} title="Delete appraisal" size="sm">
        <p className="text-sm text-gray-600">
          Delete appraisal for{' '}
          <span className="font-semibold text-gray-900">{selectedAppraisal?.employee}</span>? This cannot be undone.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" size="sm" disabled={deleting} onClick={() => setDeleteOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            className="!bg-red-600 hover:!bg-red-700"
            disabled={deleting}
            onClick={handleDelete}
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </div>
      </Modal>
    </>
  )
}
