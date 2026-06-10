'use client'

import { useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@webfudge/ui'
import HRPageHeader from '../../../../../components/layout/HRPageHeader'
import HRModulePage from '../../../../../components/layout/HRModulePage'
import EmployeeForm, { employeeToForm } from '../../../../../components/employees/EmployeeForm'
import { getEmployeeById } from '../../../../../lib/mock-data/employees'
import { Save, ArrowLeft } from 'lucide-react'

export default function EditEmployeePage() {
  const params = useParams()
  const router = useRouter()
  const employee = useMemo(() => getEmployeeById(params.id), [params.id])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [form, setForm] = useState(() => employeeToForm(employee))

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

  const handleSubmit = (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setTimeout(() => {
      setIsSubmitting(false)
      router.push(`/employees/${employee.id}`)
    }, 600)
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
        <EmployeeForm form={form} onChange={handleChange} />

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
