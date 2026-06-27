'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Save, ArrowLeft } from 'lucide-react'
import { Button, Card, Select } from '@webfudge/ui'
import HRPageHeader from '../../../../components/layout/HRPageHeader'
import PayrollRecordForm, { payrollRecordToForm } from '../../../../components/payroll/PayrollRecordForm'
import { createPayrollLineItem, listPayrollRuns } from '../../../../lib/payrollSyncService'
import { listSyncedEmployees } from '../../../../lib/employeeSyncService'

export default function AddPayrollRecordPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [form, setForm] = useState(() => payrollRecordToForm(null))
  const [runOptions, setRunOptions] = useState([])
  const [employeeOptions, setEmployeeOptions] = useState([])
  const [selectedRunId, setSelectedRunId] = useState('')
  const [selectedMembershipId, setSelectedMembershipId] = useState('')
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [runs, employeeDirectory] = await Promise.all([listPayrollRuns(), listSyncedEmployees()])
        if (cancelled) return
        setRunOptions(runs.map((run) => ({ value: String(run.id), label: `${run.monthLabel} · ${run.status}` })))
        setSelectedRunId(String(runs[0]?.id || ''))
        setEmployeeOptions(
          (employeeDirectory.employees || []).map((employee) => ({
            value: String(employee.membershipId || employee.id),
            label: `${employee.name} (${employee.employeeId || employee.id})`,
          })),
        )
      } catch {
        if (!cancelled) {
          setRunOptions([])
          setEmployeeOptions([])
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const selectedEmployee = useMemo(
    () => employeeOptions.find((e) => String(e.value) === String(selectedMembershipId)) || null,
    [employeeOptions, selectedMembershipId],
  )

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setIsSubmitting(true)
      setSubmitError('')
      await createPayrollLineItem({
        payrollRun: Number(selectedRunId),
        organizationUser: Number(selectedMembershipId),
        gross: Number(form.gross || 0),
        pf: Number(form.pf || 0),
        esi: Number(form.esi || 0),
        pt: Number(form.pt || 0),
        tds: Number(form.tds || 0),
        net: Number(form.net || 0),
      })
      setIsSubmitting(false)
      router.push('/payroll')
    } catch (error) {
      setIsSubmitting(false)
      setSubmitError(error?.message || 'Failed to add payroll record')
    }
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <HRPageHeader
        title="Add to Payroll"
        subtitle="Add an employee record to a payroll run"
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Payroll', href: '/payroll' },
          { label: 'Add New', href: '/payroll/new' },
        ]}
        showProfile
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card variant="elevated" className="rounded-xl p-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Select label="Payroll run" value={selectedRunId} onChange={setSelectedRunId} options={runOptions} />
            <Select label="Employee" value={selectedMembershipId} onChange={setSelectedMembershipId} options={employeeOptions} />
          </div>
        </Card>
        <PayrollRecordForm form={form} onChange={handleChange} isNew={Boolean(selectedEmployee)} />
        {submitError ? <p className="text-sm text-red-600">{submitError}</p> : null}
        <div className="flex items-center justify-between border-t border-gray-200 pt-6">
          <Button type="button" variant="outline" onClick={() => router.back()} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || !selectedRunId || !selectedMembershipId} className="flex min-w-[140px] items-center justify-center gap-2">
            {isSubmitting ? 'Saving…' : (
              <>
                <Save className="h-4 w-4" />
                Add Record
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
