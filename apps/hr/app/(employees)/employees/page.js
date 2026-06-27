'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Users, UserCheck, UserMinus, AlertCircle, Eye, Mail, Trash2 } from 'lucide-react'
import {
  Button,
  Table,
  KPICard,
  LoadingSpinner,
  TabsWithActions,
  Select,
  TableCellCreated,
  TableEmptyBelow,
  TableColumnPicker,
  TableSortDropdown,
  useTableColumnPreferences,
  useTableSort,
  Modal,
  TableResultsCount,
} from '@webfudge/ui'
import HRPageHeader from '../../../components/layout/HRPageHeader'
import HRModulePage from '../../../components/layout/HRModulePage'
import HRKpiRow from '../../../components/layout/HRKpiRow'
import HRDataTableCard from '../../../components/shared/HRDataTableCard'
import {
  EmployeeNameCell,
  EmployeeDepartmentCell,
  EmployeeTextCell,
  EmployeeManagerCell,
  EmployeeStatusPill,
} from '../../../components/employees/EmployeeTableCells'
import { computeEmployeeStats, filterEmployeesWithList, getEmployeeTabItems } from '../../../lib/employeeStats'
import { HR_ROOT_BREADCRUMB } from '../../../lib/pageHeader'
import { listSyncedEmployees, softDeleteEmployee } from '../../../lib/employeeSyncService'

const TABLE_SORT_STORAGE_KEY = 'hr.employees.tableSort'
const COLUMN_VISIBILITY_STORAGE_KEY = 'hr.employees.tableColumnVisibility'
const COLUMN_ORDER_STORAGE_KEY = 'hr.employees.tableColumnOrder'
const COLUMN_WIDTHS_STORAGE_KEY = 'hr.employees.tableColumnWidths'

const DEFAULT_COLUMN_WIDTHS = {
  employee: 260,
  department: 160,
  designation: 180,
  manager: 160,
  employmentType: 120,
  status: 130,
  joinDate: 130,
  actions: 160,
}

const MIN_COLUMN_WIDTHS = {
  actions: 140,
}

const TOGGLEABLE_COLUMNS = [
  { key: 'department', label: 'Department' },
  { key: 'designation', label: 'Designation' },
  { key: 'manager', label: 'Manager' },
  { key: 'employmentType', label: 'Employment type' },
  { key: 'status', label: 'Status' },
  { key: 'joinDate', label: 'Join date' },
]

const DEFAULT_ON_COLUMN_KEYS = new Set(['department', 'designation', 'status', 'joinDate'])
const REORDERABLE_COLUMN_KEYS = TOGGLEABLE_COLUMNS.map((c) => c.key)
const DEFAULT_COLUMN_VISIBILITY = TOGGLEABLE_COLUMNS.reduce((acc, { key }) => {
  acc[key] = DEFAULT_ON_COLUMN_KEYS.has(key)
  return acc
}, {})

const SORT_COLUMN_OPTIONS = [
  { key: 'employee', label: 'Employee' },
  ...TOGGLEABLE_COLUMNS,
]

const SORTABLE_KEYS = SORT_COLUMN_OPTIONS.map((c) => c.key)

function getEmployeeSortValue(row, key) {
  switch (key) {
    case 'employee':
      return row.name || ''
    case 'department':
      return row.department || ''
    case 'designation':
      return row.designation || ''
    case 'manager':
      return row.manager || ''
    case 'employmentType':
      return row.employmentType || ''
    case 'status':
      return row.status || ''
    case 'joinDate':
      return row.joinDate || ''
    default:
      return row[key]
  }
}

