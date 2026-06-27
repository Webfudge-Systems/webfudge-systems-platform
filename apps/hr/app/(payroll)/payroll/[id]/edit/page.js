'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Save, ArrowLeft } from 'lucide-react'
import { Button, Card, EmptyState, LoadingSpinner } from '@webfudge/ui'
import HRPageHeader from '../../../../../components/layout/HRPageHeader'
import PayrollRecordForm, { payrollRecordToForm } from '../../../../../components/payroll/PayrollRecordForm'
import { getPayrollLineItemById, updatePayrollLineItem } from '../../../../../lib/payrollSyncService'

export default function EditPayrollRecordPage() {
  const params = useParams()
  const router = useRouter()
  const [record, setRecord] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [form, setForm] = useState(() => payrollRecordToForm(null))
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        const line = await getPayrollLineItemById(params.id)
        if (!line || cancelled) return
        const orgUser = line.organizationUser || {}
        const user = orgUser.user || {}
        const profile = line.employeeProfile || {}
        const name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || user.email || `Member ${orgUser.id || ''}`
        const row = {
          id: line.id,
          name,
          employeeId: profile.employeeCode || `WF-${1000 + Number(orgUser.id || 0)}`,
          designation: profile.designation || '',
          dept: orgUser?.primaryDepartment?.name || orgUser?.departments?.[0]?.name || '',
          gross: line.gross,
          pf: line.pf,
          esi: line.esi,
          pt: line.pt,
          tds: line.tds,
          net: line.net,
          status: line.payrollRun?.status || 'draft',
        }
        setRecord(row)
        setForm(payrollRecordToForm(row))
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
          <LoadingSpinner message="Loading payroll record..." />
        </Card>
      </div>
    )
  }

  if (!record) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <HRPageHeader
          title="Record Not Found"
          breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Payroll', href: '/payroll' }]}
          showProfile
        />
        <Card variant="elevated" className="rounded-xl p-12">
          <EmptyState
            title="Payroll record not found"
            description="The record may have been removed or the link is incorrect."
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
      await updatePayrollLineItem(record.id, {
        gross: Number(form.gross || 0),
        pf: Number(form.pf || 0),
        esi: Number(form.esi || 0),
        pt: Number(form.pt || 0),
        tds: Number(form.tds || 0),
        net: Number(form.net || 0),
      })
      setIsSubmitting(false)
      router.push(`/payroll/${record.id}`)
    } catch (error) {
      setIsSubmitting(false)
      setSubmitError(error?.message || 'Failed to save changes')
    }
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <HRPageHeader
        title={`Edit ${record.name}`}
        subtitle="Update salary and deduction details for this payroll run"
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Payroll', href: '/payroll' },
          { label: record.name, href: `/payroll/${record.id}` },
          { label: 'Edit', href: `/payroll/${record.id}/edit` },
        ]}
        showProfile
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <PayrollRecordForm form={form} onChange={handleChange} />
        {submitError ? <p className="text-sm text-red-600">{submitError}</p> : null}
        <div className="flex items-center justify-between border-t border-gray-200 pt-6">
          <Button type="button" variant="outline" onClick={() => router.push(`/payroll/${record.id}`)} className="flex items-center gap-2">
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
