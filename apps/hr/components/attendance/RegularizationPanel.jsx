'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Badge, Button, Card, EmptyState, Table, Textarea } from '@webfudge/ui'
import {
  approveRegularizationRequest,
  listRegularizationRequests,
  notifyRegularizationUpdated,
  rejectRegularizationRequest,
  REGULARIZATION_UPDATED_EVENT,
} from '../../lib/regularizationSyncService'
import { notifyAttendanceUpdated } from '../../lib/attendanceShared'

const VIEW = {
  PENDING: 'pending',
  HISTORY: 'history',
}

function formatDateLabel(value = '') {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatDateTimeLabel(value = '') {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatRequestedStatus(status = '') {
  const raw = String(status || 'present').toLowerCase()
  if (raw === 'wfh') return 'WFH'
  return raw.charAt(0).toUpperCase() + raw.slice(1)
}

function formatClock(value = '') {
  return value && String(value).trim() ? value : '—'
}

function decisionBadgeVariant(statusRaw = '') {
  if (statusRaw === 'approved') return 'success'
  if (statusRaw === 'rejected') return 'danger'
  return 'warning'
}

export default function RegularizationPanel({ onPendingCountChange }) {
  const [view, setView] = useState(VIEW.PENDING)
  const [pendingRows, setPendingRows] = useState([])
  const [historyRows, setHistoryRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState(null)
  const [actionError, setActionError] = useState('')
  const [loadError, setLoadError] = useState('')
  const [comments, setComments] = useState({})

  const loadPending = useCallback(async () => {
    const data = await listRegularizationRequests({ status: 'pending', limit: 100 })
    setPendingRows(data)
    onPendingCountChange?.(data.length)
    return data
  }, [onPendingCountChange])

  const loadHistory = useCallback(async () => {
    const data = await listRegularizationRequests({ limit: 200 })
    setHistoryRows(data.filter((row) => row.statusRaw !== 'pending'))
    return data
  }, [])

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setLoadError('')
      await Promise.all([loadPending(), loadHistory()])
    } catch (err) {
      setLoadError(err?.message || 'Failed to load regularization requests')
    } finally {
      setLoading(false)
    }
  }, [loadPending, loadHistory])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    const refresh = () => loadData()
    window.addEventListener(REGULARIZATION_UPDATED_EVENT, refresh)
    return () => window.removeEventListener(REGULARIZATION_UPDATED_EVENT, refresh)
  }, [loadData])

  const handleApprove = async (id) => {
    try {
      setActionId(id)
      setActionError('')
      await approveRegularizationRequest(id, comments[id] || '')
      notifyRegularizationUpdated()
      notifyAttendanceUpdated()
      setComments((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
      await loadData()
    } catch (err) {
      setActionError(err?.message || 'Failed to approve request')
    } finally {
      setActionId(null)
    }
  }

  const handleReject = async (id) => {
    try {
      setActionId(id)
      setActionError('')
      await rejectRegularizationRequest(id, comments[id] || '')
      notifyRegularizationUpdated()
      setComments((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
      await loadData()
    } catch (err) {
      setActionError(err?.message || 'Failed to reject request')
    } finally {
      setActionId(null)
    }
  }

  const pendingColumns = useMemo(
    () => [
      { key: 'employeeName', label: 'Employee' },
      { key: 'attendanceDateLabel', label: 'Date' },
      { key: 'requestedStatusLabel', label: 'Requested' },
      { key: 'clockInLabel', label: 'Clock in' },
      { key: 'clockOutLabel', label: 'Clock out' },
      { key: 'reason', label: 'Reason' },
      { key: 'submittedOnLabel', label: 'Submitted' },
      { key: 'commentField', label: 'HR comment' },
      { key: 'actions', label: 'Actions' },
    ],
    [],
  )

  const historyColumns = useMemo(
    () => [
      { key: 'employeeName', label: 'Employee' },
      { key: 'attendanceDateLabel', label: 'Date' },
      { key: 'requestedStatusLabel', label: 'Requested' },
      { key: 'clockInLabel', label: 'Clock in' },
      { key: 'clockOutLabel', label: 'Clock out' },
      { key: 'reason', label: 'Reason' },
      { key: 'decision', label: 'Decision' },
      { key: 'hrCommentLabel', label: 'HR comment' },
      { key: 'submittedOnLabel', label: 'Submitted' },
    ],
    [],
  )

  const pendingData = useMemo(
    () =>
      pendingRows.map((row) => ({
        ...row,
        attendanceDateLabel: formatDateLabel(row.attendanceDate),
        requestedStatusLabel: formatRequestedStatus(row.requestedStatus),
        clockInLabel: formatClock(row.clockIn),
        clockOutLabel: formatClock(row.clockOut),
        submittedOnLabel: formatDateTimeLabel(row.submittedOn),
        commentField: (
          <Textarea
            rows={2}
            value={comments[row.id] || ''}
            onChange={(e) => setComments((prev) => ({ ...prev, [row.id]: e.target.value }))}
            placeholder="Optional comment for employee"
          />
        ),
        actions: (
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="primary"
              className="bg-orange-500 hover:bg-orange-600"
              disabled={actionId === row.id}
              onClick={() => handleApprove(row.id)}
            >
              {actionId === row.id ? 'Approving…' : 'Approve'}
            </Button>
            <Button size="sm" variant="secondary" disabled={actionId === row.id} onClick={() => handleReject(row.id)}>
              {actionId === row.id ? 'Rejecting…' : 'Reject'}
            </Button>
          </div>
        ),
      })),
    [pendingRows, comments, actionId],
  )

  const historyData = useMemo(
    () =>
      historyRows.map((row) => ({
        ...row,
        attendanceDateLabel: formatDateLabel(row.attendanceDate),
        requestedStatusLabel: formatRequestedStatus(row.requestedStatus),
        clockInLabel: formatClock(row.clockIn),
        clockOutLabel: formatClock(row.clockOut),
        submittedOnLabel: formatDateTimeLabel(row.submittedOn),
        hrCommentLabel: row.hrComment || '—',
        decision: <Badge variant={decisionBadgeVariant(row.statusRaw)}>{row.status}</Badge>,
      })),
    [historyRows],
  )

  const activeRows = view === VIEW.PENDING ? pendingData : historyData
  const activeColumns = view === VIEW.PENDING ? pendingColumns : historyColumns

  return (
    <Card variant="elevated" className="space-y-4 rounded-xl p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Attendance regularization</h3>
          <p className="text-sm text-gray-500">
            Review correction requests from the ESS portal. Approving updates the employee&apos;s attendance record.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="warning">{pendingRows.length} pending</Badge>
          <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
            <button
              type="button"
              onClick={() => setView(VIEW.PENDING)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                view === VIEW.PENDING ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Pending
            </button>
            <button
              type="button"
              onClick={() => setView(VIEW.HISTORY)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                view === VIEW.HISTORY ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              History
            </button>
          </div>
        </div>
      </div>

      {loadError ? <p className="text-sm text-red-600">{loadError}</p> : null}
      {actionError ? <p className="text-sm text-red-600">{actionError}</p> : null}

      {loading ? (
        <p className="text-sm text-gray-500">Loading regularization requests…</p>
      ) : activeRows.length ? (
        <Table variant="modernEmbedded" columns={activeColumns} data={activeRows} keyField="id" />
      ) : (
        <EmptyState
          title={view === VIEW.PENDING ? 'No pending regularizations' : 'No processed requests yet'}
          description={
            view === VIEW.PENDING
              ? 'When employees submit correction requests from ESS → Attendance → Regularization, they will appear here for approval.'
              : 'Approved and rejected requests will show up here after you process them.'
          }
        />
      )}
    </Card>
  )
}
