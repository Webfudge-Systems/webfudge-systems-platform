'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Save, ArrowLeft } from 'lucide-react'
import { Button, Card, EmptyState, LoadingSpinner } from '@webfudge/ui'
import HRPageHeader from '../../../../../../components/layout/HRPageHeader'
import SalaryStructureForm, { salaryStructureToForm } from '../../../../../../components/payroll/SalaryStructureForm'
import { getSalaryStructureById, updateSalaryStructure } from '../../../../../../lib/payrollSyncService'

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
      <div className="space-y-6 p-4 md:p-6">
        <HRPageHeader
          title="Loading..."
          breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Payroll', href: '/payroll' }]}
          showProfile
        />
        <Card variant="elevated" className="flex justify-center rounded-xl p-12">
          <LoadingSpinner message="Loading structure..." />
        </Card>
      </div>
    )
  }

  if (!structure) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <HRPageHeader
          title="Structure Not Found"
          breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Payroll', href: '/payroll' }]}
          showProfile
        />
        <Card variant="elevated" className="rounded-xl p-12">
          <EmptyState
            title="Salary structure not found"
            description="The structure may have been removed or the link is incorrect."
            action={<Link href="/payroll" className="text-sm font-medium text-orange-600 hover:underline">Back to payroll</Link>}
          />
        </Card>
      </div>
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
    <div className="space-y-6 p-4 md:p-6">
      <HRPageHeader
        title={`Edit ${structure.name}`}
        subtitle="Update CTC band and salary components"
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Payroll', href: '/payroll' },
          { label: structure.name, href: `/payroll/structures/${structure.id}` },
          { label: 'Edit', href: `/payroll/structures/${structure.id}/edit` },
        ]}
        showProfile
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
            {isSubmitting ? 'Saving…' : (
              <>
                <Save className="h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
