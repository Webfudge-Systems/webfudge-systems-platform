'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Edit, Eye, Plus, Trash2 } from 'lucide-react'
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
import AddPipModal from './AddPipModal'
import PipDetailModal from './PipDetailModal'
import PipEditModal from './PipEditModal'
import {
  PipDurationCell,
  PipEmployeeCell,
  PipManagerCell,
  PipMilestonesCell,
  PipStartCell,
  PipStatusPill,
} from './PerformancePipTableCells'
import {
  deletePip,
  isCustomPip,
  listPips,
  PIPS_UPDATED_EVENT,
} from '../../lib/performancePipsService'
import { listSyncedEmployees } from '../../lib/employeeSyncService'
import {
  filterPips,
  getPipTabItems,
  matchesPipTab,
  pipSortValue,
} from '../../lib/performancePage'

const TABLE_SORT_STORAGE_KEY = 'hr.performance.pips.tableSort'
const COLUMN_VISIBILITY_STORAGE_KEY = 'hr.performance.pips.tableColumnVisibility'
const COLUMN_ORDER_STORAGE_KEY = 'hr.performance.pips.tableColumnOrder'
const COLUMN_WIDTHS_STORAGE_KEY = 'hr.performance.pips.tableColumnWidths'

const DEFAULT_COLUMN_WIDTHS = {
  employee: 260,
  manager: 160,
  start: 140,
  duration: 120,
  milestones: 120,
  status: 130,
  actions: 160,
}

const MIN_COLUMN_WIDTHS = { actions: 140 }

const TOGGLEABLE_COLUMNS = [
  { key: 'manager', label: 'Manager' },
  { key: 'start', label: 'Start' },
  { key: 'duration', label: 'Duration' },
  { key: 'milestones', label: 'Milestones' },
  { key: 'status', label: 'Status' },
]

const DEFAULT_COLUMN_VISIBILITY = TOGGLEABLE_COLUMNS.reduce((acc, { key }) => ({ ...acc, [key]: true }), {})
const SORT_COLUMN_OPTIONS = [{ key: 'employee', label: 'Employee' }, ...TOGGLEABLE_COLUMNS]
const SORTABLE_KEYS = SORT_COLUMN_OPTIONS.map((column) => column.key)

const EMPTY_COPY = {
  all: {
    title: 'No performance improvement plans',
    description: 'Create a PIP to track milestones and outcomes for an employee.',
  },
  active: {
    title: 'No active PIPs',
    description: 'In-progress improvement plans appear here.',
  },
  closed: {
    title: 'No closed PIPs',
    description: 'Closed or terminated plans are archived here.',
  },
}