export default function EmployeesPage() {
  const router = useRouter()
  const [employees, setEmployees] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [department, setDepartment] = useState('')
  const [sortPickerOpen, setSortPickerOpen] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)

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
    reorderableKeys: REORDERABLE_COLUMN_KEYS,
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

  const stats = useMemo(() => computeEmployeeStats(employees), [employees])
  const tabItems = useMemo(() => getEmployeeTabItems(stats.tabCounts), [stats.tabCounts])

  const loadDirectory = async () => {
    try {
      setLoading(true)
      setLoadError('')
      const { employees: rows, departments: departmentCatalog } = await listSyncedEmployees()
      setEmployees(rows)
      setDepartments(departmentCatalog.map((d) => d.name))
    } catch (error) {
      setEmployees([])
      setDepartments([])
      setLoadError(error?.message || 'Failed to load employee directory')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDirectory()
  }, [])

  useEffect(() => {
    const onFocus = () => {
      loadDirectory()
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [])

  const filteredRows = useMemo(() => {
    return filterEmployeesWithList(employees, {
      tab: activeTab,
      search: searchQuery,
      department,
    })
  }, [employees, activeTab, searchQuery, department])

  const sortedRows = useMemo(
    () => sortData(filteredRows, (row, key) => getEmployeeSortValue(row, key)),
    [filteredRows, sortData, sortRules]
  )

  useEffect(() => {
    if (!columnPickerOpen && !sortPickerOpen) return
    const onDocMouseDown = (event) => {
      if (toolbarRef.current && !toolbarRef.current.contains(event.target)) {
        setColumnPickerOpen(false)
        setSortPickerOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [columnPickerOpen, sortPickerOpen, setColumnPickerOpen])

  const employeeTableDataColumns = useMemo(
    () => [
      {
        key: 'employee',
        label: 'EMPLOYEE',
        fixed: true,
        render: (_, row) => <EmployeeNameCell row={row} />,
      },
      {
        key: 'department',
        visibilityKey: 'department',
        label: 'DEPARTMENT',
        render: (_, row) => <EmployeeDepartmentCell department={row.department} />,
      },
      {
        key: 'designation',
        visibilityKey: 'designation',
        label: 'DESIGNATION',
        render: (_, row) => <EmployeeTextCell value={row.designation} />,
      },
      {
        key: 'manager',
        visibilityKey: 'manager',
        label: 'MANAGER',
        render: (_, row) => <EmployeeManagerCell manager={row.manager} />,
      },
      {
        key: 'employmentType',
        visibilityKey: 'employmentType',
        label: 'TYPE',
        render: (_, row) => <EmployeeTextCell value={row.employmentType} capitalize />,
      },
      {
        key: 'status',
        visibilityKey: 'status',
        label: 'STATUS',
        render: (_, row) => <EmployeeStatusPill status={row.status} />,
      },
      {
        key: 'joinDate',
        visibilityKey: 'joinDate',
        label: 'JOIN DATE',
        render: (_, row) => <TableCellCreated dateString={row.joinDate} dateMode="calendar" />,
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
              title="View employee"
              onClick={(event) => {
                event.stopPropagation()
                router.push(`/employees/${row.id}`)
              }}
            >
              <Eye className="h-4 w-4" />
            </Button>
            {row.email ? (
              <Button
                variant="ghost"
                size="sm"
                className="p-2 text-orange-600 hover:bg-orange-50"
                title="Send email"
                onClick={(event) => {
                  event.stopPropagation()
                  window.location.href = `mailto:${row.email}`
                }}
              >
                <Mail className="h-4 w-4" />
              </Button>
            ) : null}
            <Button
              variant="ghost"
              size="sm"
              className="p-2 text-red-600 hover:bg-red-50"
              title="Delete employee"
              onClick={async (event) => {
                event.stopPropagation()
                try {
                  await softDeleteEmployee(row)
                  await loadDirectory()
                } catch (error) {
                  console.error('Failed to remove employee:', error)
                }
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    [router]
  )

  const visibleTableColumns = useMemo(() => {
    const byKey = Object.fromEntries(employeeTableDataColumns.map((c) => [c.key, c]))
    const out = []
    if (byKey.employee) out.push(byKey.employee)
    for (const key of columnOrder) {
      const col = byKey[key]
      if (!col?.visibilityKey) continue
      if (!columnVisibility[col.visibilityKey]) continue
      out.push(col)
    }
    if (byKey.actions) out.push(byKey.actions)
    return bindSortableColumns(out, SORTABLE_KEYS)
  }, [columnOrder, columnVisibility, employeeTableDataColumns, bindSortableColumns])

  const emptyState = {
    icon: Users,
    title: 'No employees found',
    description:
      searchQuery || activeTab !== 'all' || department
        ? 'Try adjusting your filters'
        : 'Add your first employee to get started',
    action:
      !searchQuery && activeTab === 'all' && !department ? (
        <Button variant="primary" onClick={() => router.push('/employees/new')}>
          <Plus className="mr-2 h-4 w-4" />
          Add Employee
        </Button>
      ) : null,
  }

  return (
    <HRModulePage className="!space-y-6">
      <HRPageHeader
        title="Employees"
        subtitle="Manage employee records, departments, and roster status across your organization"
        breadcrumb={[HR_ROOT_BREADCRUMB, { label: 'Employees', href: '/employees' }]}
        showProfile
        showActions
        onImportClick={() => console.log('Import employees')}
        onExportClick={() => console.log('Export employees')}
      />

      <HRKpiRow>
        <KPICard
          title="Active"
          value={stats.active}
          subtitle={
            stats.active === 0
              ? 'No employees'
              : stats.active === 1
                ? '1 employee'
                : `${stats.active} employees`
          }
          icon={UserCheck}
          colorScheme="orange"
        />
        <KPICard
          title="Probation"
          value={stats.probation}
          subtitle={
            stats.probation === 0
              ? 'No employees'
              : stats.probation === 1
                ? '1 on probation'
                : `${stats.probation} on probation`
          }
          icon={Users}
          colorScheme="orange"
        />
        <KPICard
          title="On Notice"
          value={stats.notice}
          subtitle={
            stats.notice === 0
              ? 'No employees'
              : stats.notice === 1
                ? '1 on notice'
                : `${stats.notice} on notice`
          }
          icon={AlertCircle}
          colorScheme="orange"
        />
        <KPICard
          title="Exited"
          value={stats.exited}
          subtitle={
            stats.exited === 0
              ? 'No exits'
              : stats.exited === 1
                ? '1 exit'
                : `${stats.exited} exits`
          }
          icon={UserMinus}
          colorScheme="orange"
        />
      </HRKpiRow>

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
          searchPlaceholder="Search employees..."
          showAdd
          onAddClick={() => router.push('/employees/new')}
          addTitle="Add Employee"
          showFilter
          onFilterClick={() => setFilterOpen(true)}
          hasActiveFilters={Boolean(department)}
          filterTitle={department ? 'Department filter active' : 'Filter employees'}
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
          sortTitle="Sort employees (Shift+click headers for multi-sort)"
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
        {loading ? (
          <div className="py-12">
            <LoadingSpinner size="lg" message="Loading employees..." />
          </div>
        ) : (
          <Table
            columns={visibleTableColumns}
            data={sortedRows}
            keyField="id"
            variant="modernEmbedded"
            {...tableResizeProps}
            onRowClick={(row) => router.push(`/employees/${row.id}`)}
          />
        )}
        {!loading && !loadError && filteredRows.length === 0 ? (
          <TableEmptyBelow
            icon={emptyState.icon}
            title={emptyState.title}
            description={emptyState.description}
            action={emptyState.action}
          />
        ) : null}
        {!loading && loadError ? (
          <TableEmptyBelow icon={AlertCircle} title="Unable to load employees" description={loadError} />
        ) : null}
      </HRDataTableCard>

      <Modal isOpen={filterOpen} onClose={() => setFilterOpen(false)} title="Filter Employees" size="md">
        <div className="space-y-5">
          <Select
            label="Department"
            value={department}
            onChange={setDepartment}
            options={[
              { value: '', label: 'All departments' },
              ...departments.map((d) => ({ value: d, label: d })),
            ]}
            placeholder="All departments"
          />
          <div className="flex justify-end gap-3 border-t border-gray-200 pt-5">
            <Button variant="outline" onClick={() => setDepartment('')}>
              Clear
            </Button>
            <Button onClick={() => setFilterOpen(false)}>Apply Filters</Button>
          </div>
        </div>
      </Modal>
    </HRModulePage>
  )
}
