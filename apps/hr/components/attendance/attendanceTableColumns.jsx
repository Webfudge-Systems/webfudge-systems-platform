'use client'

import { Clock, Trash2, UserCheck, UserX, Check } from 'lucide-react'
import { Button, TableCellCreated } from '@webfudge/ui'
import {
  AttendanceEmployeeCell,
  AttendanceTextCell,
  AttendanceAmountCell,
  AttendanceStatusPill,
  AttendanceLocationCell,
  AttendanceShiftCell,
} from './AttendanceTableCells'
import { isAttendanceOnLeave } from '../../lib/attendanceShared'

const ACTIONS_COLUMN = {
  fixed: true,
  resizable: false,
  width: 140,
}

export function attendanceEmployeeColumn() {
  return {
    key: 'employee',
    label: 'EMPLOYEE',
    fixed: true,
    render: (_, row) => <AttendanceEmployeeCell row={row} />,
  }
}

export function attendanceDateColumn({ key = 'date', dateField = 'attendanceDate', visibilityKey } = {}) {
  return {
    key,
    ...(visibilityKey ? { visibilityKey } : {}),
    label: 'DATE',
    render: (_, row) => <TableCellCreated dateString={row[dateField]} dateMode="calendar" />,
  }
}

export function attendanceClockInColumn({ visibilityKey } = {}) {
  return {
    key: 'clockIn',
    ...(visibilityKey ? { visibilityKey } : {}),
    label: 'IN',
    render: (_, row) => <AttendanceTextCell value={row.clockIn} emphasized />,
  }
}

export function attendanceClockOutColumn({ visibilityKey } = {}) {
  return {
    key: 'clockOut',
    ...(visibilityKey ? { visibilityKey } : {}),
    label: 'OUT',
    render: (_, row) => <AttendanceTextCell value={row.clockOut} />,
  }
}

export function attendanceDurationColumn({ visibilityKey } = {}) {
  return {
    key: 'duration',
    ...(visibilityKey ? { visibilityKey } : {}),
    label: 'DURATION',
    render: (_, row) => <AttendanceTextCell value={row.duration} />,
  }
}

export function attendanceStatusColumn({ visibilityKey } = {}) {
  return {
    key: 'status',
    ...(visibilityKey ? { visibilityKey } : {}),
    label: 'STATUS',
    render: (_, row) => <AttendanceStatusPill status={row.status} />,
  }
}

export function attendanceLocationColumn({ visibilityKey } = {}) {
  return {
    key: 'location',
    ...(visibilityKey ? { visibilityKey } : {}),
    label: 'LOCATION',
    render: (_, row) => <AttendanceLocationCell location={row.location} />,
  }
}

export function attendanceOvertimeHoursColumn({ visibilityKey } = {}) {
  return {
    key: 'ot',
    ...(visibilityKey ? { visibilityKey } : {}),
    label: 'OT HRS',
    render: (_, row) => <AttendanceTextCell value={String(row.ot)} emphasized />,
  }
}

export function attendanceAmountColumn({ visibilityKey } = {}) {
  return {
    key: 'amount',
    ...(visibilityKey ? { visibilityKey } : {}),
    label: 'AMOUNT',
    render: (_, row) => <AttendanceAmountCell value={row.amount} />,
  }
}

export function attendanceShiftColumn() {
  return {
    key: 'shift',
    label: 'SHIFT',
    fixed: true,
    render: (_, row) => <AttendanceShiftCell row={row} />,
  }
}

export function attendanceShiftTimingColumn({ visibilityKey } = {}) {
  return {
    key: 'timing',
    ...(visibilityKey ? { visibilityKey } : {}),
    label: 'TIMING',
    render: (_, row) => <AttendanceTextCell value={row.timing} emphasized />,
  }
}

export function attendanceAssignedColumn({ visibilityKey } = {}) {
  return {
    key: 'employees',
    ...(visibilityKey ? { visibilityKey } : {}),
    label: 'ASSIGNED',
    render: (_, row) => <AttendanceTextCell value={row.assignedLabel} emphasized />,
  }
}