export default function PerformancePipsContent() {
  const [pips, setPips] = useState([])
  const [activeTab, setActiveTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [sortPickerOpen, setSortPickerOpen] = useState(false)
  const [selectedPip, setSelectedPip] = useState(null)
  const [editingPip, setEditingPip] = useState(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [actionError, setActionError] = useState('')
  const [employeeOptions, setEmployeeOptions] = useState([])

  const openDetail = (pip) => setSelectedPip(pip)
  const openEdit = (pip) => {
    setSelectedPip(null)
    setEditingPip(pip)
  }
  const closeDetail = () => {
    if (deleting) return
    setSelectedPip(null)
    setDeleteOpen(false)
  }
  const closeEdit = () => {
    setEditingPip(null)
  }

  const loadPips = useCallback(() => {
    setPips(listPips())
  }, [])

  useEffect(() => {
    loadPips()
  }, [loadPips])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { employees } = await listSyncedEmployees()
        if (!cancelled) {
          setEmployeeOptions(
            (employees || []).map((employee) => ({
              id: String(employee.id || ''),
              name: employee.name || '',
              email: employee.email || '',
              manager: employee.manager || '',
            })),
          )
        }
      } catch {
        if (!cancelled) setEmployeeOptions([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const onUpdated = () => loadPips()
    window.addEventListener(PIPS_UPDATED_EVENT, onUpdated)
    return () => window.removeEventListener(PIPS_UPDATED_EVENT, onUpdated)
  }, [loadPips])

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

  const handlePipSaved = useCallback((saved) => {
    const rows = listPips()
    setPips(rows)
    setSearchQuery('')
    if (saved?.status === 'Active') {
      setActiveTab('active')
      return
    }
    if (saved?.status === 'Closed' || saved?.status === 'Terminated') {
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

  const tabItems = useMemo(() => getPipTabItems(pips), [pips])

  const filteredPips = useMemo(() => {
    return filterPips(pips, searchQuery).filter((row) => matchesPipTab(row, activeTab))
  }, [pips, searchQuery, activeTab])

  const sortedRows = useMemo(
    () => sortData(filteredPips, (row, key) => pipSortValue(row, key)),
    [filteredPips, sortData, sortRules],
  )

  const tableRows = useMemo(
    () => sortedRows.map((row) => ({ ...row, id: row.id || row.employee })),
    [sortedRows],
  )

  const pipColumns = useMemo(
    () => [
      {
        key: 'employee',
        label: 'EMPLOYEE',
        fixed: true,
        render: (_, row) => <PipEmployeeCell row={row} />,
      },
      {
        key: 'manager',
        visibilityKey: 'manager',
        label: 'MANAGER',
        render: (_, row) => <PipManagerCell row={row} />,
      },
      {
        key: 'start',
        visibilityKey: 'start',
        label: 'START',
        render: (_, row) => <PipStartCell row={row} />,
      },
      {
        key: 'duration',
        visibilityKey: 'duration',
        label: 'DURATION',
        render: (_, row) => <PipDurationCell row={row} />,
      },
      {
        key: 'milestones',
        visibilityKey: 'milestones',
        label: 'MILESTONES',
        render: (_, row) => <PipMilestonesCell row={row} />,
      },
      {
        key: 'status',
        visibilityKey: 'status',
        label: 'STATUS',
        render: (_, row) => <PipStatusPill row={row} />,
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
              title="View PIP"
              onClick={() => openDetail(row)}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="p-2 text-orange-600 hover:bg-orange-50"
              title={isCustomPip(row) ? 'Edit PIP' : 'Sample PIP cannot be edited'}
              disabled={!isCustomPip(row)}
              onClick={() => openEdit(row)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="p-2 text-red-600 hover:bg-red-50"
              title={isCustomPip(row) ? 'Delete PIP' : 'Sample PIP cannot be deleted'}
              disabled={!isCustomPip(row)}
              onClick={() => {
                setActionError('')
                setSelectedPip(row)
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
    const byKey = Object.fromEntries(pipColumns.map((column) => [column.key, column]))
    const out = []
    if (byKey.employee) out.push(byKey.employee)
    for (const key of columnOrder) {
      const column = byKey[key]
      if (!column?.visibilityKey || !columnVisibility[column.visibilityKey]) continue
      out.push(column)
    }
    if (byKey.actions) out.push(byKey.actions)
    return bindSortableColumns(out, SORTABLE_KEYS)
  }, [pipColumns, columnOrder, columnVisibility, bindSortableColumns])

  const emptyCopy = EMPTY_COPY[activeTab] || EMPTY_COPY.all

  const handleDelete = async () => {
    if (!selectedPip?.id) return
    try {
      setDeleting(true)
      setActionError('')
      deletePip(selectedPip.id)
      setDeleteOpen(false)
      setSelectedPip(null)
      setEditingPip((current) => (current?.id === selectedPip.id ? null : current))
      loadPips()
    } catch (error) {
      setActionError(error?.message || 'Failed to delete PIP')
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
          searchPlaceholder="Search PIPs..."
          showAdd
          onAddClick={() => setAddOpen(true)}
          addTitle="New PIP"
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
          sortTitle="Sort PIPs (Shift+click headers for multi-sort)"
          showExport
          onExportClick={() => console.log('Export PIPs')}
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
            icon={AlertTriangle}
            title={emptyCopy.title}
            description={emptyCopy.description}
            action={
              <Button variant="primary" onClick={() => setAddOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                New PIP
              </Button>
            }
          />
        ) : null}
      </HRDataTableCard>

      <AddPipModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSaved={handlePipSaved}
        employees={employeeOptions}
      />

      <PipDetailModal
        pip={selectedPip}
        open={Boolean(selectedPip) && !deleteOpen && !editingPip}
        onClose={closeDetail}
        onEdit={openEdit}
        onDelete={() => setDeleteOpen(true)}
        deleting={deleting}
      />

      <PipEditModal
        pip={editingPip}
        open={Boolean(editingPip)}
        employees={employeeOptions}
        onClose={closeEdit}
        onSaved={async (updated) => {
          handlePipSaved(updated)
          await loadPips()
        }}
      />

      <Modal isOpen={deleteOpen} onClose={() => !deleting && setDeleteOpen(false)} title="Delete PIP" size="sm">
        <p className="text-sm text-gray-600">
          Delete PIP for <span className="font-semibold text-gray-900">{selectedPip?.employee}</span>? This cannot be undone.
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
