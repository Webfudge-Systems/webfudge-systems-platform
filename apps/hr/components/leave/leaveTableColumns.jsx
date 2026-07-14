'use client'

import { Eye, Trash2, Check, X } from 'lucide-react'
import { Button, TableCellCreated, TableCellText } from '@webfudge/ui'
import {
  LeaveEmployeeCell,
  LeaveTypeCell,
  LeaveTextCell,
  LeaveStatusPill,
} from './LeaveTableCells'

export function leaveEmployeeColumn() {
  return {
    key: 'employee',
    label: 'EMPLOYEE',
    fixed: true,
    render: (_, row) => <LeaveEmployeeCell row={row} />,
  }
}

export function leaveTypeColumn({ visibilityKey } = {}) {
  return {
    key: 'type',
    ...(visibilityKey ? { visibilityKey } : {}),
    label: 'TYPE',
    render: (_, row) => <LeaveTypeCell type={row.type} />,
  }
}

export function leaveFromColumn({ visibilityKey } = {}) {
  return {
    key: 'from',
    ...(visibilityKey ? { visibilityKey } : {}),
    label: 'FROM',
    render: (_, row) => <TableCellCreated dateString={row.from} dateMode="calendar" />,
  }
}

export function leaveToColumn({ visibilityKey } = {}) {
  return {
    key: 'to',
    ...(visibilityKey ? { visibilityKey } : {}),
    label: 'TO',
    render: (_, row) => <TableCellCreated dateString={row.to} dateMode="calendar" />,
  }
}

export function leaveDaysColumn({ visibilityKey } = {}) {
  return {
    key: 'days',
    ...(visibilityKey ? { visibilityKey } : {}),
    label: 'DAYS',
    render: (_, row) => <LeaveTextCell value={String(row.days)} emphasized />,
  }
}

export function leaveStatusColumn({ visibilityKey, useDeniedLabel = false } = {}) {
  return {
    key: 'status',
    ...(visibilityKey ? { visibilityKey } : {}),
    label: 'STATUS',
    render: (_, row) => (
      <LeaveStatusPill status={row.status} useDeniedLabel={useDeniedLabel} />
    ),
  }
}

export function leaveBalanceMetricColumn(key, label, { emphasized = false, visibilityKey } = {}) {
  return {
    key,
    ...(visibilityKey ? { visibilityKey } : {}),
    label,
    render: (_, row) => {
      const used = Number(row.used?.[key] ?? 0)
      const total = Number(row.totals?.[key] ?? 0)
      return <LeaveTextCell value={`${used}/${total}`} emphasized={emphasized} />
    },
  }
}

export function leavePolicyNameColumn() {
  return {
    key: 'name',
    label: 'POLICY',
    fixed: true,
    render: (_, row) => <TableCellText value={row.name} emphasized />,
  }
}

export function leavePolicyEntitlementColumn({ visibilityKey } = {}) {
  return {
    key: 'entitlement',
    ...(visibilityKey ? { visibilityKey } : {}),
    label: 'ENTITLEMENT',
    render: (_, row) => <LeaveTextCell value={`${row.entitlement}/yr`} emphasized />,
  }
}

export function leavePolicyCarryForwardColumn({ visibilityKey } = {}) {
  return {
    key: 'carryForward',
    ...(visibilityKey ? { visibilityKey } : {}),
    label: 'CARRY FORWARD',
    render: (_, row) => <LeaveTextCell value={String(row.carryForward)} />,
  }
}

export function leavePolicyEncashableColumn({ visibilityKey } = {}) {
  return {
    key: 'encashable',
    ...(visibilityKey ? { visibilityKey } : {}),
    label: 'ENCASHABLE',
    render: (_, row) => <LeaveTextCell value={row.encashable ? 'Yes' : 'No'} />,
  }
}

export function buildLeaveRequestColumns(handlers) {
  return [
    leaveEmployeeColumn(),
    leaveTypeColumn({ visibilityKey: 'type' }),
    leaveFromColumn({ visibilityKey: 'from' }),
    leaveToColumn({ visibilityKey: 'to' }),
    leaveDaysColumn({ visibilityKey: 'days' }),
    leaveStatusColumn({ visibilityKey: 'status', useDeniedLabel: handlers.useDeniedLabel }),
    {
      key: 'actions',
      label: 'ACTIONS',
      fixed: true,
      resizable: false,
      width: 160,
      render: (_, row) => (
        <div className="flex justify-end gap-0.5" onClick={(event) => event.stopPropagation()}>
          {row.status === 'Pending' ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="p-2 text-emerald-600 hover:bg-emerald-50"
                title="Approve"
                disabled={handlers.actionId === row.id}
                onClick={() => handlers.onApprove(row.id)}
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="p-2 text-red-600 hover:bg-red-50"
                title="Reject"
                disabled={handlers.actionId === row.id}
                onClick={() => handlers.onReject(row.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </>
          ) : null}
          {handlers.showApprovedTabActions && row.status === 'Approved' ? (
            <Button
              variant="ghost"
              size="sm"
              className="p-2 text-red-600 hover:bg-red-50"
              title="Mark as denied"
              disabled={handlers.actionId === row.id}
              onClick={() => handlers.onReject(row.id)}
            >
              <X className="h-4 w-4" />
            </Button>
          ) : null}
          {handlers.showApprovedTabActions && row.status === 'Rejected' ? (
            <Button
              variant="ghost"
              size="sm"
              className="p-2 text-emerald-600 hover:bg-emerald-50"
              title="Mark as approved"
              disabled={handlers.actionId === row.id}
              onClick={() => handlers.onApprove(row.id)}
            >
              <Check className="h-4 w-4" />
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="sm"
            className="p-2 text-emerald-600 hover:bg-emerald-50"
            title="View details"
            onClick={() => handlers.onView(row)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="p-2 text-red-600 hover:bg-red-50"
            title="Delete request"
            disabled={handlers.actionId === row.id}
            onClick={() => handlers.onDelete(row)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ]
}

export function buildLeaveBalanceColumns() {
  return [
    leaveEmployeeColumn(),
    leaveBalanceMetricColumn('cl', 'CL', { emphasized: true, visibilityKey: 'cl' }),
    leaveBalanceMetricColumn('sl', 'SL', { visibilityKey: 'sl' }),
    leaveBalanceMetricColumn('pl', 'PL', { visibilityKey: 'pl' }),
    leaveBalanceMetricColumn('compOff', 'COMP-OFF', { visibilityKey: 'compOff' }),
    leaveBalanceMetricColumn('lop', 'LOP', { visibilityKey: 'lop' }),
  ]
}

export function buildLeavePolicyColumns() {
  return [
    leavePolicyNameColumn(),
    leaveTypeColumn({ visibilityKey: 'type' }),
    leavePolicyEntitlementColumn({ visibilityKey: 'entitlement' }),
    leavePolicyCarryForwardColumn({ visibilityKey: 'carryForward' }),
    leavePolicyEncashableColumn({ visibilityKey: 'encashable' }),
  ]
}

export function resolveVisibleLeaveColumns(
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
