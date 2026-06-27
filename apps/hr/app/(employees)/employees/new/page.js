'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Save, ArrowLeft } from 'lucide-react'
import { Button } from '@webfudge/ui'
import HRPageHeader from '../../../../components/layout/HRPageHeader'
import EmployeeForm, { employeeToForm } from '../../../../components/employees/EmployeeForm'
import { createEmployeeFromForm, listDepartmentCatalog, listRoleCatalog } from '../../../../lib/employeeSyncService'
import { listSalaryStructures, upsertEmployeeProfileByMembership } from '../../../../lib/payrollSyncService'

export default function AddEmployeePage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [form, setForm] = useState(() => employeeToForm(null))
  const [departmentCatalog, setDepartmentCatalog] = useState([])
  const [managerRoleOptions, setManagerRoleOptions] = useState([
    { value: 'admin', label: 'Admin' },
    { value: 'manager', label: 'Manager' },
  ])
  const [salaryStructureOptions, setSalaryStructureOptions] = useState([{ value: '', label: 'Unassigned' }])
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [departmentRows, roleRows, structureRows] = await Promise.all([
          listDepartmentCatalog(),
          listRoleCatalog(),
          listSalaryStructures(),
        ])
        if (cancelled) return
        setDepartmentCatalog(departmentRows)
        const managerRoles = roleRows
          .map((r) => ({
            value: String(r.code || r.name || '').toLowerCase(),
            label: r.name || r.code,
          }))
          .filter((r) => r.value === 'admin' || r.value === 'manager')
        if (managerRoles.length) setManagerRoleOptions(managerRoles)
        setSalaryStructureOptions([
          { value: '', label: 'Unassigned' },
          ...structureRows.map((s) => ({ value: String(s.id), label: s.name })),
        ])
      } catch {
        if (!cancelled) {
          setDepartmentCatalog([])
          setManagerRoleOptions([
            { value: 'admin', label: 'Admin' },
            { value: 'manager', label: 'Manager' },
          ])
          setSalaryStructureOptions([{ value: '', label: 'Unassigned' }])
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setIsSubmitting(true)
      setSubmitError('')
      const created = await createEmployeeFromForm(form, departmentCatalog)
      if (created?.membershipId) {
        await upsertEmployeeProfileByMembership(created.membershipId, {
          employeeCode: created.employeeKey || `WF-${1000 + Number(created.membershipId || 0)}`,
          annualCtc: Number(form.annualCtc || 0) || 0,
          designation: form.designation || '',
          employmentType: form.employmentType || 'Full-time',
          joinDate: form.joinDate || null,
          workLocation: form.location || '',
          phone: form.phone || '',
          reportingRole: form.reportingRole || 'manager',
          status: form.status || 'Probation',
          bankAccountNumber: form.bankAccountNumber || '',
          bankIfsc: form.bankIfsc || '',
          bankName: form.bankName || '',
          salaryStructure: form.salaryStructureId ? Number(form.salaryStructureId) : null,
        })
      }
      setIsSubmitting(false)
      router.push('/employees')
    } catch (error) {
      setIsSubmitting(false)
      setSubmitError(error?.message || 'Failed to create employee')
    }
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <HRPageHeader
        title="Add New Employee"
        subtitle="Create a new employee record with employment details"
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Employees', href: '/employees' },
          { label: 'Add New', href: '/employees/new' },
        ]}
        showProfile
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <EmployeeForm
          form={form}
          onChange={handleChange}
          departments={departmentCatalog.map((d) => d.name)}
          managerRoleOptions={managerRoleOptions}
          salaryStructureOptions={salaryStructureOptions}
        />
        {submitError ? <p className="text-sm text-red-600">{submitError}</p> : null}

        <div className="flex items-center justify-between border-t border-gray-200 pt-6">
          <Button type="button" variant="outline" onClick={() => router.back()} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="flex min-w-[140px] items-center justify-center gap-2"
          >
            {isSubmitting ? 'Saving…' : (
              <>
                <Save className="h-4 w-4" />
                Create Employee
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
