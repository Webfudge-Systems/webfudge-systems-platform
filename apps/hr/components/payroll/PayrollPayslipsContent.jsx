'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Download, FileStack, FileText, Plus, RefreshCcw } from 'lucide-react'
import {
  Button,
  Table,
  TableCellCreated,
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
  PayrollDepartmentCell,
  PayrollPayslipEmployeeCell,
  PayrollStatusBadge,
} from './PayrollTableCells'
import GeneratePayslipModal from './GeneratePayslipModal'
import {
  buildPayslipTableRows,
  computePayslipStats,
  filterPayslips,
  getPayslipTabItems,
  getPayslipGenerationStatus,
  matchesPayslipTab,
  payslipSortValue,
} from '../../lib/payrollPage'
import { generatePayslip, generateAllPayslips, downloadPayslip } from '../../lib/payrollSyncService'

const TABLE_SORT_STORAGE_KEY = 'hr.payroll.payslips.tableSort'
const COLUMN_VISIBILITY_STORAGE_KEY = 'hr.payroll.payslips.tableColumnVisibility'
const COLUMN_ORDER_STORAGE_KEY = 'hr.payroll.payslips.tableColumnOrder'
const COLUMN_WIDTHS_STORAGE_KEY = 'hr.payroll.payslips.tableColumnWidths'

const DEFAULT_COLUMN_WIDTHS = {
  employee: 260,
  payslipNumber: 150,
  dept: 160,
  net: 120,
  generatedAt: 140,
  status: 120,
  actions: 150,
}

const MIN_COLUMN_WIDTHS = { actions: 130 }

const TOGGLEABLE_COLUMNS = [
  { key: 'payslipNumber', label: 'Payslip no.' },
  { key: 'dept', label: 'Department' },
  { key: 'net', label: 'Net pay' },
  { key: 'generatedAt', label: 'Generated' },
  { key: 'status', label: 'Status' },
]

const DEFAULT_COLUMN_VISIBILITY = TOGGLEABLE_COLUMNS.reduce((acc, { key }) => ({ ...acc, [key]: true }), {})

const SORT_COLUMN_OPTIONS = [{ key: 'employee', label: 'Employee' }, ...TOGGLEABLE_COLUMNS]
const SORTABLE_KEYS = SORT_COLUMN_OPTIONS.map((column) => column.key)

