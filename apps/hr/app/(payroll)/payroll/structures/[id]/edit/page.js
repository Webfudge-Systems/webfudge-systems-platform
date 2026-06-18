'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@webfudge/ui'
import HRPageHeader from '../../../../../../components/layout/HRPageHeader'
import HRModulePage from '../../../../../../components/layout/HRModulePage'
import SalaryStructureForm, { salaryStructureToForm } from '../../../../../../components/payroll/SalaryStructureForm'
import { getSalaryStructureById, updateSalaryStructure } from '../../../../../../lib/payrollSyncService'
import { Save, ArrowLeft } from 'lucide-react'

export default function EditSalaryStructurePage() {
  const params = useParams()
  const router = useRouter()
  const [structure, setStructure] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [form, setForm] = useState(() => salaryStructureToForm(null))
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        const row = await getSalaryStructureById(params.id)
        if (!cancelled) {
          setStructure(row)
          setForm(salaryStructureToForm(row))
        }
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
        <p className="text-gray-600">Loading structure...</p>
      </HRModulePage>
    )
  }

  if (!structure) {
    return (
      <HRModulePage>
        <p className="text-gray-600">Salary structure not found.</p>
        <Link href="/payroll" className="mt-2 inline-block text-sm text-orange-600 hover:underline">
          Back to payroll
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
      await updateSalaryStructure(structure.id, {
        name: form.name,
        ctc: Number(form.ctc || 0),
        basicPercent: Number(form.basicPercent || 0),
        hraPercent: Number(form.hraPercent || 0),
        specialAllowancePercent: Number(form.specialAllowancePercent || 0),
        fbpPercent: Number(form.fbpPercent || 0),
      })
      setIsSubmitting(false)
      router.push(`/payroll/structures/${structure.id}`)
    } catch (error) {
      setIsSubmitting(false)
      setSubmitError(error?.message || 'Failed to save changes')
    }
  }

  return (
    <HRModulePage>
      <HRPageHeader
        title={`Edit ${structure.name}`}
        subtitle="Update CTC band and salary components"
        breadcrumb={[
          { label: 'Payroll', href: '/payroll' },
          { label: structure.name, href: `/payroll/structures/${structure.id}` },
          { label: 'Edit', href: `/payroll/structures/${structure.id}/edit` },
        ]}
        showSearch={false}
        showActions={false}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <SalaryStructureForm form={form} onChange={handleChange} />
        {submitError ? <p className="text-sm text-red-600">{submitError}</p> : null}

        <div className="flex items-center justify-between border-t border-gray-200 pt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/payroll/structures/${structure.id}`)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} className="flex min-w-[140px] items-center justify-center gap-2">
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