export function buildTodayAttendanceActionsColumn({
  actionId,
  onQuickMark,
  onOpenMarkModal,
  onDelete,
}) {
  return {
    key: 'actions',
    label: 'ACTIONS',
    ...ACTIONS_COLUMN,
    render: (_, row) => {
      const rowKey = row.id || row.organizationUserId || row.employeeId
      const busy = actionId === rowKey
      const onLeave = isAttendanceOnLeave(row)

      if (onLeave) {
        return (
          <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
            <span
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-amber-900"
              title="Approved leave — auto-detected from Leave module"
            >
              <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
              On leave
            </span>
          </div>
        )
      }

      return (
        <div className="flex justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="sm"
            className="p-2 text-emerald-600 hover:bg-emerald-50"
            title="Mark present"
            disabled={busy}
            onClick={() => onQuickMark(row, 'present')}
          >
            <UserCheck className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="p-2 text-red-600 hover:bg-red-50"
            title="Mark absent"
            disabled={busy}
            onClick={() => onQuickMark(row, 'absent')}
          >
            <UserX className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="p-2 text-orange-600 hover:bg-orange-50"
            title="Mark attendance (full form)"
            disabled={busy}
            onClick={() => onOpenMarkModal(row)}
          >
            <Clock className="h-4 w-4" />
          </Button>
          {row.id ? (
            <Button
              variant="ghost"
              size="sm"
              className="p-2 text-red-600 hover:bg-red-50"
              title="Delete"
              disabled={busy}
              onClick={() => onDelete(row)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      )
    },
  }
}

export function buildOvertimeActionsColumn({ actionId, onApprove, onDelete }) {
  return {
    key: 'actions',
    label: 'ACTIONS',
    ...ACTIONS_COLUMN,
    render: (_, row) => (
      <div className="flex justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
        {row.statusRaw === 'pending' ? (
          <Button
            variant="ghost"
            size="sm"
            className="p-2 text-emerald-600 hover:bg-emerald-50"
            title="Approve overtime"
            disabled={actionId === row.id}
            onClick={() => onApprove(row.id)}
          >
            <Check className="h-4 w-4" />
          </Button>
        ) : null}
        <Button
          variant="ghost"
          size="sm"
          className="p-2 text-red-600 hover:bg-red-50"
          title="Delete overtime"
          disabled={actionId === row.id}
          onClick={() => onDelete(row.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    ),
  }
}

export function buildTodayAttendanceColumns(handlers) {
  return [
    attendanceEmployeeColumn(),
    attendanceClockInColumn({ visibilityKey: 'clockIn' }),
    attendanceClockOutColumn({ visibilityKey: 'clockOut' }),
    attendanceDurationColumn({ visibilityKey: 'duration' }),
    attendanceStatusColumn({ visibilityKey: 'status' }),
    attendanceLocationColumn({ visibilityKey: 'location' }),
    buildTodayAttendanceActionsColumn(handlers),
  ]
}

export function buildMonthlyAttendanceColumns(handlers) {
  return [
    attendanceEmployeeColumn(),
    attendanceDateColumn({ visibilityKey: 'date' }),
    attendanceClockInColumn({ visibilityKey: 'clockIn' }),
    attendanceClockOutColumn({ visibilityKey: 'clockOut' }),
    attendanceDurationColumn({ visibilityKey: 'duration' }),
    attendanceStatusColumn({ visibilityKey: 'status' }),
    attendanceLocationColumn({ visibilityKey: 'location' }),
    buildTodayAttendanceActionsColumn(handlers),
  ]
}

export function resolveVisibleAttendanceColumns(
  columns,
  columnOrder,
  columnVisibility,
  bindSortableColumns,
  sortableKeys,
  fixedColumnKey = 'employee',
) {
  const byKey = Object.fromEntries(columns.map((column) => [column.key, column]))
  const visible = []
  if (byKey[fixedColumnKey]) visible.push(byKey[fixedColumnKey])
  for (const key of columnOrder) {
    const column = byKey[key]
    if (!column?.visibilityKey || !columnVisibility[column.visibilityKey]) continue
    visible.push(column)
  }
  if (byKey.actions) visible.push(byKey.actions)
  return bindSortableColumns(visible, sortableKeys)
}

export function buildOvertimeColumns(handlers) {
  return [
    attendanceEmployeeColumn(),
    attendanceDateColumn({ dateField: 'date', visibilityKey: 'date' }),
    attendanceOvertimeHoursColumn({ visibilityKey: 'ot' }),
    attendanceAmountColumn({ visibilityKey: 'amount' }),
    attendanceStatusColumn({ visibilityKey: 'status' }),
    buildOvertimeActionsColumn(handlers),
  ]
}

export function buildShiftColumns() {
  return [
    attendanceShiftColumn(),
    attendanceShiftTimingColumn({ visibilityKey: 'timing' }),
    attendanceAssignedColumn({ visibilityKey: 'employees' }),
    attendanceStatusColumn({ visibilityKey: 'status' }),
  ]
}
