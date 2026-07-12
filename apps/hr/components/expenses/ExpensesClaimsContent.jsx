'use client'

import { useEffect, useMemo, useState } from 'react'
import { Eye, Edit, Trash2, Plus, Receipt, Paperclip } from 'lucide-react'
import {
  Avatar,
  Button,
  Modal,
  Table,
  TableCellDateOnly,
  TableCellOrangePill,
  TableCellText,
  TableColumnPicker,
  TableEmptyBelow,
  TableResultsCount,
  TableSortDropdown,
  TabsWithActions,
  useTableColumnPreferences,
  useTableSort,
} from '@webfudge/ui'
import HRDataTableCard from '../shared/HRDataTableCard'
import HRStatusBadge from '../shared/HRStatusBadge'
import AddExpenseClaimModal from './AddExpenseClaimModal'
import EditExpenseClaimModal from './EditExpenseClaimModal'
import ExpenseClaimDetailModal from './ExpenseClaimDetailModal'
import useExpenseData from '../../hooks/useExpenseData'
import {
  expenseClaimSortValue,
  getExpenseClaimsTabItems,
  matchesExpenseClaimsTab,
} from '../../lib/expensesPage'
import { getExpenseCategoryLabel } from '../../lib/expensesShared'

const TABLE_SORT_STORAGE_KEY = 'hr.expenses.claims.tableSort'
const COLUMN_VISIBILITY_STORAGE_KEY = 'hr.expenses.claims.tableColumnVisibility'
const COLUMN_ORDER_STORAGE_KEY = 'hr.expenses.claims.tableColumnOrder'
const COLUMN_WIDTHS_STORAGE_KEY = 'hr.expenses.claims.tableColumnWidths'

const DEFAULT_COLUMN_WIDTHS = {
  employee: 260,
  category: 140,
  amount: 120,
  submitted: 130,
  receipt: 120,
  status: 120,
  actions: 160,
}

const MIN_COLUMN_WIDTHS = { actions: 140 }

const TOGGLEABLE_COLUMNS = [
  { key: 'category', label: 'Category' },
  { key: 'amount', label: 'Amount' },
  { key: 'submitted', label: 'Submitted' },
  { key: 'receipt', label: 'Receipt' },
  { key: 'status', label: 'Status' },
]

const DEFAULT_COLUMN_VISIBILITY = TOGGLEABLE_COLUMNS.reduce((acc, { key }) => ({ ...acc, [key]: true }), {})
const SORT_COLUMN_OPTIONS = [{ key: 'employee', label: 'Employee' }, ...TOGGLEABLE_COLUMNS]
const SORTABLE_KEYS = SORT_COLUMN_OPTIONS.map((c) => c.key)

