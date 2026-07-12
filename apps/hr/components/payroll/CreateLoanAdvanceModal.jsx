'use client'

import { useEffect, useMemo, useState } from 'react'
import { Briefcase, Building2, CreditCard, Save } from 'lucide-react'
import { Button, FormSectionCard, Input, Modal, Textarea } from '@webfudge/ui'
import { Select } from '../shared/HRSelect'
import { formatPayrollInr } from '../../lib/payrollPage'

const TYPE_OPTIONS = [
  { value: 'Loan', label: 'Employee loan' },
  { value: 'Advance', label: 'Salary advance' },
]

function getEmployeeInitials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase()
}

function hasDisplayValue(value) {
  const text = String(value ?? '').trim()
  return Boolean(text && text !== '—')
}

function LoanEmployeeSummaryCard({ employee, netPay, runLabel }) {
  const designation = hasDisplayValue(employee?.designation) ? employee.designation : null
  const dept = hasDisplayValue(employee?.dept) ? employee.dept : null

  return (
    <div className="md:col-span-2 overflow-hidden rounded-xl border border-orange-200/70 bg-gradient-to-br from-orange-50 via-white to-white shadow-sm">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-stretch sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-orange-500 text-sm font-bold text-white shadow-sm ring-4 ring-orange-100"
            aria-hidden
          >
            {getEmployeeInitials(employee?.name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold text-gray-900">{employee?.name || 'Employee'}</p>
            {hasDisplayValue(employee?.employeeId) ? (
              <p className="mt-0.5 text-xs font-medium text-gray-500">{employee.employeeId}</p>
            ) : null}
            {designation || dept ? (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {designation ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-orange-100 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 shadow-sm">
                    <Briefcase className="h-3 w-3 text-orange-500" aria-hidden />
                    {designation}
                  </span>
                ) : null}
                {dept ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-600">
                    <Building2 className="h-3 w-3 text-gray-400" aria-hidden />
                    {dept}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 flex-col justify-center rounded-lg bg-white px-4 py-3 shadow-sm ring-1 ring-orange-200/80 sm:min-w-[168px] sm:text-right">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Net salary</p>
          <p className="mt-0.5 truncate text-xs text-gray-500">{runLabel}</p>
          <p className="mt-1 text-xl font-bold tabular-nums tracking-tight text-orange-700">
            {formatPayrollInr(netPay)}
          </p>
        </div>
      </div>
    </div>
  )
}

export default function CreateLoanAdvanceModal({
  open,
  onClose,
  selectedRun,
  lineItems = [],
  onSaved,
}) {
  const [lineItemId, setLineItemId] = useState('')
  const [type, setType] = useState('Loan')
  const [principal, setPrincipal] = useState('')
  const [monthlyDeduction, setMonthlyDeduction] = useState('')
  const [startDate, setStartDate] = useState('')
  const [notes, setNotes] = useState('')
  const [requireApproval, setRequireApproval] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const employeeOptions = useMemo(
    () =>
      lineItems.map((row) => ({
        value: String(row.id),
        label: `${row.name} · ${row.employeeId}`,
      })),
    [lineItems],
  )

  const selectedEmployee = useMemo(
    () => lineItems.find((row) => String(row.id) === String(lineItemId)) || null,
    [lineItems, lineItemId],
  )

  const employeeNetPay = Number(selectedEmployee?.net || 0)

  useEffect(() => {
    if (!open) return
    setSubmitError('')
    setType('Loan')
    setPrincipal('')
    setMonthlyDeduction('')
    setNotes('')
    setRequireApproval(false)
    setStartDate(new Date().toISOString().slice(0, 10))
    setLineItemId(lineItems[0] ? String(lineItems[0].id) : '')
  }, [open, lineItems])

  useEffect(() => {
    if (!open || !lineItemId || employeeNetPay <= 0 || type !== 'Advance') return
    setPrincipal(String(employeeNetPay))
    setMonthlyDeduction(String(employeeNetPay))
  }, [open, lineItemId, employeeNetPay, type])

  useEffect(() => {
    if (!open || type !== 'Advance' || !principal) return
    const amount = Number(principal || 0)
    if (amount > 0 && !monthlyDeduction) {
      setMonthlyDeduction(String(amount))
    }
  }, [open, type, principal, monthlyDeduction])

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!selectedRun?.id || !lineItemId || !selectedEmployee) return
    const amount = Number(principal || 0)
    const emi = Number(monthlyDeduction || 0)
    if (amount <= 0 || emi <= 0) {
      setSubmitError('Principal and monthly deduction must be greater than zero.')
      return
    }
    if (type === 'Advance' && employeeNetPay > 0 && amount > employeeNetPay) {
      setSubmitError(
        `Advance amount (${formatPayrollInr(amount)}) cannot exceed this employee's net pay (${formatPayrollInr(employeeNetPay)}).`,
      )
      return
    }
    if (emi > amount) {
      setSubmitError('Monthly deduction cannot exceed the principal amount.')
      return
    }
    if (emi > Number(selectedEmployee.net || 0) && Number(selectedEmployee.net || 0) > 0) {
      setSubmitError(
        `Monthly deduction (${formatPayrollInr(emi)}) exceeds this employee's net pay (${formatPayrollInr(selectedEmployee.net)}).`,
      )
      return
    }
    try {
      setIsSubmitting(true)
      setSubmitError('')
      await onSaved?.({
        payrollRunId: selectedRun.id,
        payrollLineItemId: lineItemId,
        organizationUserId: selectedEmployee.employeeRefId,
        employeeName: selectedEmployee.name,
        employeeId: selectedEmployee.employeeId,
        dept: selectedEmployee.dept,
        type,
        principal: amount,
        monthlyDeduction: emi,
        requireApproval: type === 'Advance' && requireApproval,
        startDate: startDate ? new Date(startDate).toISOString() : new Date().toISOString(),
        notes: notes.trim(),
      })
      onClose?.()
    } catch (error) {
      setSubmitError(error?.message || 'Failed to create record')
    } finally {
      setIsSubmitting(false)
    }
  }

  const runLabel = selectedRun?.monthLabel || 'No run selected'
  const canSubmit = Boolean(selectedRun?.id) && lineItemId && lineItems.length > 0

  return (
    <Modal
      isOpen={open}
      onClose={() => !isSubmitting && onClose?.()}
      title="Add Loan or Advance"
      subtitle={`Create a deduction record for ${runLabel}`}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <FormSectionCard
          icon={CreditCard}
          title="Loan / advance details"
          description="Track employee loans and salary advances against this payroll run"
        >
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="md:col-span-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
              <p className="font-semibold text-gray-900">Payroll run</p>
              <p className="mt-1">{runLabel}</p>
              <p className="mt-2 text-gray-600">
                {lineItems.length === 0
                  ? 'Recalculate the payroll run to load employees before adding loans or advances.'
                  : `${lineItems.length} employee${lineItems.length === 1 ? '' : 's'} available in this run.`}
              </p>
            </div>

            {lineItems.length > 0 ? (
              <>
                <div className="md:col-span-2">
                  <Select
                    label="Employee *"
                    value={lineItemId}
                    onChange={setLineItemId}
                    options={employeeOptions}
                    allowEmpty={false}
                    disabled={isSubmitting}
                  />
                </div>
                {selectedEmployee ? (
                  <LoanEmployeeSummaryCard
                    employee={selectedEmployee}
                    netPay={employeeNetPay}
                    runLabel={runLabel}
                  />
                ) : null}
                <Select
                  label="Type *"
                  value={type}
                  onChange={setType}
                  options={TYPE_OPTIONS}
                  allowEmpty={false}
                  disabled={isSubmitting}
                />
                <Input
                  label="Start date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  disabled={isSubmitting}
                />
                <div>
                  <Input
                    label={type === 'Advance' ? 'Advance amount (₹) *' : 'Principal amount (₹) *'}
                    type="number"
                    min="1"
                    max={type === 'Advance' && employeeNetPay > 0 ? employeeNetPay : undefined}
                    value={principal}
                    onChange={(e) => setPrincipal(e.target.value)}
                    placeholder={
                      type === 'Advance' && employeeNetPay > 0
                        ? formatPayrollInr(employeeNetPay)
                        : type === 'Advance'
                          ? 'Enter advance amount'
                          : 'e.g. 50000'
                    }
                    disabled={isSubmitting}
                  />
                  {type === 'Advance' && employeeNetPay > 0 ? (
                    <p className="mt-1 text-xs text-gray-500">
                      Auto-filled from net pay. Maximum allowed: {formatPayrollInr(employeeNetPay)}.
                    </p>
                  ) : type === 'Loan' && employeeNetPay > 0 ? (
                    <p className="mt-1 text-xs text-gray-500">Monthly EMI must not exceed net pay.</p>
                  ) : null}
                </div>
                <Input
                  label={type === 'Advance' ? 'Recovery amount (₹) *' : 'Monthly deduction (₹) *'}
                  type="number"
                  min="1"
                  value={monthlyDeduction}
                  onChange={(e) => setMonthlyDeduction(e.target.value)}
                  placeholder={type === 'Advance' ? 'Usually same as principal' : 'e.g. 5000'}
                  disabled={isSubmitting}
                />
                {type === 'Advance' ? (
                  <label className="md:col-span-2 flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={requireApproval}
                      onChange={(e) => setRequireApproval(e.target.checked)}
                      disabled={isSubmitting}
                    />
                    <span className="text-sm text-gray-700">
                      <span className="font-medium text-gray-900">Require approval</span>
                      <span className="mt-0.5 block text-gray-600">
                        Advance stays pending until approved from the Pending tab.
                      </span>
                    </span>
                  </label>
                ) : null}
                <div className="md:col-span-2">
                  <Textarea
                    label="Notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Optional purpose or approval notes"
                    rows={3}
                    disabled={isSubmitting}
                  />
                </div>
              </>
            ) : null}

          </div>
        </FormSectionCard>

        {submitError ? <p className="text-sm text-red-600">{submitError}</p> : null}

        <div className="flex flex-wrap justify-end gap-2 border-t border-gray-200 pt-5">
          <Button type="button" variant="outline" disabled={isSubmitting} onClick={onClose}>
            Cancel
          </Button>
          {lineItems.length > 0 ? (
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
