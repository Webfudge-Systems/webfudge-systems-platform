'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Activity, CalendarOff, CalendarCheck, Wallet } from 'lucide-react'
import {
  ActivitiesTimeline,
  DashboardInsightShell,
  EmptyState,
  Input,
  LoadingSpinner,
} from '@webfudge/ui'
import EmployeeGate from '../../../components/shared/EmployeeGate'
import ESSModulePage from '../../../components/layout/ESSModulePage'
import ESSPageHeader from '../../../components/layout/ESSPageHeader'
import ESSDashboardKpiRow from '../../../components/dashboard/ESSDashboardKpiRow'
import { useCurrentEmployee } from '../../../hooks/useCurrentEmployee'
import { fetchEmployeeActivityTimeline } from '../../../lib/api/employeeActivityService'
import { Select } from '../../../components/shared/ESSSelect'

const EVENT_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'leave', label: 'Leave' },
  { value: 'attendance', label: 'Attendance' },
  { value: 'payroll', label: 'Payroll' },
  { value: 'profile', label: 'Profile Update' },
]

function matchesEventFilter(item, filter) {
  if (filter === 'all') return true
  const text = `${item?.action || ''} ${item?.description || ''} ${item?.subjectType || ''}`.toLowerCase()
  if (filter === 'leave') return text.includes('leave')
  if (filter === 'attendance') return text.includes('attendance')
  if (filter === 'payroll') return text.includes('payroll') || text.includes('payslip')
  if (filter === 'profile') return text.includes('profile') || text.includes('organization_user')
  return true
}

export default function ActivityPage() {
  const { membershipId } = useCurrentEmployee()
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [eventFilter, setEventFilter] = useState('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const loadData = useCallback(async () => {
    if (!membershipId) {
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      const res = await fetchEmployeeActivityTimeline({ organizationUserId: membershipId, limit: 80 })
      setActivities(res.data || [])
    } finally {
      setLoading(false)
    }
  }, [membershipId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const filtered = useMemo(() => {
    return activities.filter((item) => {
      if (!matchesEventFilter(item, eventFilter)) return false
      const created = item.createdAt ? item.createdAt.slice(0, 10) : ''
      if (fromDate && created < fromDate) return false
      if (toDate && created > toDate) return false
      return true
    })
  }, [activities, eventFilter, fromDate, toDate])

  const kpiStats = useMemo(() => {
    const countFor = (filter) => activities.filter((item) => matchesEventFilter(item, filter)).length
    return [
      {
        title: 'All Events',
        value: String(activities.length),
        subtitle: 'total logged',
        icon: Activity,
        colorScheme: 'orange',
      },
      {
        title: 'Leave',
        value: String(countFor('leave')),
        subtitle: 'leave events',
        icon: CalendarOff,
        colorScheme: 'orange',
        onClick: () => setEventFilter('leave'),
      },
      {
        title: 'Attendance',
        value: String(countFor('attendance')),
        subtitle: 'attendance events',
        icon: CalendarCheck,
        colorScheme: 'orange',
        onClick: () => setEventFilter('attendance'),
      },
      {
        title: 'Payroll',
        value: String(countFor('payroll')),
        subtitle: 'payroll events',
        icon: Wallet,
        colorScheme: 'orange',
        onClick: () => setEventFilter('payroll'),
      },
    ]
  }, [activities])

  return (
    <EmployeeGate>
      <ESSModulePage className={`!space-y-6 transition-opacity ${loading ? 'opacity-90' : ''}`}>
        <ESSPageHeader
          title="My Activity"
          subtitle="Audit trail of actions on your profile"
          breadcrumb={[
            { label: 'Overview', href: '/overview' },
            { label: 'Activity', href: '/activity' },
          ]}
          showBack={false}
        />

        <ESSDashboardKpiRow stats={kpiStats} />

        <DashboardInsightShell
          title="Filters"
          subtitle="Narrow your activity timeline"
          panelClassName="p-4"
        >
          <div className="flex flex-wrap items-end gap-4">
            <div className="min-w-[10rem]">
              <Select
                label="Event type"
                value={eventFilter}
                onChange={setEventFilter}
                options={EVENT_FILTERS}
                allowEmpty={false}
              />
            </div>
            <Input label="From" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            <Input label="To" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
        </DashboardInsightShell>

        <DashboardInsightShell
          title="Activity timeline"
          subtitle={`${filtered.length} event${filtered.length === 1 ? '' : 's'}`}
          panelClassName="p-4"
        >
          {loading ? (
            <div className="flex justify-center py-10">
              <LoadingSpinner message="Loading activity…" />
            </div>
          ) : filtered.length ? (
            <ActivitiesTimeline items={filtered} />
          ) : (
            <EmptyState
              icon={Activity}
              title="No activity found"
              description="Activity related to your profile will appear here."
              className="py-8"
            />
          )}
        </DashboardInsightShell>
      </ESSModulePage>
    </EmployeeGate>
  )
}