export default function ExpensesClaimsContent() {
  const { claims, deleteClaim, error } = useExpenseData()
  const [activeTab, setActiveTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortPickerOpen, setSortPickerOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [selectedClaim, setSelectedClaim] = useState(null)
  const [editingClaim, setEditingClaim] = useState(null)
  const [deletingClaim, setDeletingClaim] = useState(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [localError, setLocalError] = useState('')

  const tabItems = useMemo(() => getExpenseClaimsTabItems(claims), [claims])

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
    reorderableKeys: TOGGLEABLE_COLUMNS.map((c) => c.key),
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

  const filteredRows = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    return claims.filter((row) => {
      if (!matchesExpenseClaimsTab(row, activeTab)) return false
      if (!q) return true
      return (
        row.employee.toLowerCase().includes(q) ||
        row.category.toLowerCase().includes(q) ||
        (row.description || '').toLowerCase().includes(q)
      )
    })
  }, [claims, searchQuery, activeTab])

  const sortedRows = useMemo(
    () => sortData(filteredRows, (row, key) => expenseClaimSortValue(row, key)),
    [filteredRows, sortData],
  )

  const openDetail = (row) => setSelectedClaim(row)
  const closeDetail = () => {
    if (deleting) return
    setSelectedClaim(null)
    setDeleteOpen(false)
  }
  const openEdit = (row) => {
    setSelectedClaim(null)
    setEditingClaim(row)
  }

  const claimColumns = useMemo(
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
              <div className="truncate text-sm text-gray-500">{row.description}</div>
            </div>
          </div>
        ),
      },
      {
        key: 'category',
        visibilityKey: 'category',
        label: 'CATEGORY',
        render: (_, row) => <TableCellOrangePill value={getExpenseCategoryLabel(row.category)} />,
      },
      {
        key: 'amount',
        visibilityKey: 'amount',
        label: 'AMOUNT',
        render: (_, row) => (
          <TableCellText value={`₹${row.amount.toLocaleString('en-IN')}`} emphasized />
        ),
      },
      {
        key: 'submitted',
        visibilityKey: 'submitted',
        label: 'SUBMITTED',
        render: (_, row) => <TableCellDateOnly dateString={row.submitted} />,
      },
      {
        key: 'receipt',
        visibilityKey: 'receipt',
        label: 'RECEIPT',
        render: (_, row) =>
          row.receipt ? (
            <span className="inline-flex items-center gap-1 text-sm text-gray-600">
              <Paperclip className="h-4 w-4 text-orange-500" aria-hidden />
              Attached
            </span>
          ) : (
            <TableCellText value="—" />
          ),
      },
      {
        key: 'status',
        visibilityKey: 'status',
        label: 'STATUS',
        render: (_, row) => <HRStatusBadge status={row.status} />,
      },
      {
        key: 'actions',
        label: 'ACTIONS',
        fixed: true,
        width: 168,
        resizable: false,
        headerClassName: 'whitespace-nowrap text-right',
        className: 'whitespace-nowrap text-right align-middle',
        render: (_, row) => (
          <div className="flex min-w-[156px] shrink-0 items-center justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="sm" className="p-2 text-emerald-600 hover:bg-emerald-50" title="View claim" onClick={() => openDetail(row)}>
              <Eye className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="p-2 text-orange-600 hover:bg-orange-50" title="Edit claim" onClick={() => openEdit(row)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="p-2 text-red-600 hover:bg-red-50"
              title="Delete claim"
              onClick={() => {
                setDeletingClaim(row)
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
    const byKey = Object.fromEntries(claimColumns.map((col) => [col.key, col]))
    const out = []
    if (byKey.employee) out.push(byKey.employee)
    for (const key of columnOrder) {
      const col = byKey[key]
      if (!col?.visibilityKey || !columnVisibility[col.visibilityKey]) continue
      out.push(col)
    }
    if (byKey.actions) out.push(byKey.actions)
    return bindSortableColumns(out, SORTABLE_KEYS)
  }, [claimColumns, columnOrder, columnVisibility, bindSortableColumns])

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

  const handleDelete = async () => {
    if (!deletingClaim?.id) return
    try {
      setDeleting(true)
      await deleteClaim(deletingClaim.id)
      setDeleteOpen(false)
      setDeletingClaim(null)
      setSelectedClaim(null)
    } catch (err) {
      setLocalError(err?.message || 'Failed to delete claim')
    } finally {
      setDeleting(false)
    }
  }

  const emptyCopy = {
    all: { title: 'No expense claims found', description: 'Try adjusting your search or filters.' },
    pending: { title: 'No pending claims', description: 'All claims have been reviewed.' },
    approved: { title: 'No approved claims', description: 'Approved claims will appear here.' },
    rejected: { title: 'No rejected claims', description: 'Rejected claims will appear here.' },
    paid: { title: 'No paid claims', description: 'Paid claims will appear here.' },
  }
  const empty = emptyCopy[activeTab] || emptyCopy.all

  return (
    <>
      <div className="relative" ref={toolbarRef}>
        <TabsWithActions
          tabs={tabItems.map((item) => ({ key: item.key, label: item.label, badge: String(item.count) }))}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          showSearch
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search claims..."
          showAdd
          onAddClick={() => setAddOpen(true)}
          addTitle="New Claim"
          showColumnVisibility
          onColumnVisibilityClick={() => {
            setSortPickerOpen(false)
            setColumnPickerOpen((open) => !open)
          }}
          showSort
          onSortClick={() => {
            setColumnPickerOpen(false)
            setSortPickerOpen((open) => !open)
          }}
          hasActiveSort={hasActiveSort}
          sortTitle="Sort claims"
          showExport
          onExportClick={() => console.log('Export claims')}
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
          description="Employee and actions stay visible."
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

      <TableResultsCount count={filteredRows.length} />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {localError ? <p className="text-sm text-red-600">{localError}</p> : null}

      <HRDataTableCard>
        <Table
          columns={visibleColumns}
          data={sortedRows}
          keyField="id"
          variant="modernEmbedded"
          {...tableResizeProps}
          onRowClick={openDetail}
        />
        {filteredRows.length === 0 ? (
          <TableEmptyBelow
            icon={Receipt}
            title={empty.title}
            description={empty.description}
            action={
              activeTab === 'all' ? (
                <Button variant="primary" className="gap-2 bg-orange-500 hover:bg-orange-600" onClick={() => setAddOpen(true)}>
                  <Plus className="h-4 w-4" />
                  New Claim
                </Button>
              ) : null
            }
          />
        ) : null}
      </HRDataTableCard>

      <AddExpenseClaimModal open={addOpen} onClose={() => setAddOpen(false)} />
      <ExpenseClaimDetailModal
        claim={selectedClaim}
        open={Boolean(selectedClaim) && !deleteOpen && !editingClaim}
        onClose={closeDetail}
        onEdit={openEdit}
        onDelete={(row) => {
          setDeletingClaim(row)
          setDeleteOpen(true)
        }}
      />
      <EditExpenseClaimModal
        claim={editingClaim}
        open={Boolean(editingClaim)}
        onClose={() => setEditingClaim(null)}
      />

      <Modal isOpen={deleteOpen} onClose={() => !deleting && setDeleteOpen(false)} title="Delete expense claim" size="sm">
        <p className="text-sm text-gray-600">
          Delete claim for <span className="font-semibold text-gray-900">{deletingClaim?.employee}</span>?
          This cannot be undone.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" size="sm" disabled={deleting} onClick={() => setDeleteOpen(false)}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" className="!bg-red-600 hover:!bg-red-700" disabled={deleting} onClick={handleDelete}>
            Delete
          </Button>
        </div>
      </Modal>
    </>
  )
}
