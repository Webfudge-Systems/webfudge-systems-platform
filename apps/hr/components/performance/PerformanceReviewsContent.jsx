'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ClipboardList, Edit, Eye, Plus, Trash2 } from 'lucide-react'
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
import AddReviewCycleModal from './AddReviewCycleModal'
import ReviewCycleDetailModal from './ReviewCycleDetailModal'
import ReviewCycleEditModal from './ReviewCycleEditModal'
import {
  ReviewCompletionCell,
  ReviewCycleCell,
  ReviewDueCell,
  ReviewStatusPill,
} from './PerformanceReviewTableCells'
import {
  deleteReviewCycle,
  isCustomReviewCycle,
  listReviewCycles,
  REVIEWS_UPDATED_EVENT,
} from '../../lib/performanceReviewsService'
import {
  filterReviewCycles,
  getReviewTabItems,
  matchesReviewTab,
  reviewCycleSortValue,
} from '../../lib/performancePage'

const TABLE_SORT_STORAGE_KEY = 'hr.performance.reviews.tableSort'
const COLUMN_VISIBILITY_STORAGE_KEY = 'hr.performance.reviews.tableColumnVisibility'
const COLUMN_ORDER_STORAGE_KEY = 'hr.performance.reviews.tableColumnOrder'
const COLUMN_WIDTHS_STORAGE_KEY = 'hr.performance.reviews.tableColumnWidths'

const DEFAULT_COLUMN_WIDTHS = {
  name: 280,
  due: 140,
  completion: 120,
  status: 130,
  actions: 160,
}

const MIN_COLUMN_WIDTHS = { actions: 140 }

const TOGGLEABLE_COLUMNS = [
  { key: 'due', label: 'Due' },
  { key: 'completion', label: 'Completion' },
  { key: 'status', label: 'Status' },
]

const DEFAULT_COLUMN_VISIBILITY = TOGGLEABLE_COLUMNS.reduce((acc, { key }) => ({ ...acc, [key]: true }), {})
const SORT_COLUMN_OPTIONS = [{ key: 'name', label: 'Cycle' }, ...TOGGLEABLE_COLUMNS]
const SORTABLE_KEYS = SORT_COLUMN_OPTIONS.map((column) => column.key)

const EMPTY_COPY = {
  all: {
    title: 'No review cycles found',
    description: 'Add a quarterly or annual review cycle to get started.',
  },
  active: {
    title: 'No active review cycles',
    description: 'Open review cycles appear here while employees complete feedback.',
  },
  closed: {
    title: 'No closed review cycles',
    description: 'Completed review cycles are archived here.',
  },
}

