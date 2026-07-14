'use client'

import { useMemo, useState } from 'react'
import { Plus, Eye, Trash2, Edit, Wallet } from 'lucide-react'
import {
  Badge,
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
import PayrollRunBanner from './PayrollRunBanner'
import {
  PayrollAmountCell,
  PayrollDepartmentCell,
  PayrollEmployeeCell,
  PayrollStatusBadge,
} from './PayrollTableCells'
import {
  getPayrollOverviewTabItems,
  matchesPayrollOverviewTab,
} from '../../lib/payrollPage'
import {
  PAYROLL_OVERVIEW_COLUMN_WIDTHS,
  PAYROLL_OVERVIEW_DEFAULT_COLUMN_VISIBILITY,
  PAYROLL_OVERVIEW_MIN_COLUMN_WIDTHS,
  PAYROLL_OVERVIEW_SORT_COLUMN_OPTIONS,
  PAYROLL_OVERVIEW_SORTABLE_KEYS,
  PAYROLL_OVERVIEW_TOGGLEABLE_COLUMNS,
  payrollOverviewSortValue,
  runBannerPayload,
  getPayrollRecordTableStatus,
} from '../../lib/payrollShared'
import { deletePayrollLineItem } from '../../lib/payrollSyncService'
import AddPayrollRecordModal from './AddPayrollRecordModal'
import EditPayrollRecordModal from './EditPayrollRecordModal'
import PayrollRecordDetailModal from './PayrollRecordDetailModal'

const TABLE_SORT_STORAGE_KEY = 'hr.payroll.overview.tableSort'
const COLUMN_VISIBILITY_STORAGE_KEY = 'hr.payroll.overview.tableColumnVisibility'
const COLUMN_ORDER_STORAGE_KEY = 'hr.payroll.overview.tableColumnOrder'
const COLUMN_WIDTHS_STORAGE_KEY = 'hr.payroll.overview.tableColumnWidths'

export default function PayrollOverviewContent({
  selectedRun,
  employeeRows,
  readOnlyRun,
  actionError,
  lockBlockers,
  error,
  onTransition,
  onRecalculate,
  onReload,
  onOpenCreateRun,
}) {
  const [activeTab, setActiveTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortPickerOpen, setSortPickerOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState(null)
  const [editingRecord, setEditingRecord] = useState(null)
  const [deletingRecord, setDeletingRecord] = useState(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [localError, setLocalError] = useState('')

  const tabItems = useMemo(() => getPayrollOverviewTabItems(employeeRows), [employeeRows])

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
    defaultVisibility: PAYROLL_OVERVIEW_DEFAULT_COLUMN_VISIBILITY,
    reorderableKeys: PAYROLL_OVERVIEW_TOGGLEABLE_COLUMNS.map((column) => column.key),
    defaultWidths: PAYROLL_OVERVIEW_COLUMN_WIDTHS,
    minWidths: PAYROLL_OVERVIEW_MIN_COLUMN_WIDTHS,
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
    return employeeRows.filter((row) => {
      if (!matchesPayrollOverviewTab(row, activeTab)) return false
      if (!q) return true
      return (
        row.name.toLowerCase().includes(q) ||
        (row.dept || '').toLowerCase().includes(q) ||
        String(row.id).toLowerCase().includes(q) ||
        (row.employeeId || '').toLowerCase().includes(q)
      )
    })
  }, [employeeRows, searchQuery, activeTab])

  const sortedEmployeeRows = useMemo(
    () => sortData(filteredRows, (row, key) => payrollOverviewSortValue(row, key)),
    [filteredRows, sortData],
  )

  const openDetail = (row) => setSelectedRecord(row)
  const closeDetail = () => {
    if (deleting) return
    setSelectedRecord(null)
    setDeleteOpen(false)
  }
  const openEdit = (row) => {
    setSelectedRecord(null)
    setEditingRecord(row)
  }

  const overviewColumns = useMemo(
    () => [
      { key: 'employee', label: 'EMPLOYEE', fixed: true, render: (_, row) => <PayrollEmployeeCell row={row} /> },
      { key: 'dept', visibilityKey: 'dept', label: 'DEPARTMENT', render: (_, row) => <PayrollDepartmentCell department={row.dept} /> },
      { key: 'gross', visibilityKey: 'gross', label: 'GROSS', render: (_, row) => <PayrollAmountCell value={row.gross} emphasized /> },
      { key: 'pf', visibilityKey: 'pf', label: 'PF', render: (_, row) => <PayrollAmountCell value={row.pf} /> },
      { key: 'tds', visibilityKey: 'tds', label: 'TDS', render: (_, row) => <PayrollAmountCell value={row.tds} /> },
      { key: 'net', visibilityKey: 'net', label: 'NET', render: (_, row) => <PayrollAmountCell value={row.net} emphasized /> },
      {
        key: 'status',
        visibilityKey: 'status',
        label: 'STATUS',
        render: (_, row) => (
          <PayrollStatusBadge status={getPayrollRecordTableStatus(row)} />
        ),
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
          <div className="flex min-w-[156px] shrink-0 items-center justify-end gap-0.5" onClick={(event) => event.stopPropagation()}>
            <Button
              variant="ghost"
              size="sm"
              className="p-2 text-emerald-600 hover:bg-emerald-50"
              title="View record"
              onClick={() => openDetail(row)}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="p-2 text-orange-600 hover:bg-orange-50 disabled:opacity-40"
              disabled={readOnlyRun}
              title="Edit record"
              onClick={() => openEdit(row)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="p-2 text-red-600 hover:bg-red-50 disabled:opacity-40"
              disabled={readOnlyRun}
              title="Remove from payroll"
              onClick={() => {
                setDeletingRecord(row)
                setDeleteOpen(true)
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    [readOnlyRun],
  )

  const handleDelete = async () => {
    if (!deletingRecord?.id || !selectedRun?.id) return
    try {
      setDeleting(true)
      setLocalError('')
      await deletePayrollLineItem(deletingRecord.id)
      setDeleteOpen(false)
      setDeletingRecord(null)
      await onReload(selectedRun.id)
    } catch (err) {
      setLocalError(err?.message || 'Failed to remove payroll record')
    } finally {
      setDeleting(false)
    }
  }

  const visibleOverviewColumns = useMemo(() => {
    const byKey = Object.fromEntries(overviewColumns.map((column) => [column.key, column]))
    const out = []
    if (byKey.employee) out.push(byKey.employee)
    for (const key of columnOrder) {
      const column = byKey[key]
      if (!column?.visibilityKey || !columnVisibility[column.visibilityKey]) continue
      out.push(column)
    }
    if (byKey.actions) out.push(byKey.actions)
    return bindSortableColumns(out, PAYROLL_OVERVIEW_SORTABLE_KEYS)
  }, [overviewColumns, columnOrder, columnVisibility, bindSortableColumns])

  const emptyStateCopy = {
    all: {
      title: 'No payroll records found',
      description: 'Create a payroll run to compute salaries for your employees.',
    },
    ready: {
      title: 'No ready records',
      description: 'Employees with complete salary structure and bank details will appear here.',
    },
    'missing-structure': {
      title: 'No missing structure records',
      description: 'Employees without an assigned salary structure will appear here.',
    },
    'missing-bank': {
      title: 'No missing bank records',
      description: 'Employees without bank details will appear here.',
    },
  }

  const emptyCopy = emptyStateCopy[activeTab] || emptyStateCopy.all

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
          searchPlaceholder="Search payroll records..."
          showAdd
          onAddClick={() => setAddOpen(true)}
          addTitle="Add to Payroll"
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
          sortTitle="Sort payroll (Shift+click headers for multi-sort)"
          variant="glass"
        />
        <TableSortDropdown
          open={sortPickerOpen}
          sortRules={sortRules}
          columnOptions={PAYROLL_OVERVIEW_SORT_COLUMN_OPTIONS}
          onAddRule={addSortRule}
          onRemoveRule={removeSortRule}
          onSetDirection={setRuleDirection}
          onMoveRule={moveSortRule}
          onClear={clearSort}
          maxRules={sortMaxRules}
        />
        <TableColumnPicker
          open={columnPickerOpen}
          description="Employee name and actions stay visible. Drag column edges in the table to resize."
          reorderableRows={PAYROLL_OVERVIEW_TOGGLEABLE_COLUMNS}
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
      {actionError ? <p className="text-sm text-red-600">{actionError}</p> : null}
      {localError ? <p className="text-sm text-red-600">{localError}</p> : null}
      {lockBlockers.length > 0 ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-700">Cannot lock this run. Missing data for:</p>
          <ul className="mt-2 space-y-1 text-sm text-red-700">
            {lockBlockers.map((blocker) => (
              <li key={blocker.lineItemId} className="flex items-center gap-2">
                <span>{blocker.employeeName}</span>
                {blocker.missingSalaryStructure ? <Badge variant="danger">Missing structure</Badge> : null}
                {blocker.missingBankDetails ? <Badge variant="danger">Missing bank</Badge> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="space-y-4">
        {selectedRun ? (
          <PayrollRunBanner
            run={runBannerPayload(selectedRun)}
            onReview={() => onTransition('review')}
            onLock={() => onTransition('lock')}
            onDisburse={() => onTransition('disburse')}
            onRecalculate={onRecalculate}
          />
        ) : null}
        <HRDataTableCard>
          <Table
            columns={visibleOverviewColumns}
            data={sortedEmployeeRows}
            keyField="id"
            variant="modernEmbedded"
            {...tableResizeProps}
            onRowClick={openDetail}
          />
          {filteredRows.length === 0 ? (
            <TableEmptyBelow
              icon={Wallet}
              title={emptyCopy.title}
              description={emptyCopy.description}
              action={
                activeTab === 'all' && selectedRun && !readOnlyRun ? (
                  <Button variant="primary" className="gap-2 bg-orange-500 hover:bg-orange-600" onClick={() => setAddOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add to Payroll
                  </Button>
                ) : activeTab === 'all' ? (
                  <Button variant="primary" onClick={onOpenCreateRun}>
                    <Plus className="mr-2 h-4 w-4" />
                    Run Payroll
                  </Button>
                ) : null
              }
            />
          ) : null}
        </HRDataTableCard>
      </div>

      <AddPayrollRecordModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        selectedRun={selectedRun}
        employeeRows={employeeRows}
        readOnlyRun={readOnlyRun}
        onSaved={onReload}
      />

      <PayrollRecordDetailModal
        record={selectedRecord}
        month={selectedRun?.monthLabel}
        open={Boolean(selectedRecord) && !deleteOpen && !editingRecord}
        onClose={closeDetail}
        onEdit={openEdit}
        readOnlyRun={readOnlyRun}
      />

      <EditPayrollRecordModal
        record={editingRecord}
        open={Boolean(editingRecord)}
        onClose={() => setEditingRecord(null)}
        readOnlyRun={readOnlyRun}
        month={selectedRun?.monthLabel}
        onSaved={() => onReload?.(selectedRun?.id)}
      />

      <Modal isOpen={deleteOpen} onClose={() => !deleting && setDeleteOpen(false)} title="Remove from payroll" size="sm">
        <p className="text-sm text-gray-600">
          Remove <span className="font-semibold text-gray-900">{deletingRecord?.name}</span> from this payroll run?
          This cannot be undone.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" size="sm" disabled={deleting} onClick={() => setDeleteOpen(false)}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" className="!bg-red-600 hover:!bg-red-700" disabled={deleting} onClick={handleDelete}>
            {deleting ? 'Removing…' : 'Remove'}
          </Button>
        </div>
      </Modal>
    </>
  )
}
