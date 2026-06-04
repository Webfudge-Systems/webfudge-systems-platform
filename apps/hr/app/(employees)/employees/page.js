'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus,
  Users,
  UserCheck,
  UserMinus,
  AlertCircle,
  Pencil,
  Mail,
} from 'lucide-react'
import {
  Button,
  Table,
  KPICard,
  TabsWithActions,
  Avatar,
  TableCellText,
  TableCellDateOnly,
  TableCellOrangePill,
} from '@webfudge/ui'
import HRPageHeader from '../../../components/layout/HRPageHeader'
import HRStatusBadge from '../../../components/shared/HRStatusBadge'
import { EMPLOYEES, DEPARTMENTS } from '../../../lib/mock-data/employees'
import { computeEmployeeStats, filterEmployeesWithList, getEmployeeTabItems } from '../../../lib/employeeStats'
import { useHRQuickActions } from '../../../components/quick-actions/HRQuickActionsContext'
import { HR_QUICK_ACTION_IDS } from '../../../lib/quickActions'

export default function EmployeesPage() {
  const router = useRouter()
  const { openQuickAction } = useHRQuickActions()
  const [activeTab, setActiveTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [department, setDepartment] = useState('')
  const [activeView, setActiveView] = useState('list')

  const stats = useMemo(() => computeEmployeeStats(EMPLOYEES), [])
  const tabItems = useMemo(() => getEmployeeTabItems(stats.tabCounts), [stats.tabCounts])

  const filteredRows = useMemo(
    () =>
      filterEmployeesWithList(EMPLOYEES, {
        tab: activeTab,
        search: searchQuery,
        department,
      }),
    [activeTab, searchQuery, department]
  )

  const activeCount = stats.active

  const columns = useMemo(
    () => [
      {
        key: 'employee',
        label: 'EMPLOYEE',
        fixed: true,
        render: (_, row) => (
          <div className="flex min-w-[200px] items-center gap-3">
            <Avatar alt={row.name} fallback={row.name?.charAt(0) || '?'} size="sm" className="flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium text-gray-900">{row.name}</div>
              <div className="truncate text-sm text-gray-500">{row.employeeId}</div>
            </div>
          </div>
        ),
      },
      {
        key: 'department',
        label: 'DEPARTMENT',
        render: (_, row) => <TableCellOrangePill value={row.department} />,
      },
      {
        key: 'designation',
        label: 'DESIGNATION',
        render: (_, row) => <TableCellText value={row.designation} />,
      },
      {
        key: 'manager',
        label: 'MANAGER',
        render: (_, row) => <TableCellText value={row.manager} />,
      },
      {
        key: 'employmentType',
        label: 'TYPE',
        render: (_, row) => <TableCellText value={row.employmentType} capitalize />,
      },
      {
        key: 'status',
        label: 'STATUS',
        render: (_, row) => <HRStatusBadge status={row.status} />,
      },
      {
        key: 'joinDate',
        label: 'JOIN DATE',
        render: (_, row) => <TableCellDateOnly dateString={row.joinDate} />,
      },
      {
        key: 'actions',
        label: 'ACTIONS',
        fixed: true,
        render: (_, row) => (
          <div className="flex min-w-[100px] items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="sm"
              className="p-2 text-emerald-600 hover:bg-emerald-50"
              title="View profile"
              onClick={() => router.push(`/employees/${row.id}`)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            {row.email ? (
              <Button
                variant="ghost"
                size="sm"
                className="p-2 text-orange-600 hover:bg-orange-50"
                title="Send email"
                onClick={() => {
                  window.location.href = `mailto:${row.email}`
                }}
              >
                <Mail className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [router]
  )

  return (
    <div className="min-h-full space-y-6 p-4 md:p-6">
      <HRPageHeader
        title="Employees"
        subtitle={`${activeCount} active employees on roster`}
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Employees', href: '/employees' },
        ]}
        showActions
        onImportClick={() => console.log('Import employees')}
        onExportClick={() => console.log('Export employees')}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Active"
          value={stats.active}
          subtitle={stats.active === 1 ? '1 employee' : `${stats.active} employees`}
          icon={UserCheck}
          colorScheme="orange"
        />
        <KPICard
          title="Probation"
          value={stats.probation}
          subtitle={stats.probation === 0 ? 'None on probation' : `${stats.probation} on probation`}
          icon={Users}
          colorScheme="orange"
        />
        <KPICard
          title="On Notice"
          value={stats.notice}
          subtitle={stats.notice === 0 ? 'None on notice' : `${stats.notice} on notice`}
          icon={AlertCircle}
          colorScheme="orange"
        />
        <KPICard
          title="Exited"
          value={stats.exited}
          subtitle={stats.exited === 0 ? 'No exits' : `${stats.exited} exited`}
          icon={UserMinus}
          colorScheme="orange"
        />
      </div>

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
        searchPlaceholder="Search..."
        showAdd
        onAddClick={() => openQuickAction(HR_QUICK_ACTION_IDS.ADD_EMPLOYEE)}
        addTitle="Add Employee"
        addTitle="Add Employee"
        showFilter
        onFilterClick={() => console.log('Filter employees')}
        showViewToggle
        activeView={activeView}
        onViewChange={setActiveView}
        viewOptions={['list', 'board']}
        listViewTitle="Table view"
        boardViewTitle="Grid view"
        afterTabs={
          <div className="hidden items-center gap-2 sm:flex">
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              aria-label="Filter by department"
            >
              <option value="">All departments</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        }
      />

      <div className="text-sm text-gray-600">
        Showing <span className="font-semibold text-gray-900">{filteredRows.length}</span> result
        {filteredRows.length !== 1 ? 's' : ''}
      </div>

      {activeView === 'list' ? (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <Table
            columns={columns}
            data={filteredRows}
            keyField="id"
            variant="modern"
            onRowClick={(row) => router.push(`/employees/${row.id}`)}
          />
          {filteredRows.length === 0 && (
            <div className="border-t border-gray-200 p-12 text-center">
              <Users className="mx-auto mb-3 h-12 w-12 text-gray-300" />
              <h3 className="mb-2 text-lg font-semibold text-gray-700">No employees found</h3>
              <p className="mb-4 text-sm text-gray-500">
                {searchQuery || activeTab !== 'all' || department
                  ? 'Try adjusting your filters'
                  : 'Add your first employee to get started'}
              </p>
              {!searchQuery && activeTab === 'all' && !department && (
                <Button variant="primary" onClick={() => openQuickAction(HR_QUICK_ACTION_IDS.ADD_EMPLOYEE)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Employee
                </Button>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredRows.length === 0 ? (
            <div className="col-span-full rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
              <Users className="mx-auto mb-3 h-12 w-12 text-gray-300" />
              <h3 className="mb-2 text-lg font-semibold text-gray-700">No employees found</h3>
              <p className="text-sm text-gray-500">Try adjusting your filters or add a new employee.</p>
            </div>
          ) : (
            filteredRows.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => router.push(`/employees/${e.id}`)}
                className="rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="mb-3 flex items-center gap-3">
                  <Avatar alt={e.name} fallback={e.name?.charAt(0)} />
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-gray-900">{e.name}</p>
                    <p className="truncate text-xs text-gray-500">{e.employeeId}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600">{e.designation}</p>
                <p className="mt-1 text-xs text-gray-500">{e.department}</p>
                <div className="mt-3">
                  <HRStatusBadge status={e.status} />
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
