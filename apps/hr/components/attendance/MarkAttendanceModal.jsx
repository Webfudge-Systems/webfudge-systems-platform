'use client'

import { useEffect, useMemo, useState } from 'react'
import { Clock, Save } from 'lucide-react'
import { Button, FormSectionCard, Input, Modal, Textarea } from '@webfudge/ui'
import { Select } from '../shared/HRSelect'
import {
  ATTENDANCE_STATUS_OPTIONS,
  calcDurationMinutes,
  formatDurationMinutes,
  toDateInputValue,
} from '../../lib/attendanceShared'

export default function MarkAttendanceModal({
  open,
  onClose,
  employees = [],
  selectedDate,
  initialRow = null,
  onSaved,
}) {
  const [organizationUserId, setOrganizationUserId] = useState('')
  const [attendanceDate, setAttendanceDate] = useState('')
  const [status, setStatus] = useState('present')
  const [clockIn, setClockIn] = useState('09:00')
  const [clockOut, setClockOut] = useState('18:00')
  const [location, setLocation] = useState('')
  const [notes, setNotes] = useState('')
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
    () => employees.find((row) => String(row.membershipId || row.id) === String(organizationUserId)) || null,
    [employees, organizationUserId],
  )

  const durationLabel = useMemo(() => {
    if (status !== 'present' && status !== 'wfh') return '—'
    return formatDurationMinutes(calcDurationMinutes(clockIn, clockOut))
  }, [status, clockIn, clockOut])

  useEffect(() => {
    if (!open) return
    setSubmitError('')
    const dateValue = toDateInputValue(selectedDate || new Date())
    setAttendanceDate(dateValue)

    if (initialRow) {
      setOrganizationUserId(String(initialRow.organizationUserId || initialRow.employeeId || ''))
      const rawStatus = String(initialRow.statusRaw || 'present').toLowerCase()
      const editableStatus =
        rawStatus === 'not_marked' || rawStatus === 'on_leave' ? 'present' : rawStatus
      setStatus(editableStatus)
      setClockIn(initialRow.clockIn && initialRow.clockIn !== '—' ? initialRow.clockIn : '09:00')
      setClockOut(initialRow.clockOut && initialRow.clockOut !== '—' ? initialRow.clockOut : '18:00')
      setLocation(initialRow.location && initialRow.location !== '—' ? initialRow.location : '')
      setNotes(initialRow.notes || '')
      return
    }

    const first = employees.find((row) => row.status !== 'Exited')
    setOrganizationUserId(first ? String(first.membershipId || first.id) : '')
    setStatus('present')
    setClockIn('09:00')
    setClockOut('18:00')
    setLocation(selectedEmployee?.workLocation || selectedEmployee?.location || 'Office')
    setNotes('')
  }, [open, initialRow, selectedDate, employees])

  useEffect(() => {
    if (!open || initialRow || !selectedEmployee) return
    if (!location) {
      setLocation(selectedEmployee.workLocation || selectedEmployee.location || 'Office')
    }
  }, [open, initialRow, selectedEmployee, location])

  const showClockFields = status === 'present' || status === 'wfh'

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!organizationUserId || !attendanceDate) return
    try {
      setIsSubmitting(true)
      setSubmitError('')
      await onSaved?.({
        recordId: initialRow?.id || null,
        organizationUserId,
        attendanceDate,
        status,
        clockIn: showClockFields ? clockIn : '',
        clockOut: showClockFields ? clockOut : '',
        location: showClockFields ? location : '',
        notes: notes.trim(),
      })
      onClose?.()
    } catch (error) {
      setSubmitError(error?.message || 'Failed to save attendance')
    } finally {
      setIsSubmitting(false)
    }
  }

  const canSubmit = Boolean(organizationUserId && attendanceDate && employees.length > 0)

  return (
    <Modal
      isOpen={open}
      onClose={() => !isSubmitting && onClose?.()}
      title={initialRow?.id ? 'Edit attendance' : 'Mark attendance'}
      subtitle={initialRow?.name || 'Record daily attendance for an employee'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <FormSectionCard icon={Clock} title="Attendance entry" description="Status, clock times, and location">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {employees.length === 0 ? (
              <p className="md:col-span-2 text-sm text-gray-600">No active employees found.</p>
            ) : (
              <>
                <div className="md:col-span-2">
                  <Select
                    label="Employee *"
                    value={organizationUserId}
                    onChange={setOrganizationUserId}
                    options={employeeOptions}
                    allowEmpty={false}
                    disabled={isSubmitting || Boolean(initialRow?.id)}
                  />
                </div>
                <Input
                  label="Date *"
                  type="date"
                  value={attendanceDate}
                  onChange={(e) => setAttendanceDate(e.target.value)}
                  disabled={isSubmitting}
                />
                <Select
                  label="Status *"
                  value={status}
                  onChange={setStatus}
                  options={ATTENDANCE_STATUS_OPTIONS}
                  allowEmpty={false}
                  disabled={isSubmitting}
                />
                {showClockFields ? (
                  <>
                    <Input
                      label="Clock in"
                      type="time"
                      value={clockIn}
                      onChange={(e) => setClockIn(e.target.value)}
                      disabled={isSubmitting}
                    />
                    <Input
                      label="Clock out"
                      type="time"
                      value={clockOut}
                      onChange={(e) => setClockOut(e.target.value)}
                      disabled={isSubmitting}
                    />
                    <Input
                      label="Duration"
                      value={durationLabel}
                      readOnly
                      disabled
                    />
                    <Input
                      label="Location"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g. Bangalore HQ"
                      disabled={isSubmitting}
                    />
                  </>
                ) : null}
                <div className="md:col-span-2">
                  <Textarea
                    label="Notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
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
            <Button type="submit" disabled={!canSubmit || isSubmitting} className="gap-2 bg-orange-500 hover:bg-orange-600">
              {isSubmitting ? 'Saving…' : (
                <>
                  <Save className="h-4 w-4" aria-hidden />
                  Save attendance
                </>
              )}
            </Button>
          ) : null}
        </div>
      </form>
    </Modal>
  )
}
