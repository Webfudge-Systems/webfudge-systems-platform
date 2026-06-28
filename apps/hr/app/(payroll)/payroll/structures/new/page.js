'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Save, ArrowLeft } from 'lucide-react'
import { Button } from '@webfudge/ui'
import HRPageHeader from '../../../../../components/layout/HRPageHeader'
import SalaryStructureForm, { salaryStructureToForm } from '../../../../../components/payroll/SalaryStructureForm'
import { createSalaryStructure } from '../../../../../lib/payrollSyncService'

export default function NewSalaryStructurePage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [form, setForm] = useState(() => salaryStructureToForm(null))
  const [submitError, setSubmitError] = useState('')

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setIsSubmitting(true)
      setSubmitError('')
      const structure = await createSalaryStructure({
        name: form.name,
        ctc: Number(form.ctc || 0),
        basicPercent: Number(form.basicPercent || 0),
        hraPercent: Number(form.hraPercent || 0),
        specialAllowancePercent: Number(form.specialAllowancePercent || 0),
        fbpPercent: Number(form.fbpPercent || 0),
      })
      setIsSubmitting(false)
      router.push('/payroll/structures')
    } catch (error) {
      setIsSubmitting(false)
      setSubmitError(error?.message || 'Failed to create structure')
    }
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <HRPageHeader
        title="Create Salary Structure"
        subtitle="Define a CTC band and component split for a role family"
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Payroll', href: '/payroll' },
          { label: 'Salary Structures', href: '/payroll/structures' },
          { label: 'New Structure', href: '/payroll/structures/new' },
        ]}
        showProfile
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <SalaryStructureForm form={form} onChange={handleChange} />
        {submitError ? <p className="text-sm text-red-600">{submitError}</p> : null}

        <div className="flex items-center justify-between border-t border-gray-200 pt-6">
          <Button type="button" variant="outline" onClick={() => router.back()} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} className="flex min-w-[140px] items-center justify-center gap-2">
            {isSubmitting ? 'Saving…' : (
              <>
                <Save className="h-4 w-4" />
                Create Structure
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
