'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Select } from '@webfudge/ui'
import HRPageHeader from '../../../../components/layout/HRPageHeader'
import HRModulePage from '../../../../components/layout/HRModulePage'
import PayrollRecordForm, { payrollRecordToForm } from '../../../../components/payroll/PayrollRecordForm'
import { createPayrollLineItem, listPayrollRuns } from '../../../../lib/payrollSyncService'
import { listSyncedEmployees } from '../../../../lib/employeeSyncService'
import { Save, ArrowLeft } from 'lucide-react'

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
    <HRModulePage>
      <HRPageHeader
        title="Add to Payroll"
        subtitle="Add an employee record to a payroll run"
        breadcrumb={[
          { label: 'Payroll', href: '/payroll' },
          { label: 'Add New', href: '/payroll/new' },
        ]}
        showSearch={false}
        showActions={false}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-4 rounded-xl border border-gray-200 bg-white p-4 md:grid-cols-2">
          <Select label="Payroll run" value={selectedRunId} onChange={setSelectedRunId} options={runOptions} />
          <Select label="Employee" value={selectedMembershipId} onChange={setSelectedMembershipId} options={employeeOptions} />
        </div>
        <PayrollRecordForm form={form} onChange={handleChange} isNew={Boolean(selectedEmployee)} />
        {submitError ? <p className="text-sm text-red-600">{submitError}</p> : null}
        <div className="flex items-center justify-between border-t border-gray-200 pt-6">
          <Button type="button" variant="outline" onClick={() => router.back()} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || !selectedRunId || !selectedMembershipId} className="flex min-w-[140px] items-center justify-center gap-2">
            {isSubmitting ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-b-transparent" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Add Record
              </>
            )}
          </Button>
        </div>
      </form>
    </HRModulePage>
  )
}
