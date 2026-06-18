'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Edit, Mail, Trash2, Briefcase, MapPin, Calendar } from 'lucide-react'
import { Button, Modal, TabsWithActions } from '@webfudge/ui'
import HRPageHeader from '../../../../components/layout/HRPageHeader'
import HRModulePage from '../../../../components/layout/HRModulePage'
import HRDashboardKpiRow from '../../../../components/dashboard/HRDashboardKpiRow'
import EmployeeDetailMetaBar from '../../../../components/employees/EmployeeDetailMetaBar'
import {
  EmployeeOverviewPanel,
  EmployeeDocumentsPanel,
  EmployeeAttendancePanel,
  EmployeeLeavePanel,
  EmployeePayrollPanel,
  EmployeePerformancePanel,
  EmployeeActivityPanel,
} from '../../../../components/employees/EmployeeDetailTabPanels'
import { EMPLOYEE_DOCUMENTS, EMPLOYEE_OKRS } from '../../../../lib/mock-data/employees'
import { EMPLOYEE_ACTIVITIES } from '../../../../lib/mock-data/activities'
import { LEAVE_REQUESTS } from '../../../../lib/mock-data/leave'
import { getSyncedEmployeeById, softDeleteEmployee } from '../../../../lib/employeeSyncService'

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'documents', label: 'Documents' },
  { id: 'attendance', label: 'Attendance' },
  { id: 'leave', label: 'Leave' },
  { id: 'payroll', label: 'Payroll' },
  { id: 'performance', label: 'Performance' },
  { id: 'activity', label: 'Activity' },
]

const PAYSLIPS = [
  { month: 'June 2026', gross: 95000, deductions: 20513, net: 74487, status: 'Draft' },
  { month: 'May 2026', gross: 95000, deductions: 20100, net: 74900, status: 'Paid' },
  { month: 'April 2026', gross: 95000, deductions: 19800, net: 75200, status: 'Paid' },
]

export default function EmployeeProfilePage() {
  const params = useParams()
  const router = useRouter()
  const [tab, setTab] = useState('overview')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [employee, setEmployee] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        const { employee: row } = await getSyncedEmployeeById(params.id)
        if (!cancelled) setEmployee(row)
      } catch {
        if (!cancelled) setEmployee(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [params.id])

  if (loading) {
    return (
      <HRModulePage>
        <p className="text-gray-600">Loading employee...</p>
      </HRModulePage>
    )
  }

  if (!employee) {
    return (
      <HRModulePage>
        <p className="text-gray-600">Employee not found.</p>
        <Link href="/employees" className="mt-2 inline-block text-sm text-orange-600 hover:underline">
          Back to directory
        </Link>
      </HRModulePage>
    )
  }

  const docs = EMPLOYEE_DOCUMENTS[employee.id] || EMPLOYEE_DOCUMENTS['emp-001']
  const okrs = EMPLOYEE_OKRS[employee.id] || EMPLOYEE_OKRS['emp-001'] || []
  const activities = (EMPLOYEE_ACTIVITIES[employee.id] || []).map((a, i) => ({
    id: i,
    action: a.action,
    summary: `${a.title} — ${a.detail}`,
    createdAt: new Date().toISOString(),
    actor: { username: 'System' },
  }))
  const leaveRequests = LEAVE_REQUESTS.filter((r) => r.employeeId === employee.id)

  const location = employee.workLocation || employee.location || '—'

  const kpiStats = [
    {
      title: 'Department',
      value: employee.department,
      subtitle: employee.employmentType || 'Full-time',
      icon: Briefcase,
      colorScheme: 'orange',
    },
    {
      title: 'Location',
      value: location,
      subtitle: employee.shift || 'On-site',
      icon: MapPin,
      colorScheme: 'orange',
    },
    {
      title: 'Joined',
      value: employee.joinDate,
      subtitle: `ID ${employee.employeeId}`,
      icon: Calendar,
      colorScheme: 'orange',
    },
  ]

  const handleDelete = async () => {
    try {
      await softDeleteEmployee(employee)
      setDeleteOpen(false)
      router.push('/employees')
    } catch (error) {
      console.error('Failed to delete employee:', error)
      setDeleteOpen(false)
    }
  }

  return (
    <HRModulePage>
      <div className="space-y-4">
        <HRPageHeader
          title={employee.name}
          subtitle={employee.designation}
          breadcrumb={[
            { label: 'Employees', href: '/employees' },
            { label: employee.name, href: `/employees/${employee.id}` },
          ]}
          showSearch
          actions={
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => router.push(`/employees/${employee.id}/edit`)}
              >
                <Edit className="mr-1 h-4 w-4" />
                Edit
              </Button>
              {employee.email ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    window.location.href = `mailto:${employee.email}`
                  }}
                >
                  <Mail className="mr-1 h-4 w-4" />
                  Message
                </Button>
              ) : null}
              <Button
                variant="secondary"
                size="sm"
                className="!text-red-600 hover:!bg-red-50"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="mr-1 h-4 w-4" />
                Delete
              </Button>
            </div>
          }
        />

        <EmployeeDetailMetaBar employee={employee} />

        <HRDashboardKpiRow stats={kpiStats} columns="sm:grid-cols-2 lg:grid-cols-3" />

        <TabsWithActions tabs={TABS} activeTab={tab} onTabChange={setTab} variant="pill" />

        {tab === 'overview' && <EmployeeOverviewPanel employee={employee} />}
        {tab === 'documents' && <EmployeeDocumentsPanel documents={docs} />}
        {tab === 'attendance' && <EmployeeAttendancePanel />}
        {tab === 'leave' && <EmployeeLeavePanel leaveRequests={leaveRequests} />}
        {tab === 'payroll' && <EmployeePayrollPanel payslips={PAYSLIPS} />}
        {tab === 'performance' && <EmployeePerformancePanel okrs={okrs} />}
        {tab === 'activity' && <EmployeeActivityPanel activities={activities} />}
      </div>

      <Modal isOpen={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete employee" size="sm">
        <p className="text-sm text-gray-600">
          Are you sure you want to delete{' '}
          <span className="font-semibold text-gray-900">{employee.name}</span>? This action cannot be undone.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={() => setDeleteOpen(false)}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" className="!bg-red-600 hover:!bg-red-700" onClick={handleDelete}>
            Delete
          </Button>
        </div>
      </Modal>
    </HRModulePage>
  )
}
