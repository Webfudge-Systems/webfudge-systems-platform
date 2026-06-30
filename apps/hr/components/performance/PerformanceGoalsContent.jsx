'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Edit, Eye, Plus, Target, Trash2 } from 'lucide-react'
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
import AddGoalModal from './AddGoalModal'
import GoalDetailModal from './GoalDetailModal'
import GoalEditModal from './GoalEditModal'
import {
  GoalKeyResultsCountCell,
  GoalObjectiveCell,
  GoalProgressCell,
  GoalScopeCell,
  GoalStatusPill,
} from './PerformanceGoalTableCells'
import {
  deleteGoal,
  GOALS_UPDATED_EVENT,
  isCustomGoal,
  listGoals,
} from '../../lib/performanceGoalsService'
import {
  getGoalAverageProgress,
  getGoalsTabItems,
  goalSortValue,
  matchesGoalsTab,
} from '../../lib/performancePage'

const TABLE_SORT_STORAGE_KEY = 'hr.performance.goals.tableSort'
const COLUMN_VISIBILITY_STORAGE_KEY = 'hr.performance.goals.tableColumnVisibility'
const COLUMN_ORDER_STORAGE_KEY = 'hr.performance.goals.tableColumnOrder'
const COLUMN_WIDTHS_STORAGE_KEY = 'hr.performance.goals.tableColumnWidths'

const DEFAULT_COLUMN_WIDTHS = {
  objective: 280,
  scope: 140,
  progress: 120,
  keyResults: 120,
  status: 130,
  actions: 160,
}

const MIN_COLUMN_WIDTHS = { actions: 140 }

const TOGGLEABLE_COLUMNS = [
  { key: 'scope', label: 'Scope' },
  { key: 'progress', label: 'Avg progress' },
  { key: 'keyResults', label: 'Key results' },
  { key: 'status', label: 'Status' },
]

const DEFAULT_COLUMN_VISIBILITY = TOGGLEABLE_COLUMNS.reduce((acc, { key }) => ({ ...acc, [key]: true }), {})
const SORT_COLUMN_OPTIONS = [{ key: 'objective', label: 'Objective' }, ...TOGGLEABLE_COLUMNS]
const SORTABLE_KEYS = SORT_COLUMN_OPTIONS.map((column) => column.key)

const EMPTY_COPY = {
  all: {
    title: 'No goals found',
    description: 'Add a company objective with measurable key results to get started.',
  },
  'on-track': {
    title: 'No on-track goals',
    description: 'Goals with 50% or higher average progress appear here.',
  },
  'at-risk': {
    title: 'No at-risk goals',
    description: 'Goals below 50% average progress appear here. New goals start in this tab.',
  },
}

