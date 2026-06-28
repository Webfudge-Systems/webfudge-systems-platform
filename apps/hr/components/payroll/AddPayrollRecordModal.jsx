'use client'

import { useEffect, useMemo, useState } from 'react'
import { RefreshCcw, Save, UserPlus } from 'lucide-react'
import { Button, FormSectionCard, Modal } from '@webfudge/ui'
import { Select } from '../shared/HRSelect'
import PayrollRecordForm, { payrollRecordToForm } from './PayrollRecordForm'
import { listSyncedEmployees } from '../../lib/employeeSyncService'
import { estimatePayrollFromCtc } from '../../lib/payrollShared'
import { createPayrollLineItem, getSalaryStructureById } from '../../lib/payrollSyncService'

export default function AddPayrollRecordModal({
  open,
  onClose,
  selectedRun,
  employeeRows = [],
  readOnlyRun = false,
  onSaved,
}) {
  const [employees, setEmployees] = useState([])
  const [loadingEmployees, setLoadingEmployees] = useState(false)
  const [membershipId, setMembershipId] = useState('')
  const [form, setForm] = useState(() => payrollRecordToForm(null))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const existingMembershipIds = useMemo(
    () => new Set(employeeRows.map((row) => String(row.employeeRefId || '')).filter(Boolean)),
    [employeeRows],
  )

  const availableEmployees = useMemo(
    () => employees.filter((employee) => !existingMembershipIds.has(String(employee.membershipId || ''))),
    [employees, existingMembershipIds],
  )

  const employeeOptions = useMemo(
    () =>
      availableEmployees.map((employee) => ({
        value: String(employee.membershipId || ''),
        label: `${employee.name} · ${employee.employeeId || employee.id}`,
      })),
    [availableEmployees],
  )

  const selectedEmployee = useMemo(
    () => availableEmployees.find((employee) => String(employee.membershipId) === String(membershipId)) || null,
    [availableEmployees, membershipId],
  )

  useEffect(() => {
    if (!open) return
    let cancelled = false
    ;(async () => {
      try {
        setLoadingEmployees(true)
        const { employees: rows } = await listSyncedEmployees()
        if (!cancelled) setEmployees(rows || [])
      } catch {
        if (!cancelled) setEmployees([])
      } finally {
        if (!cancelled) setLoadingEmployees(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    setSubmitError('')
    setMembershipId(availableEmployees[0] ? String(availableEmployees[0].membershipId) : '')
    setForm(payrollRecordToForm(null))
  }, [open, availableEmployees])

  const prefillFromEmployee = async (employee) => {
    if (!employee) return
    let structure = null
    if (employee.salaryStructureId) {
      structure = await getSalaryStructureById(employee.salaryStructureId).catch(() => null)
    }
    const amounts = estimatePayrollFromCtc(Number(employee.annualCtc || 0), structure)
    setForm(
      payrollRecordToForm({
        name: employee.name,
        employeeId: employee.employeeId,
        designation: employee.designation || '',
        dept: employee.department || '',
        gross: amounts.gross,
        pf: amounts.pf,
        esi: amounts.esi,
        pt: amounts.pt,
        tds: amounts.tds,
        net: amounts.net,
        status: selectedRun?.status || 'draft',
      }),
    )
  }

  useEffect(() => {
    if (!open || !selectedEmployee) return
    prefillFromEmployee(selectedEmployee)
  }, [open, membershipId, selectedEmployee?.membershipId])

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!selectedRun?.id || !membershipId || !selectedEmployee || readOnlyRun) return
    try {
      setIsSubmitting(true)
      setSubmitError('')
      const gross = Number(form.gross || 0)
      const pf = Number(form.pf || 0)
      const esi = Number(form.esi || 0)
      const pt = Number(form.pt || 0)
      const tds = Number(form.tds || 0)
      const net = Number(form.net || 0)
      await createPayrollLineItem({
        payrollRun: Number(selectedRun.id),
        organizationUser: Number(membershipId),
        gross,
        pf,
        esi,
        pt,
        tds,
        net,
        deductionsTotal: pf + esi + pt + tds,
        missingSalaryStructure: !selectedEmployee.salaryStructureId,
        missingBankDetails: !(
          selectedEmployee.bankAccountNumber &&
          selectedEmployee.bankIfsc &&
          selectedEmployee.bankName
        ),
      })
      await onSaved?.(selectedRun.id)
      onClose?.()
    } catch (error) {
      setSubmitError(error?.message || 'Failed to add payroll record')
    } finally {
      setIsSubmitting(false)
    }
  }

  const runLabel = selectedRun?.monthLabel || 'No run selected'
  const canSubmit = Boolean(selectedRun?.id) && membershipId && !readOnlyRun && availableEmployees.length > 0

  return (
    <Modal
      isOpen={open}
      onClose={() => !isSubmitting && onClose?.()}
      title="Add to Payroll"
      subtitle={`Add an employee to ${runLabel}`}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <FormSectionCard
          icon={UserPlus}
          title="Employee selection"
          description="Choose an employee who is not already in this payroll run"
        >
          <div className="space-y-4">
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
              <p className="font-semibold text-gray-900">Payroll run</p>
              <p className="mt-1">{runLabel}</p>
              <p className="mt-2 text-gray-600">
                {loadingEmployees
                  ? 'Loading employees…'
                  : availableEmployees.length === 0
                    ? employeeRows.length > 0
                      ? 'All active employees are already in this run. Use Recalculate to refresh amounts.'
                      : 'No employees available. Add employees in HR first, then Recalculate.'
                    : `${availableEmployees.length} employee${availableEmployees.length === 1 ? '' : 's'} available to add.`}
              </p>
            </div>

            {availableEmployees.length > 0 ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <Select
                    label="Employee *"
                    value={membershipId}
                    onChange={setMembershipId}
                    options={employeeOptions}
                    allowEmpty={false}
                    disabled={isSubmitting}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="shrink-0 gap-2"
                  disabled={!selectedEmployee || isSubmitting}
                  onClick={() => prefillFromEmployee(selectedEmployee)}
                >
                  <RefreshCcw className="h-4 w-4" />
                  Recalc from structure
                </Button>
              </div>
            ) : null}
          </div>
        </FormSectionCard>

        {availableEmployees.length > 0 ? (
          <PayrollRecordForm form={form} onChange={handleChange} isNew departments={[]} />
        ) : null}

        {submitError ? <p className="text-sm text-red-600">{submitError}</p> : null}

        <div className="flex flex-wrap justify-end gap-2 border-t border-gray-200 pt-5">
          <Button type="button" variant="outline" disabled={isSubmitting} onClick={onClose}>
            Cancel
          </Button>
          {availableEmployees.length > 0 ? (
            <Button type="submit" disabled={!canSubmit || isSubmitting} className="gap-2 bg-orange-500 hover:bg-orange-600">
              {isSubmitting ? (
                'Saving…'
              ) : (
                <>
                  <Save className="h-4 w-4" aria-hidden />
                  Add Record
                </>
              )}
            </Button>
          ) : null}
        </div>
      </form>
    </Modal>
  )
}
