'use client'

import { CalendarDays } from 'lucide-react'
import { Button, FormSectionCard, Modal } from '@webfudge/ui'
import { LeaveStatusPill, LeaveTypeCell } from './LeaveTableCells'

function DetailRow({ label, value }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50/80 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-gray-900">{value || '—'}</p>
    </div>
  )
}

export default function LeaveRequestDetailModal({ open, onClose, request, onApprove, onReject, actionId }) {
  if (!request) return null

  const isPending = request.status === 'Pending'

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="Leave request"
      subtitle={request.employeeName}
      size="lg"
    >
      <FormSectionCard icon={CalendarDays} title="Request details" description="Review leave application">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <LeaveTypeCell type={request.type} />
          <LeaveStatusPill status={request.status} />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <DetailRow label="Employee" value={request.employeeName} />
          <DetailRow label="Employee ID" value={request.employeeCode || request.employeeId} />
          <DetailRow label="Department" value={request.department} />
          <DetailRow label="Days" value={String(request.days)} />
          <DetailRow label="From" value={request.from} />
          <DetailRow label="To" value={request.to} />
          <DetailRow label="Applied on" value={request.appliedOn} />
          <DetailRow label="Reason" value={request.reason || '—'} />
          {request.rejectionReason ? (
            <div className="sm:col-span-2">
              <DetailRow label="Rejection reason" value={request.rejectionReason} />
            </div>
          ) : null}
        </div>
      </FormSectionCard>

      <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-gray-200 pt-5">
        <Button type="button" variant="outline" onClick={onClose}>
          Close
        </Button>
        {isPending && onReject ? (
          <Button
            type="button"
            variant="outline"
            className="text-red-600 hover:bg-red-50"
            disabled={actionId === request.id}
            onClick={() => onReject(request.id)}
          >
            Reject
          </Button>
        ) : null}
        {isPending && onApprove ? (
          <Button
            type="button"
            className="bg-orange-500 hover:bg-orange-600"
            disabled={actionId === request.id}
            onClick={() => onApprove(request.id)}
          >
            {actionId === request.id ? 'Approving…' : 'Approve'}
          </Button>
        ) : null}
      </div>
    </Modal>
  )
}
