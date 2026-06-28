'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Eye, Trash2, Edit, Landmark } from 'lucide-react'
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
import {
  PayrollAmountCell,
  PayrollStructureActiveBadge,
  PayrollStructureBreakdownCell,
  PayrollStructureCell,
  PayrollStructureHeadcountCell,
} from './PayrollTableCells'
import SalaryStructureDetailModal from './SalaryStructureDetailModal'
import SalaryStructureEditModal from './SalaryStructureEditModal'
import { getSalaryStructureTabItems, matchesSalaryStructureTab } from '../../lib/payrollPage'
import { deleteSalaryStructure, duplicateSalaryStructure } from '../../lib/payrollSyncService'

const TABLE_SORT_STORAGE_KEY = 'hr.payroll.structures.tableSort'
const COLUMN_VISIBILITY_STORAGE_KEY = 'hr.payroll.structures.tableColumnVisibility'
const COLUMN_ORDER_STORAGE_KEY = 'hr.payroll.structures.tableColumnOrder'
const COLUMN_WIDTHS_STORAGE_KEY = 'hr.payroll.structures.tableColumnWidths'

const DEFAULT_COLUMN_WIDTHS = {
  structure: 260,
  ctc: 140,
  headcount: 120,
  breakdown: 280,
  status: 120,
  actions: 190,
}

const MIN_COLUMN_WIDTHS = { actions: 170 }

const TOGGLEABLE_COLUMNS = [
  { key: 'ctc', label: 'CTC' },
  { key: 'headcount', label: 'Headcount' },
  { key: 'breakdown', label: 'Breakdown' },
  { key: 'status', label: 'Status' },
]

const DEFAULT_COLUMN_VISIBILITY = TOGGLEABLE_COLUMNS.reduce((acc, { key }) => ({ ...acc, [key]: true }), {})

const SORT_COLUMN_OPTIONS = [{ key: 'structure', label: 'Structure' }, ...TOGGLEABLE_COLUMNS.filter((c) => c.key !== 'breakdown')]
const SORTABLE_KEYS = SORT_COLUMN_OPTIONS.map((column) => column.key)

function structureSortValue(row, key) {
  if (key === 'structure') return row.name || ''
  if (key === 'ctc') return Number(row.ctc || 0)
  if (key === 'headcount') return Number(row.headcount || 0)
  if (key === 'status') return row.isActive === false ? 'inactive' : 'active'
  return row[key]
}

