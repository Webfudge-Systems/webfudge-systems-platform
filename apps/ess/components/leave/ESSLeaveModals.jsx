'use client'

import { useEffect, useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { FormSectionCard, Input, Modal, Textarea } from '@webfudge/ui'
import { Select } from '../shared/ESSSelect'
import {
  createRegularizationRequest,
  notifyRegularizationUpdated,
} from '../../lib/regularizationSyncService'

const STATUS_OPTIONS = [
  { value: 'present', label: 'Present' },
  { value: 'wfh', label: 'WFH' },
]

export default function ESSApplyLeaveModal({ open, onClose, membershipId, onSuccess }) {
  const [form, setForm] = useState({
    leaveType: '',
    fromDate: '',
    toDate: '',
    reason: '',
    halfDay: false,
    halfDayPeriod: 'first',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const isSingleDay = form.fromDate && form.toDate && form.fromDate === form.toDate

  useEffect(() => {
    if (!open) return
    setForm({ leaveType: '', fromDate: '', toDate: '', reason: '', halfDay: false, halfDayPeriod: 'first' })
    setError('')
  }, [open])

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!membershipId || !form.leaveType || !form.fromDate || !form.reason.trim()) return
    try {
      setSubmitting(true)
      setError('')
      const { createLeaveRequest } = await import('../../lib/leaveSyncService')
      const { notifyLeaveUpdated } = await import('../../lib/leaveShared')
      await createLeaveRequest({
        organizationUserId: membershipId,
        leaveType: form.leaveType,
        fromDate: form.fromDate,
        toDate: form.toDate || form.fromDate,
        reason: form.halfDay && isSingleDay
          ? `${form.reason} (Half day — ${form.halfDayPeriod === 'first' ? 'first half' : 'second half'})`
          : form.reason,
      })
      notifyLeaveUpdated()
      onSuccess?.()
      onClose?.()
    } catch (err) {
      setError(err?.message || 'Failed to apply leave')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal isOpen={open} onClose={() => !submitting && onClose?.()} title="Apply Leave" subtitle="Manager approval required" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormSectionCard icon={CalendarDays} title="Leave request">
          <Select
            label="Leave type *"
            value={form.leaveType}
            onChange={(v) => set('leaveType', v)}
            options={[
              { value: '', label: 'Select type' },
              { value: 'Casual Leave', label: 'CL — Casual Leave' },
              { value: 'Sick Leave', label: 'SL — Sick Leave' },
              { value: 'Privilege Leave', label: 'PL — Privilege Leave' },
              { value: 'Comp-Off', label: 'Comp-Off' },
            ]}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="From date *" type="date" value={form.fromDate} onChange={(e) => set('fromDate', e.target.value)} />
            <Input label="To date" type="date" value={form.toDate} onChange={(e) => set('toDate', e.target.value)} />
          </div>
          {isSingleDay ? (
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={form.halfDay} onChange={(e) => set('halfDay', e.target.checked)} />
              Half day
              {form.halfDay ? (
                <Select
                  value={form.halfDayPeriod}
                  onChange={(v) => set('halfDayPeriod', v)}
                  options={[
                    { value: 'first', label: 'First half' },
                    { value: 'second', label: 'Second half' },
                  ]}
                  allowEmpty={false}
                />
              ) : null}
            </label>
          ) : null}
          <Textarea label="Reason *" value={form.reason} onChange={(e) => set('reason', e.target.value)} rows={3} />
        </FormSectionCard>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <div className="flex justify-end gap-2 border-t border-gray-200 pt-4">
          <button type="button" className="rounded-lg border border-gray-200 px-4 py-2 text-sm" onClick={onClose} disabled={submitting}>Cancel</button>
          <button type="submit" className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50" disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit request'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export function ESSRegularizationForm({ membershipId, onSubmitted }) {
  const [form, setForm] = useState({
    attendanceDate: '',
    requestedStatus: 'present',
    clockIn: '',
    clockOut: '',
    reason: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!membershipId || !form.attendanceDate || !form.reason.trim()) return
    try {
      setSubmitting(true)
      setError('')
      await createRegularizationRequest({
        organizationUserId: membershipId,
        ...form,
      })
      notifyRegularizationUpdated()
      setForm({ attendanceDate: '', requestedStatus: 'present', clockIn: '', clockOut: '', reason: '' })
      onSubmitted?.()
    } catch (err) {
      setError(err?.message || 'Failed to submit request')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormSectionCard title="Request regularization" description="Ask HR to correct a missed or incorrect attendance entry">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input label="Date *" type="date" value={form.attendanceDate} onChange={(e) => set('attendanceDate', e.target.value)} />
          <Select label="Correct status *" value={form.requestedStatus} onChange={(v) => set('requestedStatus', v)} options={STATUS_OPTIONS} allowEmpty={false} />
          <Input label="Clock in" type="time" value={form.clockIn} onChange={(e) => set('clockIn', e.target.value)} />
          <Input label="Clock out" type="time" value={form.clockOut} onChange={(e) => set('clockOut', e.target.value)} />
          <div className="md:col-span-2">
            <Textarea label="Reason *" value={form.reason} onChange={(e) => set('reason', e.target.value)} rows={3} />
          </div>
        </div>
      </FormSectionCard>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button type="submit" className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50" disabled={submitting}>
        {submitting ? 'Submitting…' : 'Submit regularization'}
      </button>
    </form>
  )
}
