'use client'

import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, Save } from 'lucide-react'
import { Button, FormSectionCard, Input, Modal, Textarea } from '@webfudge/ui'
import { Select } from '../shared/HRSelect'
import { calcInclusiveLeaveDays, LEAVE_TYPE_OPTIONS } from '../../lib/leaveShared'

export default function CreateLeaveRequestModal({
  open,
  onClose,
  employees = [],
  onSaved,
}) {
  const [organizationUserId, setOrganizationUserId] = useState('')
  const [leaveType, setLeaveType] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const employeeOptions = useMemo(
    () =>
      employees
        .filter((row) => row.status !== 'Exited')
        .map((row) => ({
          value: String(row.membershipId || row.id),
          label: `${row.name} · ${row.employeeId}`,
        })),
    [employees],
  )

  const selectedEmployee = useMemo(
    () =>
      employees.find((row) => String(row.membershipId || row.id) === String(organizationUserId)) || null,
    [employees, organizationUserId],
  )

  const computedDays = useMemo(
    () => calcInclusiveLeaveDays(fromDate, toDate || fromDate),
    [fromDate, toDate],
  )

  useEffect(() => {
    if (!open) return
    setSubmitError('')
    setLeaveType(LEAVE_TYPE_OPTIONS[0]?.value || '')
    setFromDate('')
    setToDate('')
    setReason('')
    const first = employees.find((row) => row.status !== 'Exited')
    setOrganizationUserId(first ? String(first.membershipId || first.id) : '')
  }, [open, employees])

  useEffect(() => {
    if (!open || !fromDate || toDate) return
    setToDate(fromDate)
  }, [open, fromDate, toDate])

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!organizationUserId || !leaveType || !fromDate) return
    if (toDate && new Date(toDate) < new Date(fromDate)) {
      setSubmitError('End date cannot be before start date.')
      return
    }
    try {
      setIsSubmitting(true)
      setSubmitError('')
      await onSaved?.({
        organizationUserId,
        leaveType,
        fromDate,
        toDate: toDate || fromDate,
        reason: reason.trim(),
      })
      onClose?.()
    } catch (error) {
      setSubmitError(error?.message || 'Failed to create leave request')
    } finally {
      setIsSubmitting(false)
    }
  }

  const canSubmit = Boolean(organizationUserId && leaveType && fromDate && employees.length > 0)

  return (
    <Modal
      isOpen={open}
      onClose={() => !isSubmitting && onClose?.()}
      title="Apply Leave"
      subtitle="Submit a leave request for manager approval"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <FormSectionCard
          icon={CalendarDays}
          title="Leave request"
          description="Select employee, leave type, and date range"
        >
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {employees.length === 0 ? (
              <p className="md:col-span-2 text-sm text-gray-600">
                No active employees found. Add employees before applying leave.
              </p>
            ) : (
              <>
                <div className="md:col-span-2">
                  <Select
                    label="Employee *"
                    value={organizationUserId}
                    onChange={setOrganizationUserId}
                    options={employeeOptions}
                    allowEmpty={false}
                    disabled={isSubmitting}
                  />
                </div>
                {selectedEmployee ? (
                  <div className="md:col-span-2 rounded-lg border border-orange-100 bg-orange-50/60 px-4 py-3 text-sm text-gray-700">
                    <p className="font-semibold text-gray-900">{selectedEmployee.name}</p>
                    <p className="mt-1">
                      {selectedEmployee.department || '—'} · {selectedEmployee.designation || '—'}
                    </p>
                  </div>
                ) : null}
                <Select
                  label="Leave type *"
                  value={leaveType}
                  onChange={setLeaveType}
                  options={LEAVE_TYPE_OPTIONS}
                  allowEmpty={false}
                  disabled={isSubmitting}
                />
                <Input
                  label="Duration (days)"
                  type="number"
                  value={computedDays}
                  readOnly
                  disabled
                />
                <Input
                  label="From date *"
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
                <Input
                  label="To date *"
                  type="date"
                  value={toDate}
                  min={fromDate || undefined}
                  onChange={(e) => setToDate(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
                <div className="md:col-span-2">
                  <Textarea
                    label="Reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Brief reason for leave"
                    rows={3}
                    disabled={isSubmitting}
                  />
                </div>
              </>
            )}
          </div>
        </FormSectionCard>

        {submitError ? <p className="text-sm text-red-600">{submitError}</p> : null}

        <div className="flex flex-wrap justify-end gap-2 border-t border-gray-200 pt-5">
          <Button type="button" variant="outline" disabled={isSubmitting} onClick={onClose}>
            Cancel
          </Button>
          {employees.length > 0 ? (
            <Button
              type="submit"
              disabled={!canSubmit || isSubmitting}
              className="gap-2 bg-orange-500 hover:bg-orange-600"
            >
              {isSubmitting ? (
                'Submitting…'
              ) : (
                <>
                  <Save className="h-4 w-4" aria-hidden />
                  Submit Request
                </>
              )}
            </Button>
          ) : null}
        </div>
      </form>
    </Modal>
  )
}
