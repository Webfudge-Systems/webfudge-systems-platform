'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { CheckCircle2, CreditCard, Plus, XCircle } from 'lucide-react'
import {
  Button,
  Table,
  TableCellCreated,
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
import {
  PayrollAmountCell,
  PayrollLoanEmployeeCell,
  PayrollStatusBadge,
} from './PayrollTableCells'
import CreateLoanAdvanceModal from './CreateLoanAdvanceModal'
import {
  applyLoanDeduction,
  approveLoanAdvance,
  closeLoanAdvance,
  createLoanAdvance,
} from '../../lib/loanAdvances'
import {
  computeLoanAdvanceStats,
  filterLoanAdvances,
  getLoanAdvanceTabItems,
  loanAdvanceSortValue,
  matchesLoanAdvanceTab,
} from '../../lib/payrollPage'

const TABLE_SORT_STORAGE_KEY = 'hr.payroll.loans.tableSort'
const COLUMN_VISIBILITY_STORAGE_KEY = 'hr.payroll.loans.tableColumnVisibility'
const COLUMN_ORDER_STORAGE_KEY = 'hr.payroll.loans.tableColumnOrder'
const COLUMN_WIDTHS_STORAGE_KEY = 'hr.payroll.loans.tableColumnWidths'

const DEFAULT_COLUMN_WIDTHS = {
  employee: 260,
  type: 120,
  principal: 130,
  monthlyDeduction: 140,
  outstanding: 130,
  status: 120,
  startDate: 130,
  actions: 160,
}

const MIN_COLUMN_WIDTHS = { actions: 140 }

const TOGGLEABLE_COLUMNS = [
  { key: 'type', label: 'Type' },
  { key: 'principal', label: 'Principal' },
  { key: 'monthlyDeduction', label: 'Monthly EMI' },
  { key: 'outstanding', label: 'Outstanding' },
  { key: 'status', label: 'Status' },
  { key: 'startDate', label: 'Start date' },
]

const DEFAULT_COLUMN_VISIBILITY = TOGGLEABLE_COLUMNS.reduce((acc, { key }) => ({ ...acc, [key]: true }), {})
const SORT_COLUMN_OPTIONS = [{ key: 'employee', label: 'Employee' }, ...TOGGLEABLE_COLUMNS]
const SORTABLE_KEYS = SORT_COLUMN_OPTIONS.map((column) => column.key)

export default function PayrollLoansContent({
  selectedRun,
  lineItems = [],
  loans = [],
  onLoansChange,
  onRecalculate,
  readOnlyRun = false,
  actionError = '',
}) {
  const [activeTab, setActiveTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortPickerOpen, setSortPickerOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [actionId, setActionId] = useState(null)
  const [localError, setLocalError] = useState('')

  const stats = useMemo(() => computeLoanAdvanceStats(loans), [loans])
  const tabItems = useMemo(() => getLoanAdvanceTabItems(stats), [stats])

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

  const filteredRows = useMemo(() => {
    const searched = filterLoanAdvances(loans, searchQuery)
    return searched.filter((row) => matchesLoanAdvanceTab(row, activeTab))
  }, [loans, searchQuery, activeTab])

  const sortedRows = useMemo(
    () => sortData(filteredRows, (row, key) => loanAdvanceSortValue(row, key)),
    [filteredRows, sortData],
  )

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

  const handleCreate = useCallback(
    async (payload) => {
      createLoanAdvance(payload)
      onLoansChange?.()
      setActiveTab(payload.status === 'Pending' ? 'pending' : 'active')
    },
    [onLoansChange],
  )

  const handleClose = useCallback(
    async (id) => {
      try {
        setActionId(id)
        setLocalError('')
        closeLoanAdvance(id)
        onLoansChange?.()
      } catch (err) {
        setLocalError(err?.message || 'Failed to close record')
      } finally {
        setActionId(null)
      }
    },
    [onLoansChange],
  )

  const handleApprove = useCallback(
    async (id) => {
      try {
        setActionId(id)
        setLocalError('')
        approveLoanAdvance(id)
        onLoansChange?.()
        setActiveTab('active')
      } catch (err) {
        setLocalError(err?.message || 'Failed to approve record')
      } finally {
        setActionId(null)
      }
    },
    [onLoansChange],
  )

  const handleApplyDeduction = useCallback(
    async (id) => {
      if (!selectedRun?.id) return
      try {
        setActionId(id)
        setLocalError('')
        applyLoanDeduction(id, selectedRun.id)
        onLoansChange?.()
      } catch (err) {
        setLocalError(err?.message || 'Failed to apply deduction')
      } finally {
        setActionId(null)
      }
    },
    [selectedRun?.id, onLoansChange],
  )

  const columns = useMemo(
    () => [
      {
        key: 'employee',
        label: 'EMPLOYEE',
        fixed: true,
        render: (_, row) => <PayrollLoanEmployeeCell row={row} />,
      },
      {
        key: 'type',
        visibilityKey: 'type',
        label: 'TYPE',
        render: (_, row) => <TableCellOrangePill value={row.type} />,
      },
      {
        key: 'principal',
        visibilityKey: 'principal',
        label: 'PRINCIPAL',
        render: (_, row) => <PayrollAmountCell value={row.principal} emphasized />,
      },
      {
        key: 'monthlyDeduction',
        visibilityKey: 'monthlyDeduction',
        label: 'MONTHLY EMI',
        render: (_, row) => <PayrollAmountCell value={row.monthlyDeduction} />,
      },
      {
        key: 'outstanding',
        visibilityKey: 'outstanding',
        label: 'OUTSTANDING',
        render: (_, row) => <PayrollAmountCell value={row.outstanding} emphasized={row.status === 'Active'} />,
      },
      {
        key: 'status',
        visibilityKey: 'status',
        label: 'STATUS',
        render: (_, row) => <PayrollStatusBadge status={row.status} />,
      },
      {
        key: 'startDate',
        visibilityKey: 'startDate',
        label: 'START DATE',
        render: (_, row) => <TableCellCreated dateString={row.startDate} />,
      },
      {
        key: 'actions',
        label: 'ACTIONS',
        fixed: true,
        width: 160,
        resizable: false,
        render: (_, row) => (
          <div className="flex justify-end gap-1" onClick={(event) => event.stopPropagation()}>
            {row.status === 'Pending' ? (
              <Button
                variant="primary"
                size="sm"
                className="gap-1 bg-orange-500 hover:bg-orange-600"
                disabled={readOnlyRun || actionId === row.id}
                onClick={() => handleApprove(row.id)}
              >
                <CheckCircle2 className="h-4 w-4" />
                {actionId === row.id ? '…' : 'Approve'}
              </Button>
            ) : row.status === 'Active' ? (
              <>
                {row.canApplyDeduction ? (
                  <Button
                    variant="primary"
                    size="sm"
                    className="gap-1 bg-orange-500 hover:bg-orange-600"
                    disabled={actionId === row.id}
                    onClick={() => handleApplyDeduction(row.id)}
                    title="Record EMI deduction for this payroll run"
                  >
                    Apply EMI
                  </Button>
                ) : row.appliedThisRun ? (
                  <Button variant="secondary" size="sm" disabled>
                    Applied
                  </Button>
                ) : null}
                {!readOnlyRun ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1 text-red-600 hover:bg-red-50"
                    disabled={actionId === row.id}
                    onClick={() => handleClose(row.id)}
                    title="Close loan or advance"
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                ) : null}
              </>
            ) : (
              <TableCellText value="—" className="text-gray-400" />
            )}
          </div>
        ),
      },
    ],
    [readOnlyRun, actionId, handleClose, handleApprove, handleApplyDeduction],
  )

  const visibleColumns = useMemo(() => {
    const byKey = Object.fromEntries(columns.map((column) => [column.key, column]))
    const out = []
    if (byKey.employee) out.push(byKey.employee)
    for (const key of columnOrder) {
      const column = byKey[key]
      if (!column?.visibilityKey || !columnVisibility[column.visibilityKey]) continue
      out.push(column)
    }
    if (byKey.actions) out.push(byKey.actions)
    return bindSortableColumns(out, SORTABLE_KEYS)
  }, [columns, columnOrder, columnVisibility, bindSortableColumns])

  const emptyCopy = {
    all: {
      title: selectedRun ? 'No loans or advances yet' : 'Select a payroll run',
      description: selectedRun
        ? lineItems.length === 0
          ? 'Recalculate the payroll run to load employees, then add a loan or advance.'
          : 'Use the + button to add an employee loan or salary advance.'
        : 'Choose a payroll run from the toolbar to manage loans and advances.',
    },
    active: {
      title: 'No active records',
      description: 'Active loans and advances with ongoing payroll deductions appear here.',
    },
    pending: {
      title: 'Nothing pending',
      description: 'Salary advances marked for approval appear here until you approve them.',
    },
    closed: {
      title: 'No closed records',
      description: 'Closed or fully recovered loans and advances appear here.',
    },
  }

  const emptyState = emptyCopy[activeTab] || emptyCopy.all

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
          searchPlaceholder="Search loans..."
          showAdd
          onAddClick={() => setCreateOpen(true)}
          addTitle="Add loan or advance"
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
          sortTitle="Sort loans (Shift+click headers for multi-sort)"
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
          description="Employee name and actions stay visible. Drag column edges in the table to resize."
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

      {actionError ? <p className="text-sm text-red-600">{actionError}</p> : null}
      {localError ? <p className="text-sm text-red-600">{localError}</p> : null}

      <HRDataTableCard>
        <Table
          columns={visibleColumns}
          data={sortedRows}
          keyField="id"
          variant="modernEmbedded"
          {...tableResizeProps}
        />
        {filteredRows.length === 0 ? (
          <TableEmptyBelow
            icon={CreditCard}
            title={emptyState.title}
            description={emptyState.description}
            action={
              selectedRun && lineItems.length > 0 ? (
                <Button variant="primary" className="gap-2 bg-orange-500 hover:bg-orange-600" onClick={() => setCreateOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Add Loan or Advance
                </Button>
              ) : selectedRun?.status === 'draft' && onRecalculate ? (
                <Button variant="secondary" onClick={onRecalculate}>
                  Recalculate run
                </Button>
              ) : null
            }
          />
        ) : null}
      </HRDataTableCard>

      <CreateLoanAdvanceModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        selectedRun={selectedRun}
        lineItems={lineItems}
        onSaved={handleCreate}
      />
    </>
  )
}
