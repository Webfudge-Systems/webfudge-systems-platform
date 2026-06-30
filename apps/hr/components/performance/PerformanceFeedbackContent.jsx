'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Edit, Eye, MessageSquare, Plus, Trash2 } from 'lucide-react'
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
import AddFeedbackRequestModal from './AddFeedbackRequestModal'
import FeedbackDetailModal from './FeedbackDetailModal'
import FeedbackEditModal from './FeedbackEditModal'
import {
  FeedbackTypePill,
  PendingFeedbackDueCell,
  PendingFeedbackRequestCell,
  ReceivedFeedbackCell,
  ReceivedFeedbackPeriodCell,
} from './PerformanceFeedbackTableCells'
import {
  deleteFeedbackRequest,
  deleteReceivedFeedback,
  FEEDBACK_UPDATED_EVENT,
  isCustomFeedbackItem,
  listPendingFeedback,
  listReceivedFeedback,
} from '../../lib/performanceFeedbackService'
import {
  filterPendingFeedback,
  filterReceivedFeedback,
  getFeedbackTabItems,
  pendingFeedbackSortValue,
  receivedFeedbackSortValue,
} from '../../lib/performancePage'

const PENDING_SORT_KEY = 'hr.performance.feedback.pending.tableSort'
const PENDING_VISIBILITY_KEY = 'hr.performance.feedback.pending.tableColumnVisibility'
const PENDING_ORDER_KEY = 'hr.performance.feedback.pending.tableColumnOrder'
const PENDING_WIDTHS_KEY = 'hr.performance.feedback.pending.tableColumnWidths'

const RECEIVED_SORT_KEY = 'hr.performance.feedback.received.tableSort'
const RECEIVED_VISIBILITY_KEY = 'hr.performance.feedback.received.tableColumnVisibility'
const RECEIVED_ORDER_KEY = 'hr.performance.feedback.received.tableColumnOrder'
const RECEIVED_WIDTHS_KEY = 'hr.performance.feedback.received.tableColumnWidths'

const PENDING_DEFAULT_WIDTHS = {
  label: 300,
  due: 140,
  type: 120,
  reviewCycle: 180,
  actions: 180,
}

const RECEIVED_DEFAULT_WIDTHS = {
  quote: 320,
  period: 140,
  type: 120,
  actions: 160,
}

const MIN_COLUMN_WIDTHS = { actions: 140 }

const PENDING_TOGGLEABLE = [
  { key: 'due', label: 'Due' },
  { key: 'type', label: 'Type' },
  { key: 'reviewCycle', label: 'Review cycle' },
]

const RECEIVED_TOGGLEABLE = [
  { key: 'period', label: 'Period' },
  { key: 'type', label: 'Type' },
]

const PENDING_DEFAULT_VISIBILITY = PENDING_TOGGLEABLE.reduce((acc, { key }) => ({ ...acc, [key]: true }), {})
const RECEIVED_DEFAULT_VISIBILITY = RECEIVED_TOGGLEABLE.reduce((acc, { key }) => ({ ...acc, [key]: true }), {})

const EMPTY_COPY = {
  pending: {
    title: 'No pending feedback',
    description: 'Feedback requests from review cycles will appear here.',
  },
  received: {
    title: 'No feedback received yet',
    description: 'Anonymized peer and manager feedback will show up here.',
  },
}

