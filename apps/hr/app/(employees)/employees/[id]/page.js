'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Edit, Mail, Trash2 } from 'lucide-react'
import { Button, Card, EmptyState, LoadingSpinner, Modal, TabsWithActions } from '@webfudge/ui'
import HRPageHeader from '../../../../components/layout/HRPageHeader'
import EmployeeDetailMetaBar from '../../../../components/employees/EmployeeDetailMetaBar'
import { employeeToForm } from '../../../../components/employees/EmployeeForm'
import HRDetailHeaderActions from '../../../../components/shared/HRDetailHeaderActions'
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
import { getSyncedEmployeeById, softDeleteEmployee, updateEmployeeFromForm } from '../../../../lib/employeeSyncService'
import { listSalaryStructures, upsertEmployeeProfileByMembership } from '../../../../lib/payrollSyncService'
import { entityFilesPanelProps } from '../../../../lib/entityMedia'

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'documents', label: 'Documents' },
  { id: 'attendance', label: 'Attendance' },
  { id: 'leave', label: 'Leave' },
  { id: 'payroll', label: 'Payroll' },
  { id: 'performance', label: 'Performance' },
  { id: 'activity', label: 'Activity' },
]

export default function EmployeeProfilePage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialTab = TABS.some((item) => item.id === searchParams.get('tab')) ? searchParams.get('tab') : 'overview'
  const [tab, setTab] = useState(initialTab)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [employee, setEmployee] = useState(null)
  const [departmentCatalog, setDepartmentCatalog] = useState([])
  const [managerRoleOptions, setManagerRoleOptions] = useState([
    { value: 'admin', label: 'Admin' },
    { value: 'manager', label: 'Manager' },
  ])
  const [salaryStructureOptions, setSalaryStructureOptions] = useState([{ value: '', label: 'Unassigned' }])
  const [editingEmployeeInfo, setEditingEmployeeInfo] = useState(false)
  const [employeeInfoDraft, setEmployeeInfoDraft] = useState(null)
  const [savingEmployeeInfo, setSavingEmployeeInfo] = useState(false)
  const [employeeInfoSaveError, setEmployeeInfoSaveError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const requestedTab = searchParams.get('tab')
    if (requestedTab && TABS.some((item) => item.id === requestedTab)) {
      setTab(requestedTab)
    }
  }, [searchParams])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        const [{ employee: row, departments, roles }, structureRows] = await Promise.all([
          getSyncedEmployeeById(params.id),
          listSalaryStructures(),
        ])
        if (cancelled) return
        const managerRoles = roles
          .map((r) => ({
            value: String(r.code || r.name || '').toLowerCase(),
            label: r.name || r.code,
          }))
          .filter((r) => r.value === 'admin' || r.value === 'manager')
        setEmployee(row)
        setDepartmentCatalog(departments)
        if (managerRoles.length) setManagerRoleOptions(managerRoles)
        setSalaryStructureOptions([
          { value: '', label: 'Unassigned' },
          ...structureRows.map((s) => ({ value: String(s.id), label: s.name })),
        ])
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
      <div className="space-y-6 p-4 md:p-6">
        <HRPageHeader
          title="Loading..."
          breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Employees', href: '/employees' }]}
          showProfile
        />
        <Card variant="elevated" className="flex justify-center rounded-xl p-12">
          <LoadingSpinner message="Loading employee..." />
        </Card>
      </div>
    )
  }

  if (!employee) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <HRPageHeader
          title="Employee Not Found"
          breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Employees', href: '/employees' }]}
          showProfile
        />
        <Card variant="elevated" className="rounded-xl p-12">
          <EmptyState
            title="Employee not found"
            description="The employee may have been removed or the link is incorrect."
            action={<Link href="/employees" className="text-sm font-medium text-orange-600 hover:underline">Back to directory</Link>}
          />
        </Card>
      </div>
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
  const leaveRequests = []

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

  const openEmployeeInfoEdit = () => {
    if (!employee) return
    setEmployeeInfoDraft(employeeToForm(employee))
    setEmployeeInfoSaveError('')
    setEditingEmployeeInfo(true)
  }

  const cancelEmployeeInfoEdit = () => {
    setEditingEmployeeInfo(false)
    setEmployeeInfoDraft(null)
    setEmployeeInfoSaveError('')
  }

  const setEmployeeInfoField = (field, value) => {
    setEmployeeInfoDraft((prev) => (prev ? { ...prev, [field]: value } : prev))
  }

  const saveEmployeeInfo = async () => {
    if (!employee || !employeeInfoDraft) return
    if (!employeeInfoDraft.fullName?.trim()) {
      setEmployeeInfoSaveError('Full name is required')
      return
    }
    if (!employeeInfoDraft.email?.trim()) {
      setEmployeeInfoSaveError('Work email is required')
      return
    }

    try {
      setSavingEmployeeInfo(true)
      setEmployeeInfoSaveError('')
      await updateEmployeeFromForm(employee, employeeInfoDraft, departmentCatalog)
      if (employee.membershipId) {
        await upsertEmployeeProfileByMembership(employee.membershipId, {
          employeeCode: employee.employeeId || `WF-${1000 + Number(employee.membershipId || 0)}`,
          annualCtc: Number(employeeInfoDraft.annualCtc || 0) || 0,
          designation: employeeInfoDraft.designation || '',
          employmentType: employeeInfoDraft.employmentType || 'Full-time',
          joinDate: employeeInfoDraft.joinDate || null,
          workLocation: employeeInfoDraft.location || '',
          phone: employeeInfoDraft.phone || '',
          reportingRole: employeeInfoDraft.reportingRole || 'manager',
          status: employeeInfoDraft.status || 'Active',
          bankAccountNumber: employeeInfoDraft.bankAccountNumber || '',
          bankIfsc: employeeInfoDraft.bankIfsc || '',
          bankName: employeeInfoDraft.bankName || '',
          salaryStructure: employeeInfoDraft.salaryStructureId ? Number(employeeInfoDraft.salaryStructureId) : null,
        })
      }
      const { employee: refreshed } = await getSyncedEmployeeById(employee.id)
      setEmployee(refreshed)
      setEditingEmployeeInfo(false)
      setEmployeeInfoDraft(null)
    } catch (error) {
      setEmployeeInfoSaveError(error?.message || 'Failed to save employee details')
    } finally {
      setSavingEmployeeInfo(false)
    }
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="space-y-3">
        <HRPageHeader
          title={employee.name}
          subtitle={employee.designation}
          breadcrumb={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Employees', href: '/employees' },
            { label: employee.name, href: `/employees/${employee.id}` },
          ]}
          showProfile
        >
          <HRDetailHeaderActions
            actions={[
              {
                label: 'Edit',
                title: 'Edit employee',
                icon: Edit,
                onClick: () => router.push(`/employees/${employee.id}/edit`),
              },
              employee.email
                ? {
                    label: 'Message',
                    title: 'Message employee',
                    icon: Mail,
                    onClick: () => {
                      window.location.href = `mailto:${employee.email}`
                    },
                  }
                : null,
              {
                label: 'Delete',
                title: 'Delete employee',
                icon: Trash2,
                variant: 'danger',
                onClick: () => setDeleteOpen(true),
              },
            ]}
          />
        </HRPageHeader>

        <EmployeeDetailMetaBar employee={employee} />
      </div>

      <TabsWithActions tabs={TABS} activeTab={tab} onTabChange={setTab} variant="pill" />

      {tab === 'overview' && (
        <EmployeeOverviewPanel
          employee={employee}
          editing={editingEmployeeInfo}
          draft={employeeInfoDraft}
          departments={departmentCatalog.map((d) => d.name)}
          managerRoleOptions={managerRoleOptions}
          salaryStructureOptions={salaryStructureOptions}
          saving={savingEmployeeInfo}
          saveError={employeeInfoSaveError}
          onEdit={openEmployeeInfoEdit}
          onCancelEdit={cancelEmployeeInfoEdit}
          onSaveEdit={saveEmployeeInfo}
          onDraftChange={setEmployeeInfoField}
        />
      )}
      {tab === 'documents' && (
        <EmployeeDocumentsPanel employee={employee} documents={docs} filesProps={entityFilesPanelProps} />
      )}
      {tab === 'attendance' && <EmployeeAttendancePanel employee={employee} />}
      {tab === 'leave' && <EmployeeLeavePanel employee={employee} />}
      {tab === 'payroll' && <EmployeePayrollPanel employee={employee} />}
      {tab === 'performance' && <EmployeePerformancePanel okrs={okrs} />}
      {tab === 'activity' && <EmployeeActivityPanel employee={employee} fallbackActivities={activities} />}

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
    </div>
  )
}
