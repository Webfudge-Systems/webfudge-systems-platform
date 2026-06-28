'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, ShieldCheck } from 'lucide-react'
import {
  Badge,
  Button,
  Table,
  TableCellCreated,
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
import PayrollRunBanner from './PayrollRunBanner'
import {
  PayrollAmountCell,
  PayrollComplianceItemCell,
  PayrollStatusBadge,
} from './PayrollTableCells'
import RecordComplianceFilingModal from './RecordComplianceFilingModal'
import { saveComplianceFiling } from '../../lib/complianceFilings'
import {
  buildComplianceRows,
  complianceSortValue,
  computeComplianceStats,
  filterComplianceItems,
  getComplianceTabItems,
  matchesComplianceTab,
} from '../../lib/payrollPage'
import { runBannerPayload } from '../../lib/payrollShared'

const TABLE_SORT_STORAGE_KEY = 'hr.payroll.compliance.tableSort'
const COLUMN_VISIBILITY_STORAGE_KEY = 'hr.payroll.compliance.tableColumnVisibility'
const COLUMN_ORDER_STORAGE_KEY = 'hr.payroll.compliance.tableColumnOrder'
const COLUMN_WIDTHS_STORAGE_KEY = 'hr.payroll.compliance.tableColumnWidths'

const DEFAULT_COLUMN_WIDTHS = {
  item: 280,
  type: 120,
  amount: 130,
  period: 140,
  status: 120,
  filedAt: 140,
  reference: 180,
  actions: 150,
}

const TOGGLEABLE_COLUMNS = [
  { key: 'type', label: 'Type' },
  { key: 'amount', label: 'Liability' },
  { key: 'period', label: 'Period' },
  { key: 'status', label: 'Status' },
  { key: 'filedAt', label: 'Filed' },
  { key: 'reference', label: 'Reference' },
]

const DEFAULT_COLUMN_VISIBILITY = TOGGLEABLE_COLUMNS.reduce((acc, { key }) => ({ ...acc, [key]: true }), {})
const SORT_COLUMN_OPTIONS = [{ key: 'item', label: 'Item' }, ...TOGGLEABLE_COLUMNS]
const SORTABLE_KEYS = SORT_COLUMN_OPTIONS.map((column) => column.key)

const MIN_COLUMN_WIDTHS = { actions: 130 }

export default function PayrollComplianceContent({
  selectedRun,
  sourceLines = [],
  filings = {},
  onFilingsChange,
  onRecalculate,
  onTransition,
  onReload,
  actionError = '',
  lockBlockers = [],
  readOnlyRun = false,
}) {
  const [activeTab, setActiveTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortPickerOpen, setSortPickerOpen] = useState(false)
  const [recordOpen, setRecordOpen] = useState(false)
  const [recordObligationId, setRecordObligationId] = useState('')

  const allRows = useMemo(
    () => buildComplianceRows(selectedRun, filings, sourceLines),
    [selectedRun, filings, sourceLines],
  )

  const stats = useMemo(() => computeComplianceStats(allRows), [allRows])
  const tabItems = useMemo(() => getComplianceTabItems(stats), [stats])

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
    const searched = filterComplianceItems(allRows, searchQuery)
    return searched.filter((row) => matchesComplianceTab(row, activeTab))
  }, [allRows, searchQuery, activeTab])

  const sortedRows = useMemo(
    () => sortData(filteredRows, (row, key) => complianceSortValue(row, key)),
    [filteredRows, sortData],
  )

  const fileableCount = useMemo(
    () => allRows.filter((row) => row.status === 'Ready').length,
    [allRows],
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

  const handleRecordSaved = useCallback(
    async (payload) => {
      if (!selectedRun?.id) return
      const updated = saveComplianceFiling(selectedRun.id, payload.obligationId, payload)
      onFilingsChange?.(updated)
      setActiveTab('filed')
    },
    [selectedRun?.id, onFilingsChange],
  )

  const openRecordModal = useCallback((obligationId = '') => {
    setRecordObligationId(obligationId)
    setRecordOpen(true)
  }, [])

  const handleTransition = useCallback(
    async (action) => {
      await onTransition?.(action)
      if (selectedRun?.id) await onReload?.(selectedRun.id)
    },
    [onTransition, onReload, selectedRun?.id],
  )

  const columns = useMemo(
    () => [
      {
        key: 'item',
        label: 'ITEM',
        fixed: true,
        render: (_, row) => <PayrollComplianceItemCell row={row} />,
      },
      {
        key: 'type',
        visibilityKey: 'type',
        label: 'TYPE',
        render: (_, row) => <TableCellText value={row.type} />,
      },
      {
        key: 'amount',
        visibilityKey: 'amount',
        label: 'LIABILITY',
        render: (_, row) =>
          row.amount > 0 ? (
            <PayrollAmountCell value={row.amount} emphasized />
          ) : (
            <TableCellText value="—" className="text-gray-400" />
          ),
      },
      {
        key: 'period',
        visibilityKey: 'period',
        label: 'PERIOD',
        render: (_, row) => <TableCellText value={row.period} />,
      },
      {
        key: 'status',
        visibilityKey: 'status',
        label: 'STATUS',
        render: (_, row) => <PayrollStatusBadge status={row.status} />,
      },
      {
        key: 'filedAt',
        visibilityKey: 'filedAt',
        label: 'FILED',
        render: (_, row) =>
          row.filedAt ? (
            <TableCellCreated dateString={row.filedAt} />
          ) : (
            <span className="text-sm text-gray-400">—</span>
          ),
      },
      {
        key: 'reference',
        visibilityKey: 'reference',
        label: 'REFERENCE',
        render: (_, row) => (
          <TableCellText value={row.reference || '—'} className={row.reference ? '' : 'text-gray-400'} />
        ),
      },
      {
        key: 'actions',
        label: 'ACTIONS',
        fixed: true,
        width: 150,
        resizable: false,
        render: (_, row) => (
          <div className="flex justify-end" onClick={(event) => event.stopPropagation()}>
            {row.status === 'Ready' ? (
              <Button
                variant="primary"
                size="sm"
                className="gap-1 bg-orange-500 hover:bg-orange-600"
                disabled={readOnlyRun}
                onClick={() => openRecordModal(row.id)}
              >
                <Plus className="h-4 w-4" />
                Record
              </Button>
            ) : row.status === 'Filed' ? (
              <Button variant="secondary" size="sm" disabled>
                Filed
              </Button>
            ) : row.status === 'Pending' ? (
              <Button variant="secondary" size="sm" disabled title="Lock payroll run to mark ready">
                Pending
              </Button>
            ) : (
              <span className="text-sm text-gray-400">—</span>
            )}
          </div>
        ),
      },
    ],
    [readOnlyRun, openRecordModal],
  )

  const visibleColumns = useMemo(() => {
    const byKey = Object.fromEntries(columns.map((column) => [column.key, column]))
    const out = []
    if (byKey.item) out.push(byKey.item)
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
      title: selectedRun ? 'No compliance obligations' : 'Select a payroll run',
      description: selectedRun
        ? stats.applicable === 0
          ? 'Recalculate the payroll run to compute statutory liabilities from employee deductions.'
          : 'Try clearing your search filter or switch tabs.'
        : 'Choose a payroll run from the toolbar to view compliance obligations.',
    },
    pending: {
      title: 'Nothing pending',
      description:
        selectedRun?.status === 'draft' || selectedRun?.status === 'review'
          ? 'Pending obligations appear while the run is in draft or review. Move to Review, then Lock to mark ready.'
          : 'All applicable obligations are either ready or filed.',
    },
    ready: {
      title: 'Nothing ready to file',
      description: 'Lock the payroll run to mark obligations as ready for filing.',
    },
    filed: {
      title: 'No filed records yet',
      description: 'Use the + button to record acknowledgement numbers after filing with authorities.',
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
          searchPlaceholder="Search compliance..."
          showAdd
          onAddClick={() => openRecordModal('')}
          addTitle="Record filing"
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
          sortTitle="Sort compliance rows (Shift+click headers for multi-sort)"
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
          description="Item column stays visible. Drag column edges in the table to resize."
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

      {selectedRun ? (
        <PayrollRunBanner
          run={runBannerPayload(selectedRun)}
          onReview={() => handleTransition('review')}
          onLock={() => handleTransition('lock')}
          onDisburse={() => handleTransition('disburse')}
          onRecalculate={onRecalculate}
        />
      ) : null}

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
            icon={ShieldCheck}
            title={emptyState.title}
            description={emptyState.description}
            action={
              selectedRun && fileableCount > 0 ? (
                <Button variant="primary" className="gap-2" onClick={() => openRecordModal('')}>
                  <Plus className="h-4 w-4" />
                  Record Filing
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

      <RecordComplianceFilingModal
        open={recordOpen}
        onClose={() => setRecordOpen(false)}
        selectedRun={selectedRun}
        obligations={allRows}
        initialObligationId={recordObligationId}
        readOnlyRun={readOnlyRun}
        onSaved={handleRecordSaved}
      />
    </>
  )
}
