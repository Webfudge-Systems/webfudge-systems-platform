'use client'

import { useEffect, useMemo, useState } from 'react'
import { Clock } from 'lucide-react'
import { Button, FormSectionCard, Input, Modal, Textarea } from '@webfudge/ui'
import { Select } from '../shared/ESSSelect'
import {
  ATTENDANCE_STATUS_OPTIONS,
  calcDurationMinutes,
  formatDurationMinutes,
  toDateInputValue,
} from '../../lib/attendanceShared'
import { currentTimeValue } from '../../lib/attendanceClock'
import {
  formatShiftLabel,
  getShiftById,
  getShiftOptionsForEmployee,
  resolveAttendanceShift,
  shouldShowShiftPicker,
} from '../../lib/shiftShared'

export default function ESSMarkAttendanceModal({
  open,
  onClose,
  membershipId,
  employee,
  selectedDate,
  initialRow = null,
  onSaved,
}) {
  const [attendanceDate, setAttendanceDate] = useState('')
  const [status, setStatus] = useState('present')
  const [workShift, setWorkShift] = useState('morning')
  const [clockIn, setClockIn] = useState(() => currentTimeValue())
  const [clockOut, setClockOut] = useState('')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const statusOptions = useMemo(
    () => ATTENDANCE_STATUS_OPTIONS.filter((row) => ['present', 'wfh'].includes(row.value)),
    [],
  )
  const shiftOptions = useMemo(() => getShiftOptionsForEmployee(employee), [employee])
  const showShiftPicker = shouldShowShiftPicker(employee)
  const fixedShiftLabel = formatShiftLabel(resolveAttendanceShift(employee, workShift))

  const durationLabel = useMemo(() => {
    if (status !== 'present' && status !== 'wfh') return '—'
    return formatDurationMinutes(calcDurationMinutes(clockIn, clockOut))
  }, [status, clockIn, clockOut])

  useEffect(() => {
    if (!open) return
    setSubmitError('')
    const dateValue = toDateInputValue(initialRow?.attendanceDate || initialRow?.date || selectedDate || new Date())
    setAttendanceDate(dateValue)

    const resolvedShift = resolveAttendanceShift(employee, initialRow?.workShift)
    setWorkShift(resolvedShift)

    if (initialRow) {
      const rawStatus = String(initialRow.statusRaw || initialRow.status || 'present').toLowerCase()
      const editableStatus = rawStatus === 'not_marked' || rawStatus === 'on_leave' || rawStatus === 'leave' ? 'present' : rawStatus
      setStatus(editableStatus === 'wfh' ? 'wfh' : 'present')
      setClockIn(initialRow.clockIn && initialRow.clockIn !== '—' ? initialRow.clockIn : currentTimeValue())
      setClockOut(initialRow.clockOut && initialRow.clockOut !== '—' ? initialRow.clockOut : '')
      setNotes(initialRow.notes || '')
      return
    }

    const shiftTimes = getShiftById(resolvedShift)
    setStatus('present')
    setClockIn(currentTimeValue())
    setClockOut('')
    setNotes('')
    if (!initialRow) {
      setClockIn(shiftTimes.shiftStart)
    }
  }, [open, initialRow, selectedDate, employee])

  useEffect(() => {
    if (!open || initialRow || !employee || !showShiftPicker) return
    const shiftTimes = getShiftById(workShift)
    setClockIn(shiftTimes.shiftStart)
    setClockOut(shiftTimes.shiftEnd)
  }, [open, initialRow, employee, showShiftPicker, workShift])

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!membershipId || !attendanceDate) return
    try {
      setIsSubmitting(true)
      setSubmitError('')
      await onSaved?.({
        recordId: initialRow?.id || null,
        organizationUserId: membershipId,
        attendanceDate,
        status,
        workShift: resolveAttendanceShift(employee, workShift),
        clockIn,
        clockOut,
        notes: notes.trim(),
      })
      onClose?.()
    } catch (error) {
      setSubmitError(error?.message || 'Failed to save attendance')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={open}
      onClose={() => !isSubmitting && onClose?.()}
      title={initialRow?.recordId || initialRow?.id ? 'Edit attendance' : 'Edit attendance record'}
      subtitle={employee?.name || 'Record your attendance for the day'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <FormSectionCard icon={Clock} title="Attendance entry" description="Status, shift, clock times, and optional note">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Input label="Date *" type="date" value={attendanceDate} onChange={(e) => setAttendanceDate(e.target.value)} disabled={isSubmitting} />
            <Select label="Status *" value={status} onChange={setStatus} options={statusOptions} allowEmpty={false} disabled={isSubmitting} />
            {showShiftPicker ? (
              <Select
                label="Shift *"
                value={workShift}
                onChange={setWorkShift}
                options={shiftOptions}
                allowEmpty={false}
                disabled={isSubmitting}
              />
            ) : (
              <Input label="Shift" value={fixedShiftLabel} readOnly disabled />
            )}
            <Input label="Clock in" type="time" value={clockIn} onChange={(e) => setClockIn(e.target.value)} disabled={isSubmitting} />
            <Input label="Clock out" type="time" value={clockOut} onChange={(e) => setClockOut(e.target.value)} disabled={isSubmitting} />
            <div className="md:col-span-2">
              <p className="text-sm text-gray-500">Duration: {durationLabel}</p>
            </div>
            <div className="md:col-span-2">
              <Textarea label="Note" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} disabled={isSubmitting} />
            </div>
          </div>
        </FormSectionCard>
        {submitError ? <p className="text-sm text-red-600">{submitError}</p> : null}
        <div className="flex justify-end gap-2 border-t border-gray-200 pt-4">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" variant="primary" className="bg-orange-500 hover:bg-orange-600" disabled={isSubmitting || !membershipId}>
            {isSubmitting ? 'Saving…' : 'Submit'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
