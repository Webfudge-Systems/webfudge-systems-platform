'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@webfudge/ui'
import HRPageHeader from '../../../../../components/layout/HRPageHeader'
import HRModulePage from '../../../../../components/layout/HRModulePage'
import EmployeeForm, { employeeToForm } from '../../../../../components/employees/EmployeeForm'
import {
  getSyncedEmployeeById,
  updateEmployeeFromForm,
} from '../../../../../lib/employeeSyncService'
import { listSalaryStructures, upsertEmployeeProfileByMembership } from '../../../../../lib/payrollSyncService'
import { Save, ArrowLeft } from 'lucide-react'

export default function EditEmployeePage() {
  const params = useParams()
  const router = useRouter()
  const [employee, setEmployee] = useState(null)
  const [loading, setLoading] = useState(true)
  const [departmentCatalog, setDepartmentCatalog] = useState([])
  const [managerRoleOptions, setManagerRoleOptions] = useState([
    { value: 'admin', label: 'Admin' },
    { value: 'manager', label: 'Manager' },
  ])
  const [salaryStructureOptions, setSalaryStructureOptions] = useState([{ value: '', label: 'Unassigned' }])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [form, setForm] = useState(() => employeeToForm(null))
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        const { employee: row, departments, roles } = await getSyncedEmployeeById(params.id)
        const structureRows = await listSalaryStructures()
        if (cancelled) return
        setEmployee(row)
        setDepartmentCatalog(departments)
        setForm(employeeToForm(row))
        const managerRoles = roles
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
        <Link href="/employees" className="mt-2 inline-block text-sm text-orange-600">
          Back to directory
        </Link>
      </HRModulePage>
    )
  }

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setIsSubmitting(true)
      setSubmitError('')
      await updateEmployeeFromForm(employee, form, departmentCatalog)
      if (employee.membershipId) {
        await upsertEmployeeProfileByMembership(employee.membershipId, {
          employeeCode: employee.employeeId || `WF-${1000 + Number(employee.membershipId || 0)}`,
          annualCtc: Number(form.annualCtc || 0) || 0,
          designation: form.designation || '',
          employmentType: form.employmentType || 'Full-time',
          joinDate: form.joinDate || null,
          workLocation: form.location || '',
          phone: form.phone || '',
          reportingRole: form.reportingRole || 'manager',
          status: form.status || 'Active',
          bankAccountNumber: form.bankAccountNumber || '',
          bankIfsc: form.bankIfsc || '',
          bankName: form.bankName || '',
          salaryStructure: form.salaryStructureId ? Number(form.salaryStructureId) : null,
        })
      }
      setIsSubmitting(false)
      router.push(`/employees/${employee.id}`)
    } catch (error) {
      setIsSubmitting(false)
      setSubmitError(error?.message || 'Failed to save changes')
    }
  }

  return (
    <HRModulePage>
      <HRPageHeader
        title={`Edit ${employee.name}`}
        subtitle="Update employment and contact details"
        breadcrumb={[
          { label: 'Employees', href: '/employees' },
          { label: employee.name, href: `/employees/${employee.id}` },
          { label: 'Edit', href: `/employees/${employee.id}/edit` },
        ]}
        showSearch={false}
        showActions={false}
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
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/employees/${employee.id}`)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="flex min-w-[140px] items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-b-transparent" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>
    </HRModulePage>
  )
}