export default function PayrollPayslipsContent({
  payslips = [],
  lineItems = [],
  selectedRun,
  readOnlyRun = false,
  onReload,
  onRecalculate,
}) {
  const [activeTab, setActiveTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortPickerOpen, setSortPickerOpen] = useState(false)
  const [generatingId, setGeneratingId] = useState(null)
  const [generatingAll, setGeneratingAll] = useState(false)
  const [generateAllProgress, setGenerateAllProgress] = useState(null)
  const [downloadingId, setDownloadingId] = useState(null)
  const [actionError, setActionError] = useState('')
  const [generateOpen, setGenerateOpen] = useState(false)

  const tableRows = useMemo(() => buildPayslipTableRows(payslips, lineItems), [payslips, lineItems])
  const pendingRows = useMemo(() => tableRows.filter((row) => row.rowType === 'pending'), [tableRows])
  const tabItems = useMemo(
    () => getPayslipTabItems(computePayslipStats(payslips, lineItems)),
    [payslips, lineItems],
  )
  const runStatus = useMemo(
    () => getPayslipGenerationStatus({ payslips, lineItems }),
    [payslips, lineItems],
  )

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
    const searched = filterPayslips(tableRows, searchQuery)
    return searched.filter((row) => matchesPayslipTab(row, activeTab))
  }, [tableRows, searchQuery, activeTab])

  const sortedRows = useMemo(
    () => sortData(filteredRows, (row, key) => payslipSortValue(row, key)),
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

  const handleGenerate = useCallback(
    async (row) => {
      if (!selectedRun?.id || !row.payrollLineItemId) return
      try {
        setGeneratingId(row.id)
        setActionError('')
        await generatePayslip({ payrollRunId: selectedRun.id, payrollLineItemId: row.payrollLineItemId })
        await onReload?.(selectedRun.id)
      } catch (err) {
        setActionError(err?.message || 'Failed to generate payslip')
      } finally {
        setGeneratingId(null)
      }
    },
    [selectedRun, onReload],
  )

  const handleGenerateAll = useCallback(async () => {
    if (!selectedRun?.id || readOnlyRun || pendingRows.length === 0) return
    try {
      setGeneratingAll(true)
      setGenerateAllProgress({ current: 0, total: pendingRows.length })
      setActionError('')
      await generateAllPayslips({
        payrollRunId: selectedRun.id,
        payrollLineItemIds: pendingRows.map((row) => row.payrollLineItemId),
        onProgress: ({ current, total }) => setGenerateAllProgress({ current, total }),
      })
      await onReload?.(selectedRun.id)
      setActiveTab('generated')
    } catch (err) {
      setActionError(err?.message || 'Failed to generate payslips')
    } finally {
      setGeneratingAll(false)
      setGenerateAllProgress(null)
    }
  }, [selectedRun, readOnlyRun, pendingRows, onReload])

  const handleDownload = useCallback(async (row) => {
    if (!row.payslipId) return
    try {
      setDownloadingId(row.id)
      setActionError('')
      await downloadPayslip(row.payslipId, { filename: `${row.payslipNumber || 'payslip'}.pdf` })
    } catch (err) {
      setActionError(err?.message || 'Failed to download payslip')
    } finally {
      setDownloadingId(null)
    }
  }, [])

  const handleGenerated = useCallback(
    async (runId) => {
      await onReload?.(runId)
      setActiveTab('generated')
    },
    [onReload],
  )

  const payslipColumns = useMemo(
    () => [
      {
        key: 'employee',
        label: 'EMPLOYEE',
        fixed: true,
        render: (_, row) => <PayrollPayslipEmployeeCell row={row} />,
      },
      {
        key: 'payslipNumber',
        visibilityKey: 'payslipNumber',
        label: 'PAYSLIP NO.',
        render: (_, row) => (
          <span className="text-sm font-medium text-gray-900 tabular-nums">{row.payslipNumber}</span>
        ),
      },
      {
        key: 'dept',
        visibilityKey: 'dept',
        label: 'DEPARTMENT',
        render: (_, row) => <PayrollDepartmentCell department={row.dept} />,
      },
      {
        key: 'net',
        visibilityKey: 'net',
        label: 'NET PAY',
        render: (_, row) => <PayrollAmountCell value={row.net} emphasized />,
      },
      {
        key: 'generatedAt',
        visibilityKey: 'generatedAt',
        label: 'GENERATED',
        render: (_, row) =>
          row.generatedAt ? (
            <TableCellCreated dateString={row.generatedAt} />
          ) : (
            <span className="text-sm text-gray-400">—</span>
          ),
      },
      {
        key: 'status',
        visibilityKey: 'status',
        label: 'STATUS',
        render: (_, row) => <PayrollStatusBadge status={row.status} />,
      },
      {
        key: 'actions',
        label: 'ACTIONS',
        fixed: true,
        width: 150,
        resizable: false,
        render: (_, row) => (
          <div className="flex justify-end" onClick={(event) => event.stopPropagation()}>
            {row.rowType === 'generated' ? (
              <Button
                variant="secondary"
                size="sm"
                disabled={downloadingId === row.id}
                onClick={() => handleDownload(row)}
              >
                <Download className="mr-1 h-4 w-4" />
                {downloadingId === row.id ? 'Downloading…' : 'Download'}
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                className="gap-1 bg-orange-500 hover:bg-orange-600"
                disabled={readOnlyRun || generatingId === row.id || generatingAll}
                onClick={() => handleGenerate(row)}
              >
                <Plus className="h-4 w-4" />
                {generatingId === row.id ? 'Generating…' : 'Generate'}
              </Button>
            )}
          </div>
        ),
      },
    ],
    [readOnlyRun, generatingId, generatingAll, downloadingId, handleGenerate, handleDownload],
  )

  const visibleColumns = useMemo(() => {
    const byKey = Object.fromEntries(payslipColumns.map((column) => [column.key, column]))
    const out = []
    if (byKey.employee) out.push(byKey.employee)
    for (const key of columnOrder) {
      const column = byKey[key]
      if (!column?.visibilityKey || !columnVisibility[column.visibilityKey]) continue
      out.push(column)
    }
    if (byKey.actions) out.push(byKey.actions)
    return bindSortableColumns(out, SORTABLE_KEYS)
  }, [payslipColumns, columnOrder, columnVisibility, bindSortableColumns])

  const emptyCopy = {
    all: {
      title:
        runStatus.kind === 'no-employees'
          ? 'No employees in this run'
          : runStatus.stats.generated > 0
            ? 'No rows match this view'
            : 'No payslips yet',
      description:
        runStatus.kind === 'no-employees'
          ? 'Click Recalculate in the payroll run toolbar to load employees, then use + to generate payslips.'
          : runStatus.stats.generated > 0
            ? 'Switch to the Generated tab to view and download payslips for this run.'
            : selectedRun
              ? `Generate payslips for the ${selectedRun.monthLabel || 'selected'} payroll run using the + button above.`
              : 'Select a payroll run to view or generate payslips.',
    },
    generated: {
      title: 'No generated payslips',
      description:
        runStatus.stats.generated > 0
          ? 'Try clearing your search filter.'
          : 'Payslips you generate will appear here for download.',
    },
    pending: {
      title: 'Nothing pending',
      description:
        runStatus.kind === 'no-employees'
          ? 'Recalculate the payroll run first to load employee rows.'
          : 'All employees in this run already have payslips generated. Check the Generated tab.',
    },
  }

  const emptyState = emptyCopy[activeTab] || emptyCopy.all

  const showGenerateAll =
    !readOnlyRun && selectedRun?.id && runStatus.canGenerate && pendingRows.length > 0

  const generateAllLabel = generatingAll
    ? generateAllProgress
      ? `Generating ${generateAllProgress.current}/${generateAllProgress.total}…`
      : 'Generating…'
    : pendingRows.length === 1
      ? 'Generate payslip'
      : `Generate all (${pendingRows.length})`

  return (
    <>
      {actionError ? <p className="mb-3 text-sm text-red-600">{actionError}</p> : null}
      <div className="relative" ref={toolbarRef}>
        <TabsWithActions
          tabs={tabItems.map((item) => ({ key: item.key, label: item.label, badge: String(item.count) }))}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          afterTabs={
            showGenerateAll ? (
              <Button
                type="button"
                variant="primary"
                size="sm"
                className="hidden shrink-0 gap-1.5 bg-orange-500 hover:bg-orange-600 sm:inline-flex"
                disabled={generatingAll || generatingId != null}
                onClick={handleGenerateAll}
                title={`Generate payslips for all ${pendingRows.length} pending employees`}
              >
                <FileStack className="h-4 w-4" aria-hidden />
                {generateAllLabel}
              </Button>
            ) : null
          }
          showSearch
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search payslips..."
          showAdd
          onAddClick={() => setGenerateOpen(true)}
          addTitle="Generate payslip"
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
          sortTitle="Sort payslips (Shift+click headers for multi-sort)"
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
            icon={FileText}
            title={emptyState.title}
            description={emptyState.description}
            action={
              runStatus.kind === 'all-generated' ? (
                <Button variant="secondary" onClick={() => setActiveTab('generated')}>
                  View Generated tab
                </Button>
              ) : showGenerateAll ? (
                <div className="flex flex-wrap justify-center gap-2">
                  <Button
                    variant="primary"
                    className="gap-2 bg-orange-500 hover:bg-orange-600"
                    disabled={generatingAll}
                    onClick={handleGenerateAll}
                  >
                    <FileStack className="h-4 w-4" />
                    {generateAllLabel}
                  </Button>
                  <Button variant="secondary" disabled={generatingAll} onClick={() => setGenerateOpen(true)}>
                    <Plus className="h-4 w-4" />
                    Generate one
                  </Button>
                </div>
              ) : !readOnlyRun && selectedRun && runStatus.canGenerate ? (
                <Button
                  variant="primary"
                  className="bg-orange-500 hover:bg-orange-600"
                  onClick={() => setGenerateOpen(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Generate Payslip
                </Button>
              ) : runStatus.kind === 'no-employees' && onRecalculate && selectedRun?.status === 'draft' ? (
                <Button variant="secondary" className="gap-2" onClick={onRecalculate}>
                  <RefreshCcw className="h-4 w-4" />
                  Recalculate run
                </Button>
              ) : null
            }
          />
        ) : null}
      </HRDataTableCard>

      <GeneratePayslipModal
        open={generateOpen}
        onClose={() => setGenerateOpen(false)}
        selectedRun={selectedRun}
        payslips={payslips}
        lineItems={lineItems}
        pendingRows={pendingRows}
        readOnlyRun={readOnlyRun}
        onGenerated={handleGenerated}
        onRecalculate={onRecalculate}
        onViewGenerated={() => setActiveTab('generated')}
      />
    </>
  )
}