export default function PayrollStructuresContent({ structures, onReload, selectedRunId }) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStructure, setSelectedStructure] = useState(null)
  const [editingStructure, setEditingStructure] = useState(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [sortPickerOpen, setSortPickerOpen] = useState(false)

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

  const openDetail = (structure) => setSelectedStructure(structure)
  const openEdit = (structure) => {
    setSelectedStructure(null)
    setEditingStructure(structure)
  }
  const closeDetail = () => {
    if (deleting) return
    setSelectedStructure(null)
    setDeleteOpen(false)
  }
  const closeEdit = () => {
    setEditingStructure(null)
  }

  const tabItems = useMemo(() => getSalaryStructureTabItems(structures), [structures])

  const filteredRows = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    return structures.filter((structure) => {
      if (!matchesSalaryStructureTab(structure, activeTab)) return false
      if (!q) return true
      return (
        structure.name.toLowerCase().includes(q) ||
        JSON.stringify(structure.components || '').toLowerCase().includes(q)
      )
    })
  }, [structures, searchQuery, activeTab])

  const sortedRows = useMemo(
    () => sortData(filteredRows, (row, key) => structureSortValue(row, key)),
    [filteredRows, sortData],
  )

  useEffect(() => {
    if (!columnPickerOpen && !sortPickerOpen) return undefined
    const onDocMouseDown = (event) => {
      if (toolbarRef.current && !toolbarRef.current.contains(event.target)) {
        setColumnPickerOpen(false)
        setSortPickerOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [columnPickerOpen, sortPickerOpen, setColumnPickerOpen])

  const emptyStateCopy = {
    all: {
      title: 'No salary structures found',
      description: 'Create a structure to start payroll computation.',
    },
    active: {
      title: 'No active structures',
      description: 'Active structures can be assigned to employees for payroll runs.',
    },
    'in-use': {
      title: 'No structures in use',
      description: 'Structures assigned to at least one employee will appear here.',
    },
    unassigned: {
      title: 'No unassigned structures',
      description: 'Structures not linked to any employee will appear here.',
    },
    'invalid-split': {
      title: 'No invalid splits',
      description: 'Structures whose component percentages do not total 100% will appear here.',
    },
  }

  const emptyCopy = emptyStateCopy[activeTab] || emptyStateCopy.all

  const handleDelete = async () => {
    if (!selectedStructure) return
    try {
      setDeleting(true)
      await deleteSalaryStructure(selectedStructure.id)
      setSelectedStructure(null)
      setDeleteOpen(false)
      await onReload(selectedRunId)
    } finally {
      setDeleting(false)
    }
  }

  const structureColumns = useMemo(
    () => [
      {
        key: 'structure',
        label: 'STRUCTURE',
        fixed: true,
        render: (_, row) => <PayrollStructureCell row={row} />,
      },
      {
        key: 'ctc',
        visibilityKey: 'ctc',
        label: 'CTC',
        render: (_, row) => <PayrollAmountCell value={row.ctc} emphasized />,
      },
      {
        key: 'headcount',
        visibilityKey: 'headcount',
        label: 'HEADCOUNT',
        render: (_, row) => <PayrollStructureHeadcountCell value={row.headcount} />,
      },
      {
        key: 'breakdown',
        visibilityKey: 'breakdown',
        label: 'BREAKDOWN',
        render: (_, row) => <PayrollStructureBreakdownCell row={row} />,
      },
      {
        key: 'status',
        visibilityKey: 'status',
        label: 'STATUS',
        render: (_, row) => <PayrollStructureActiveBadge isActive={row.isActive !== false} />,
      },
      {
        key: 'actions',
        label: 'ACTIONS',
        fixed: true,
        width: 190,
        resizable: false,
        headerClassName: 'whitespace-nowrap text-right',
        className: 'whitespace-nowrap text-right align-middle',
        render: (_, row) => (
          <div className="flex min-w-[170px] shrink-0 items-center justify-end gap-0.5" onClick={(event) => event.stopPropagation()}>
            <Button variant="ghost" size="sm" className="p-2 text-emerald-600 hover:bg-emerald-50" title="View structure" onClick={() => openDetail(row)}>
              <Eye className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="p-2 text-orange-600 hover:bg-orange-50" title="Edit structure" onClick={() => openEdit(row)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="p-2 text-blue-600 hover:bg-blue-50"
              title="Duplicate structure"
              onClick={async () => {
                await duplicateSalaryStructure(row.id)
                await onReload(selectedRunId)
              }}
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="p-2 text-red-600 hover:bg-red-50"
              title="Delete structure"
              onClick={() => {
                setSelectedStructure(row)
                setDeleteOpen(true)
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    [onReload, selectedRunId],
  )

  const visibleColumns = useMemo(() => {
    const byKey = Object.fromEntries(structureColumns.map((column) => [column.key, column]))
    const out = []
    if (byKey.structure) out.push(byKey.structure)
    for (const key of columnOrder) {
      const column = byKey[key]
      if (!column?.visibilityKey || !columnVisibility[column.visibilityKey]) continue
      out.push(column)
    }
    if (byKey.actions) out.push(byKey.actions)
    return bindSortableColumns(out, SORTABLE_KEYS)
  }, [structureColumns, columnOrder, columnVisibility, bindSortableColumns])

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
          searchPlaceholder="Search structures..."
          showAdd
          addHref="/payroll/structures/new"
          addTitle="Create Structure"
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
          sortTitle="Sort structures (Shift+click headers for multi-sort)"
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
          description="Structure name and actions stay visible. Drag column edges in the table to resize."
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
          onRowClick={openDetail}
        />
        {filteredRows.length === 0 ? (
          <TableEmptyBelow
            icon={Landmark}
            title={emptyCopy.title}
            description={emptyCopy.description}
            action={
              activeTab === 'all' ? (
                <Button variant="primary" onClick={() => router.push('/payroll/structures/new')}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Structure
                </Button>
              ) : null
            }
          />
        ) : null}
      </HRDataTableCard>

      <SalaryStructureDetailModal
        structure={selectedStructure}
        open={Boolean(selectedStructure) && !deleteOpen && !editingStructure}
        onClose={closeDetail}
        onEdit={openEdit}
        onDelete={() => setDeleteOpen(true)}
      />

      <SalaryStructureEditModal
        structure={editingStructure}
        open={Boolean(editingStructure)}
        onClose={closeEdit}
        onSaved={async () => {
          await onReload(selectedRunId)
        }}
      />

      <Modal isOpen={deleteOpen} onClose={() => !deleting && setDeleteOpen(false)} title="Delete structure" size="sm">
        <p className="text-sm text-gray-600">
          Delete <span className="font-semibold text-gray-900">{selectedStructure?.name}</span>? This cannot be undone.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" size="sm" disabled={deleting} onClick={() => setDeleteOpen(false)}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" className="!bg-red-600 hover:!bg-red-700" disabled={deleting} onClick={handleDelete}>
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </div>
      </Modal>
    </>
  )
}
