'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Palmtree, Clock, CheckCircle, XCircle } from 'lucide-react'
import {
  Badge,
  Button,
  DashboardInsightShell,
  Input,
  Table,
  TableEmptyBelow,
  TableResultsCount,
  TabsWithActions,
  UnifiedWorkspaceCalendar,
} from '@webfudge/ui'
import EmployeeGate from '../../../components/shared/EmployeeGate'
import ESSModulePage from '../../../components/layout/ESSModulePage'
import ESSPageHeader from '../../../components/layout/ESSPageHeader'
import ESSModuleTabBar from '../../../components/layout/ESSModuleTabBar'
import ESSDataTableCard from '../../../components/shared/ESSDataTableCard'
import ESSDashboardKpiRow from '../../../components/dashboard/ESSDashboardKpiRow'
import ESSLeaveBalanceCards from '../../../components/leave/ESSLeaveBalanceCards'
import ESSApplyLeaveModal from '../../../components/leave/ESSLeaveModals'
import { useCurrentEmployee } from '../../../hooks/useCurrentEmployee'
import { cancelLeaveRequest, listLeaveRequests } from '../../../lib/leaveSyncService'
import {
  LEAVE_UPDATED_EVENT,
  computeEmployeeLeaveBalanceRows,
  notifyLeaveUpdated,
  formatLeaveStatus,
} from '../../../lib/leaveShared'
import { listCompanyHolidays } from '../../../lib/holidaySyncService'
import { leaveStatusBadgeVariant } from '../../../lib/attendanceStatusMeta'

const TAB_KEYS = {
  OVERVIEW: 'overview',
  REQUESTS: 'requests',
  CALENDAR: 'calendar',
}

const FILTER_TABS = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'cancelled', label: 'Cancelled' },
]