export default function PerformanceGoalsContent() {
  const [okrs, setOkrs] = useState([])
  const [activeTab, setActiveTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [myGoalsOnly, setMyGoalsOnly] = useState(false)
  const [sortPickerOpen, setSortPickerOpen] = useState(false)
  const [selectedGoal, setSelectedGoal] = useState(null)
  const [editingGoal, setEditingGoal] = useState(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [actionError, setActionError] = useState('')

  const openDetail = (goal) => setSelectedGoal(goal)
  const openEdit = (goal) => {
    setSelectedGoal(null)
    setEditingGoal(goal)
  }
  const closeDetail = () => {
    if (deleting) return
    setSelectedGoal(null)
    setDeleteOpen(false)
  }
  const closeEdit = () => {
    setEditingGoal(null)
  }

  const loadGoals = useCallback(() => {
    setOkrs(listGoals())
  }, [])

  useEffect(() => {
    loadGoals()
  }, [loadGoals])

  useEffect(() => {
    const onUpdated = () => loadGoals()
    window.addEventListener(GOALS_UPDATED_EVENT, onUpdated)
    return () => window.removeEventListener(GOALS_UPDATED_EVENT, onUpdated)
  }, [loadGoals])

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

  const handleGoalSaved = useCallback((saved) => {
    const rows = listGoals()
    setOkrs(rows)
    setMyGoalsOnly(false)
    setSearchQuery('')
    if (saved?.id) {
      const average = getGoalAverageProgress(saved)
      setActiveTab(average >= 50 ? 'on-track' : 'at-risk')
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

  const tabItems = useMemo(() => getGoalsTabItems(okrs), [okrs])

  const filteredOkrs = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    return okrs.filter((okr) => {
      if (myGoalsOnly && okr.scope !== 'individual') return false
      if (!matchesGoalsTab(okr, activeTab)) return false
      if (!q) return true
      return (
        okr.objective.toLowerCase().includes(q) ||
        okr.keyResults.some((keyResult) => keyResult.label.toLowerCase().includes(q))
      )
    })
  }, [okrs, activeTab, searchQuery, myGoalsOnly])

  const sortedRows = useMemo(
    () => sortData(filteredOkrs, (row, key) => goalSortValue(row, key)),
    [filteredOkrs, sortData, sortRules],
  )

  const tableRows = useMemo(
    () => sortedRows.map((row) => ({ ...row, id: row.id || row.objective })),
    [sortedRows],
  )

  const goalColumns = useMemo(
    () => [
      {
        key: 'objective',
        label: 'OBJECTIVE',
        fixed: true,
        render: (_, row) => <GoalObjectiveCell row={row} />,
      },
      {
        key: 'scope',
        visibilityKey: 'scope',
        label: 'SCOPE',
        render: (_, row) => <GoalScopeCell row={row} />,
      },
      {
        key: 'progress',
        visibilityKey: 'progress',
        label: 'AVG PROGRESS',
        render: (_, row) => <GoalProgressCell row={row} />,
      },
      {
        key: 'keyResults',
        visibilityKey: 'keyResults',
        label: 'KEY RESULTS',
        render: (_, row) => <GoalKeyResultsCountCell row={row} />,
      },
      {
        key: 'status',
        visibilityKey: 'status',
        label: 'STATUS',
        render: (_, row) => <GoalStatusPill row={row} />,
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
              title="View goal"
              onClick={() => openDetail(row)}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="p-2 text-orange-600 hover:bg-orange-50"
              title={isCustomGoal(row) ? 'Edit goal' : 'Sample goal cannot be edited'}
              onClick={() => openEdit(row)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="p-2 text-red-600 hover:bg-red-50"
              title={isCustomGoal(row) ? 'Delete goal' : 'Sample goal cannot be deleted'}
              disabled={!isCustomGoal(row)}
              onClick={() => {
                setActionError('')
                setSelectedGoal(row)
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
    const byKey = Object.fromEntries(goalColumns.map((column) => [column.key, column]))
    const out = []
    if (byKey.objective) out.push(byKey.objective)
    for (const key of columnOrder) {
      const column = byKey[key]
      if (!column?.visibilityKey || !columnVisibility[column.visibilityKey]) continue
      out.push(column)
    }
    if (byKey.actions) out.push(byKey.actions)
    return bindSortableColumns(out, SORTABLE_KEYS)
  }, [goalColumns, columnOrder, columnVisibility, bindSortableColumns])

  const emptyCopy = myGoalsOnly
    ? {
        title: 'No individual goals found',
        description: 'Individual goals assigned to you will appear here.',
      }
    : EMPTY_COPY[activeTab] || EMPTY_COPY.all

  const handleDelete = async () => {
    if (!selectedGoal?.id) return
    try {
      setDeleting(true)
      setActionError('')
      deleteGoal(selectedGoal.id)
      setDeleteOpen(false)
      setSelectedGoal(null)
      setEditingGoal((current) => (current?.id === selectedGoal.id ? null : current))
      loadGoals()
    } catch (error) {
      setActionError(error?.message || 'Failed to delete goal')
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
          searchPlaceholder="Search goals..."
          showAdd
          onAddClick={() => setAddOpen(true)}
          addTitle="Add Goal"
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
          sortTitle="Sort goals (Shift+click headers for multi-sort)"
          showExport
          onExportClick={() => console.log('Export goals')}
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
          description="Objective and actions stay visible. Drag column edges in the table to resize."
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

      <div className="flex flex-wrap gap-2">
        <Button
          variant={myGoalsOnly ? 'primary' : 'secondary'}
          onClick={() => setMyGoalsOnly((current) => !current)}
        >
          My Goals
        </Button>
      </div>

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
            icon={Target}
            title={emptyCopy.title}
            description={emptyCopy.description}
            action={
              <Button variant="primary" onClick={() => setAddOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Goal
              </Button>
            }
          />
        ) : null}
      </HRDataTableCard>

      <AddGoalModal open={addOpen} onClose={() => setAddOpen(false)} onSaved={handleGoalSaved} />

      <GoalDetailModal
        goal={selectedGoal}
        open={Boolean(selectedGoal) && !deleteOpen && !editingGoal}
        onClose={closeDetail}
        onEdit={openEdit}
        onDelete={() => setDeleteOpen(true)}
        deleting={deleting}
      />

      <GoalEditModal
        goal={editingGoal}
        open={Boolean(editingGoal)}
        onClose={closeEdit}
        onSaved={async (updated) => {
          handleGoalSaved(updated)
          await loadGoals()
        }}
      />

      <Modal isOpen={deleteOpen} onClose={() => !deleting && setDeleteOpen(false)} title="Delete goal" size="sm">
        <p className="text-sm text-gray-600">
          Delete <span className="font-semibold text-gray-900">{selectedGoal?.objective}</span>? This cannot be undone.
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