export default function PerformanceFeedbackContent() {
  const [activeTab, setActiveTab] = useState('pending')
  const [pendingRows, setPendingRows] = useState([])
  const [receivedRows, setReceivedRows] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [sortPickerOpen, setSortPickerOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  const [editingItem, setEditingItem] = useState(null)
  const [editMode, setEditMode] = useState('edit')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [actionError, setActionError] = useState('')

  const isPendingTab = activeTab === 'pending'

  const openDetail = (item) => setSelectedItem(item)
  const openEdit = (item) => {
    setSelectedItem(null)
    setEditMode('edit')
    setEditingItem(item)
  }
  const openGiveFeedback = (item) => {
    setSelectedItem(null)
    setEditMode('give')
    setEditingItem(item)
  }
  const closeDetail = () => {
    if (deleting) return
    setSelectedItem(null)
    setDeleteOpen(false)
  }
  const closeEdit = () => {
    setEditingItem(null)
    setEditMode('edit')
  }

  const loadFeedback = useCallback(() => {
    setPendingRows(listPendingFeedback())
    setReceivedRows(listReceivedFeedback())
  }, [])

  useEffect(() => {
    loadFeedback()
  }, [loadFeedback])

  useEffect(() => {
    const onUpdated = () => loadFeedback()
    window.addEventListener(FEEDBACK_UPDATED_EVENT, onUpdated)
    return () => window.removeEventListener(FEEDBACK_UPDATED_EVENT, onUpdated)
  }, [loadFeedback])

  const pendingTablePrefs = useTableColumnPreferences({
    visibilityStorageKey: PENDING_VISIBILITY_KEY,
    orderStorageKey: PENDING_ORDER_KEY,
    widthsStorageKey: PENDING_WIDTHS_KEY,
    defaultVisibility: PENDING_DEFAULT_VISIBILITY,
    reorderableKeys: PENDING_TOGGLEABLE.map((column) => column.key),
    defaultWidths: PENDING_DEFAULT_WIDTHS,
    minWidths: MIN_COLUMN_WIDTHS,
  })

  const receivedTablePrefs = useTableColumnPreferences({
    visibilityStorageKey: RECEIVED_VISIBILITY_KEY,
    orderStorageKey: RECEIVED_ORDER_KEY,
    widthsStorageKey: RECEIVED_WIDTHS_KEY,
    defaultVisibility: RECEIVED_DEFAULT_VISIBILITY,
    reorderableKeys: RECEIVED_TOGGLEABLE.map((column) => column.key),
    defaultWidths: RECEIVED_DEFAULT_WIDTHS,
    minWidths: MIN_COLUMN_WIDTHS,
  })

  const tablePrefs = isPendingTab ? pendingTablePrefs : receivedTablePrefs
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
  } = tablePrefs

  const pendingSort = useTableSort({ storageKey: PENDING_SORT_KEY })
  const receivedSort = useTableSort({ storageKey: RECEIVED_SORT_KEY })
  const sortState = isPendingTab ? pendingSort : receivedSort
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
  } = sortState

  const handleSaved = useCallback((saved) => {
    loadFeedback()
    setSearchQuery('')
    if (saved?.kind === 'received') {
      setActiveTab('received')
      return
    }
    if (saved?.kind === 'pending') {
      setActiveTab('pending')
    }
  }, [loadFeedback])

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

  const tabItems = useMemo(
    () => getFeedbackTabItems(pendingRows, receivedRows),
    [pendingRows, receivedRows],
  )

  const filteredPending = useMemo(
    () => filterPendingFeedback(pendingRows, searchQuery),
    [pendingRows, searchQuery],
  )

  const filteredReceived = useMemo(
    () => filterReceivedFeedback(receivedRows, searchQuery),
    [receivedRows, searchQuery],
  )

  const sortedPending = useMemo(
    () => sortData(filteredPending, (row, key) => pendingFeedbackSortValue(row, key)),
    [filteredPending, sortData, sortRules],
  )

  const sortedReceived = useMemo(
    () => sortData(filteredReceived, (row, key) => receivedFeedbackSortValue(row, key)),
    [filteredReceived, sortData, sortRules],
  )

  const tableRows = isPendingTab ? sortedPending : sortedReceived

  const pendingColumns = useMemo(
    () => [
      {
        key: 'label',
        label: 'REQUEST',
        fixed: true,
        render: (_, row) => <PendingFeedbackRequestCell row={row} />,
      },
      {
        key: 'due',
        visibilityKey: 'due',
        label: 'DUE',
        render: (_, row) => <PendingFeedbackDueCell row={row} />,
      },
      {
        key: 'type',
        visibilityKey: 'type',
        label: 'TYPE',
        render: (_, row) => <FeedbackTypePill row={row} />,
      },
      {
        key: 'reviewCycle',
        visibilityKey: 'reviewCycle',
        label: 'REVIEW CYCLE',
        render: (_, row) => <ReceivedFeedbackPeriodCell row={{ period: row.reviewCycle }} />,
      },
      {
        key: 'actions',
        label: 'ACTIONS',
        fixed: true,
        resizable: false,
        width: 180,
        defaultWidth: '180px',
        headerClassName: 'whitespace-nowrap text-right',
        className: 'whitespace-nowrap text-right align-middle',
        render: (_, row) => (
          <div
            className="flex min-w-[160px] shrink-0 items-center justify-end gap-0.5"
            onClick={(event) => event.stopPropagation()}
          >
            <Button
              variant="ghost"
              size="sm"
              className="p-2 text-emerald-600 hover:bg-emerald-50"
              title="View request"
              onClick={() => openDetail(row)}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="p-2 text-orange-600 hover:bg-orange-50"
              title="Give feedback"
              onClick={() => openGiveFeedback(row)}
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="p-2 text-orange-600 hover:bg-orange-50"
              title={isCustomFeedbackItem(row) ? 'Edit request' : 'Sample request cannot be edited'}
              onClick={() => openEdit(row)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="p-2 text-red-600 hover:bg-red-50"
              title="Remove request"
              onClick={() => {
                setActionError('')
                setSelectedItem(row)
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

  const receivedColumns = useMemo(
    () => [
      {
        key: 'quote',
        label: 'FEEDBACK',
        fixed: true,
        render: (_, row) => <ReceivedFeedbackCell row={row} />,
      },
      {
        key: 'period',
        visibilityKey: 'period',
        label: 'PERIOD',
        render: (_, row) => <ReceivedFeedbackPeriodCell row={row} />,
      },
      {
        key: 'type',
        visibilityKey: 'type',
        label: 'TYPE',
        render: (_, row) => <FeedbackTypePill row={row} />,
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
              title="View feedback"
              onClick={() => openDetail(row)}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="p-2 text-orange-600 hover:bg-orange-50"
              title={isCustomFeedbackItem(row) ? 'Edit feedback' : 'Sample feedback cannot be edited'}
              onClick={() => openEdit(row)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="p-2 text-red-600 hover:bg-red-50"
              title={isCustomFeedbackItem(row) ? 'Delete feedback' : 'Sample feedback cannot be deleted'}
              disabled={!isCustomFeedbackItem(row)}
              onClick={() => {
                setActionError('')
                setSelectedItem(row)
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

  const toggleableColumns = isPendingTab ? PENDING_TOGGLEABLE : RECEIVED_TOGGLEABLE
  const sortColumnOptions = isPendingTab
    ? [{ key: 'label', label: 'Request' }, ...PENDING_TOGGLEABLE]
    : [{ key: 'quote', label: 'Feedback' }, ...RECEIVED_TOGGLEABLE]
  const sortableKeys = sortColumnOptions.map((column) => column.key)
  const baseColumns = isPendingTab ? pendingColumns : receivedColumns
  const fixedKey = isPendingTab ? 'label' : 'quote'

  const visibleColumns = useMemo(() => {
    const byKey = Object.fromEntries(baseColumns.map((column) => [column.key, column]))
    const out = []
    if (byKey[fixedKey]) out.push(byKey[fixedKey])
    for (const key of columnOrder) {
      const column = byKey[key]
      if (!column?.visibilityKey || !columnVisibility[column.visibilityKey]) continue
      out.push(column)
    }
    if (byKey.actions) out.push(byKey.actions)
    return bindSortableColumns(out, sortableKeys)
  }, [baseColumns, columnOrder, columnVisibility, bindSortableColumns, fixedKey, sortableKeys])

  const emptyCopy = EMPTY_COPY[activeTab] || EMPTY_COPY.pending

  const handleDelete = async () => {
    if (!selectedItem?.id) return
    try {
      setDeleting(true)
      setActionError('')
      if (selectedItem.kind === 'pending') {
        deleteFeedbackRequest(selectedItem.id)
      } else {
        deleteReceivedFeedback(selectedItem.id)
      }
      setDeleteOpen(false)
      setSelectedItem(null)
      setEditingItem((current) => (current?.id === selectedItem.id ? null : current))
      loadFeedback()
    } catch (error) {
      setActionError(error?.message || 'Failed to delete feedback')
    } finally {
      setDeleting(false)
    }
  }

  const deleteTitle = selectedItem?.kind === 'pending' ? 'Remove feedback request' : 'Delete feedback'
  const deleteLabel =
    selectedItem?.kind === 'pending' ? selectedItem?.label : 'this received feedback'

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
          searchPlaceholder="Search feedback..."
          showAdd={isPendingTab}
          onAddClick={() => setAddOpen(true)}
          addTitle="Add Feedback Request"
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
          sortTitle="Sort feedback (Shift+click headers for multi-sort)"
          showExport
          onExportClick={() => console.log('Export feedback')}
          exportTitle="Export"
          variant="glass"
        />
        <TableSortDropdown
          open={sortPickerOpen}
          sortRules={sortRules}
          columnOptions={sortColumnOptions}
          onAddRule={addSortRule}
          onRemoveRule={removeSortRule}
          onSetDirection={setRuleDirection}
          onMoveRule={moveSortRule}
          onClear={clearSort}
          maxRules={sortMaxRules}
        />
        <TableColumnPicker
          open={columnPickerOpen}
          description={`${isPendingTab ? 'Request' : 'Feedback'} and actions stay visible. Drag column edges in the table to resize.`}
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
            icon={MessageSquare}
            title={emptyCopy.title}
            description={emptyCopy.description}
            action={
              isPendingTab ? (
                <Button variant="primary" onClick={() => setAddOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Feedback Request
                </Button>
              ) : null
            }
          />
        ) : null}
      </HRDataTableCard>

      <AddFeedbackRequestModal open={addOpen} onClose={() => setAddOpen(false)} onSaved={handleSaved} />

      <FeedbackDetailModal
        item={selectedItem}
        open={Boolean(selectedItem) && !deleteOpen && !editingItem}
        onClose={closeDetail}
        onEdit={openEdit}
        onGiveFeedback={openGiveFeedback}
        onDelete={() => setDeleteOpen(true)}
        deleting={deleting}
      />

      <FeedbackEditModal
        item={editingItem}
        open={Boolean(editingItem)}
        mode={editMode}
        onClose={closeEdit}
        onSaved={handleSaved}
      />

      <Modal isOpen={deleteOpen} onClose={() => !deleting && setDeleteOpen(false)} title={deleteTitle} size="sm">
        <p className="text-sm text-gray-600">
          {selectedItem?.kind === 'pending' ? (
            <>
              Remove <span className="font-semibold text-gray-900">{deleteLabel}</span>?
            </>
          ) : (
            <>
              Delete <span className="font-semibold text-gray-900">{deleteLabel}</span>? This cannot be undone.
            </>
          )}
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
            {deleting ? 'Deleting…' : selectedItem?.kind === 'pending' ? 'Remove' : 'Delete'}
          </Button>
        </div>
      </Modal>
    </>
  )
}