export default function PerformanceReviewsContent() {
  const [cycles, setCycles] = useState([])
  const [activeTab, setActiveTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [sortPickerOpen, setSortPickerOpen] = useState(false)
  const [selectedCycle, setSelectedCycle] = useState(null)
  const [editingCycle, setEditingCycle] = useState(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [actionError, setActionError] = useState('')

  const openDetail = (cycle) => setSelectedCycle(cycle)
  const openEdit = (cycle) => {
    setSelectedCycle(null)
    setEditingCycle(cycle)
  }
  const closeDetail = () => {
    if (deleting) return
    setSelectedCycle(null)
    setDeleteOpen(false)
  }
  const closeEdit = () => {
    setEditingCycle(null)
  }

  const loadCycles = useCallback(() => {
    setCycles(listReviewCycles())
  }, [])

  useEffect(() => {
    loadCycles()
  }, [loadCycles])

  useEffect(() => {
    const onUpdated = () => loadCycles()
    window.addEventListener(REVIEWS_UPDATED_EVENT, onUpdated)
    return () => window.removeEventListener(REVIEWS_UPDATED_EVENT, onUpdated)
  }, [loadCycles])

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

  const handleCycleSaved = useCallback((saved) => {
    const rows = listReviewCycles()
    setCycles(rows)
    setSearchQuery('')
    if (saved?.status === 'Active') {
      setActiveTab('active')
      return
    }
    if (saved?.status === 'Closed') {
      setActiveTab('closed')
      return
    }
    setActiveTab('all')
  }, [])

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

  const tabItems = useMemo(() => getReviewTabItems(cycles), [cycles])

  const filteredCycles = useMemo(() => {
    return filterReviewCycles(cycles, searchQuery).filter((row) => matchesReviewTab(row, activeTab))
  }, [cycles, searchQuery, activeTab])

  const sortedRows = useMemo(
    () => sortData(filteredCycles, (row, key) => reviewCycleSortValue(row, key)),
    [filteredCycles, sortData, sortRules],
  )

  const tableRows = useMemo(
    () => sortedRows.map((row) => ({ ...row, id: row.id || row.name })),
    [sortedRows],
  )

  const reviewColumns = useMemo(
    () => [
      {
        key: 'name',
        label: 'CYCLE',
        fixed: true,
        render: (_, row) => <ReviewCycleCell row={row} />,
      },
      {
        key: 'due',
        visibilityKey: 'due',
        label: 'DUE',
        render: (_, row) => <ReviewDueCell row={row} />,
      },
      {
        key: 'completion',
        visibilityKey: 'completion',
        label: 'COMPLETION',
        render: (_, row) => <ReviewCompletionCell row={row} />,
      },
      {
        key: 'status',
        visibilityKey: 'status',
        label: 'STATUS',
        render: (_, row) => <ReviewStatusPill row={row} />,
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
              title="View cycle"
              onClick={() => openDetail(row)}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="p-2 text-orange-600 hover:bg-orange-50"
              title={isCustomReviewCycle(row) ? 'Edit cycle' : 'Sample cycle cannot be edited'}
              disabled={!isCustomReviewCycle(row)}
              onClick={() => openEdit(row)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="p-2 text-red-600 hover:bg-red-50"
              title={isCustomReviewCycle(row) ? 'Delete cycle' : 'Sample cycle cannot be deleted'}
              disabled={!isCustomReviewCycle(row)}
              onClick={() => {
                setActionError('')
                setSelectedCycle(row)
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
    const byKey = Object.fromEntries(reviewColumns.map((column) => [column.key, column]))
    const out = []
    if (byKey.name) out.push(byKey.name)
    for (const key of columnOrder) {
      const column = byKey[key]
      if (!column?.visibilityKey || !columnVisibility[column.visibilityKey]) continue
      out.push(column)
    }
    if (byKey.actions) out.push(byKey.actions)
    return bindSortableColumns(out, SORTABLE_KEYS)
  }, [reviewColumns, columnOrder, columnVisibility, bindSortableColumns])

  const emptyCopy = EMPTY_COPY[activeTab] || EMPTY_COPY.all

  const handleDelete = async () => {
    if (!selectedCycle?.id) return
    try {
      setDeleting(true)
      setActionError('')
      deleteReviewCycle(selectedCycle.id)
      setDeleteOpen(false)
      setSelectedCycle(null)
      setEditingCycle((current) => (current?.id === selectedCycle.id ? null : current))
      loadCycles()
    } catch (error) {
      setActionError(error?.message || 'Failed to delete review cycle')
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
          searchPlaceholder="Search review cycles..."
          showAdd
          onAddClick={() => setAddOpen(true)}
          addTitle="Add Review Cycle"
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
          sortTitle="Sort review cycles (Shift+click headers for multi-sort)"
          showExport
          onExportClick={() => console.log('Export reviews')}
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
          description="Cycle and actions stay visible. Drag column edges in the table to resize."
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
            icon={ClipboardList}
            title={emptyCopy.title}
            description={emptyCopy.description}
            action={
              <Button variant="primary" onClick={() => setAddOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Review Cycle
              </Button>
            }
          />
        ) : null}
      </HRDataTableCard>

      <AddReviewCycleModal open={addOpen} onClose={() => setAddOpen(false)} onSaved={handleCycleSaved} />

      <ReviewCycleDetailModal
        cycle={selectedCycle}
        open={Boolean(selectedCycle) && !deleteOpen && !editingCycle}
        onClose={closeDetail}
        onEdit={openEdit}
        onDelete={() => setDeleteOpen(true)}
        deleting={deleting}
      />

      <ReviewCycleEditModal
        cycle={editingCycle}
        open={Boolean(editingCycle)}
        onClose={closeEdit}
        onSaved={async (updated) => {
          handleCycleSaved(updated)
          await loadCycles()
        }}
      />

      <Modal isOpen={deleteOpen} onClose={() => !deleting && setDeleteOpen(false)} title="Delete review cycle" size="sm">
        <p className="text-sm text-gray-600">
          Delete <span className="font-semibold text-gray-900">{selectedCycle?.name}</span>? This cannot be undone.
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