export default function LeavePage() {
  const { employee, membershipId } = useCurrentEmployee()
  const [activeTab, setActiveTab] = useState(TAB_KEYS.OVERVIEW)
  const [filter, setFilter] = useState('all')
  const [requests, setRequests] = useState([])
  const [teamRequests, setTeamRequests] = useState([])
  const [holidays, setHolidays] = useState([])
  const [applyOpen, setApplyOpen] = useState(false)
  const [monthDate, setMonthDate] = useState(() => new Date())
  const [cancellingId, setCancellingId] = useState(null)
  const [loading, setLoading] = useState(true)

  const monthValue = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`

  const loadData = useCallback(async () => {
    if (!membershipId) return
    try {
      setLoading(true)
      const year = monthDate.getFullYear()
      const from = `${year}-01-01`
      const to = `${year}-12-31`
      const [mine, allApproved, holidayRows] = await Promise.all([
        listLeaveRequests({ organizationUser: membershipId, limit: 100 }),
        listLeaveRequests({ status: 'approved', limit: 200 }),
        listCompanyHolidays({ from, to, limit: 50 }),
      ])
      setRequests(mine)
      setTeamRequests(
        allApproved.filter(
          (row) =>
            row.organizationUserId !== membershipId &&
            row.department === employee?.department,
        ),
      )
      setHolidays(holidayRows)
    } finally {
      setLoading(false)
    }
  }, [membershipId, employee?.department, monthDate])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    const refresh = () => loadData()
    window.addEventListener(LEAVE_UPDATED_EVENT, refresh)
    return () => window.removeEventListener(LEAVE_UPDATED_EVENT, refresh)
  }, [loadData])

  const balanceRows = useMemo(
    () => computeEmployeeLeaveBalanceRows(employee, requests),
    [employee, requests],
  )

  const leaveStats = useMemo(() => {
    const year = new Date().getFullYear()
    const yearRequests = requests.filter((row) => {
      const from = row.from ? new Date(row.from).getFullYear() : year
      return from === year
    })
    return {
      totalBalance: balanceRows.reduce((sum, row) => sum + row.balance, 0),
      pending: yearRequests.filter((r) => formatLeaveStatus(r.status) === 'Pending').length,
      approved: yearRequests.filter((r) => formatLeaveStatus(r.status) === 'Approved').length,
      rejected: yearRequests.filter((r) => formatLeaveStatus(r.status) === 'Rejected').length,
    }
  }, [balanceRows, requests])

  const kpiStats = useMemo(
    () => [
      {
        title: 'Leave Balance',
        value: String(leaveStats.totalBalance),
        subtitle: 'days available',
        icon: Palmtree,
        colorScheme: 'orange',
      },
      {
        title: 'Pending',
        value: String(leaveStats.pending),
        subtitle: 'awaiting approval',
        icon: Clock,
        colorScheme: 'orange',
        onClick: () => {
          setActiveTab(TAB_KEYS.REQUESTS)
          setFilter('pending')
        },
      },
      {
        title: 'Approved',
        value: String(leaveStats.approved),
        subtitle: 'this year',
        icon: CheckCircle,
        colorScheme: 'orange',
        onClick: () => {
          setActiveTab(TAB_KEYS.REQUESTS)
          setFilter('approved')
        },
      },
      {
        title: 'Rejected',
        value: String(leaveStats.rejected),
        subtitle: 'this year',
        icon: XCircle,
        colorScheme: 'orange',
        onClick: () => {
          setActiveTab(TAB_KEYS.REQUESTS)
          setFilter('rejected')
        },
      },
    ],
    [leaveStats],
  )

  const filteredRequests = useMemo(() => {
    if (filter === 'all') return requests
    return requests.filter((row) => formatLeaveStatus(row.status).toLowerCase() === filter)
  }, [requests, filter])

  const handleCancel = async (id) => {
    try {
      setCancellingId(id)
      await cancelLeaveRequest(id)
      notifyLeaveUpdated()
    } finally {
      setCancellingId(null)
    }
  }

  const calendarEvents = useMemo(() => {
    const own = requests
      .filter((row) => formatLeaveStatus(row.status) === 'Approved')
      .flatMap((row) => {
        const events = []
        const start = new Date(row.from)
        const end = new Date(row.to || row.from)
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          events.push({
            id: `leave-${row.id}-${d.toISOString().slice(0, 10)}`,
            title: `My leave — ${row.type}`,
            start: d.toISOString().slice(0, 10),
            allDay: true,
            backgroundColor: '#FDBA74',
          })
        }
        return events
      })

    const team = teamRequests.flatMap((row) => {
      const events = []
      const start = new Date(row.from)
      const end = new Date(row.to || row.from)
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        events.push({
          id: `team-${row.id}-${d.toISOString().slice(0, 10)}`,
          title: `${row.employeeName || 'Teammate'} — ${row.type}`,
          start: d.toISOString().slice(0, 10),
          allDay: true,
          backgroundColor: '#FED7AA',
        })
      }
      return events
    })

    const holidayEvents = holidays.map((h) => ({
      id: `holiday-${h.id || h.date}`,
      title: h.name,
      start: h.date,
      allDay: true,
      backgroundColor: '#D1D5DB',
    }))

    return [...own, ...team, ...holidayEvents]
  }, [requests, teamRequests, holidays])

  const requestColumns = [
    { key: 'type', label: 'Leave Type' },
    { key: 'from', label: 'From' },
    { key: 'to', label: 'To' },
    { key: 'days', label: 'Days' },
    { key: 'reason', label: 'Reason' },
    { key: 'appliedOn', label: 'Applied On' },
    { key: 'statusBadge', label: 'Status' },
    { key: 'hrComment', label: 'HR Comment' },
    { key: 'actions', label: 'Actions' },
  ]

  const requestData = filteredRequests.map((row) => ({
    ...row,
    statusBadge: <Badge variant={leaveStatusBadgeVariant(row.status)}>{row.status}</Badge>,
    hrComment: row.rejectionReason || '—',
    actions:
      formatLeaveStatus(row.status) === 'Pending' ? (
        <Button
          variant="secondary"
          size="sm"
          disabled={cancellingId === row.id}
          onClick={() => handleCancel(row.id)}
        >
          Cancel
        </Button>
      ) : (
        '—'
      ),
  }))

  const handleMonthChange = (value) => {
    const [y, m] = String(value).split('-').map(Number)
    if (y && m) setMonthDate(new Date(y, m - 1, 1))
  }

  const tabItems = useMemo(
    () => [
      { key: TAB_KEYS.OVERVIEW, label: 'Overview', badge: balanceRows.length },
      { key: TAB_KEYS.REQUESTS, label: 'My Requests', badge: requests.length },
      { key: TAB_KEYS.CALENDAR, label: 'Calendar', badge: calendarEvents.length },
    ],
    [balanceRows.length, requests.length, calendarEvents.length],
  )

  return (
    <EmployeeGate>
      <ESSModulePage className={`!space-y-6 transition-opacity ${loading ? 'opacity-90' : ''}`}>
        <ESSPageHeader
          title="My Leave"
          subtitle="Apply for leave and track your requests"
          breadcrumb={[
            { label: 'Overview', href: '/overview' },
            { label: 'Leave', href: '/leave' },
          ]}
          actions={
            <Button
              variant="primary"
              className="bg-orange-500 hover:bg-orange-600"
              onClick={() => setApplyOpen(true)}
            >
              Apply Leave
            </Button>
          }
        />

        <ESSDashboardKpiRow stats={kpiStats} />

        <ESSModuleTabBar
          tabs={tabItems}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          showAdd={activeTab === TAB_KEYS.REQUESTS}
          onAddClick={() => setApplyOpen(true)}
          addTitle="Apply leave"
        />

        {activeTab === TAB_KEYS.OVERVIEW ? (
          <ESSLeaveBalanceCards rows={balanceRows} />
        ) : null}

        {activeTab === TAB_KEYS.REQUESTS ? (
          <div className="space-y-4">
            <TabsWithActions
              tabs={FILTER_TABS}
              activeTab={filter}
              onTabChange={setFilter}
              variant="pill"
              pillTrack="hug"
            />
            <TableResultsCount count={requestData.length} />
            <ESSDataTableCard>
              {requestData.length ? (
                <Table variant="modernEmbedded" columns={requestColumns} data={requestData} keyField="id" />
              ) : (
                <TableEmptyBelow
                  title="No leave requests"
                  description="Apply for leave to see your request history here."
                  action={
                    <Button
                      className="bg-orange-500 hover:bg-orange-600"
                      onClick={() => setApplyOpen(true)}
                    >
                      Apply leave
                    </Button>
                  }
                />
              )}
            </ESSDataTableCard>
          </div>
        ) : null}

        {activeTab === TAB_KEYS.CALENDAR ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
              <div>
                <p className="text-sm font-semibold text-gray-900">Team leave calendar</p>
                <p className="text-xs text-gray-500">Your approved leave, teammates, and holidays</p>
              </div>
              <Input
                type="month"
                value={monthValue}
                onChange={(e) => handleMonthChange(e.target.value)}
                className="max-w-[180px]"
                aria-label="Select month"
              />
            </div>
            <DashboardInsightShell title="Leave calendar" panelClassName="p-3">
              <UnifiedWorkspaceCalendar
                events={calendarEvents}
                initialDate={`${monthValue}-01`}
                height="auto"
              />
            </DashboardInsightShell>
            <div className="flex flex-wrap gap-4 text-xs text-gray-600">
              <span className="inline-flex items-center gap-2">
                <span className="h-3 w-3 rounded bg-orange-300" /> My approved leave
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-3 w-3 rounded bg-orange-200" /> Team leave
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-3 w-3 rounded bg-gray-300" /> Holiday
              </span>
            </div>
          </div>
        ) : null}

        <ESSApplyLeaveModal
          open={applyOpen}
          onClose={() => setApplyOpen(false)}
          membershipId={membershipId}
          onSuccess={loadData}
        />
      </ESSModulePage>
    </EmployeeGate>
  )
}
