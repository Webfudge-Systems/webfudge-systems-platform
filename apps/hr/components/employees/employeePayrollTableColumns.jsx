'use client'

import { Eye, Trash2 } from 'lucide-react'
import { Button, TableCellText } from '@webfudge/ui'
import { PayrollAmountCell, PayrollStatusBadge } from '../payroll/PayrollTableCells'

function isPayrollRowLocked(row) {
  const status = String(row?.runStatus || '').toLowerCase()
  return status === 'locked' || status === 'disbursed'
}

export function buildEmployeePayrollColumns(handlers) {
  return [
    {
      key: 'month',
      label: 'MONTH',
      width: 160,
      render: (_, row) => <TableCellText value={row.month} emphasized className="font-medium" />,
    },
    {
      key: 'gross',
      label: 'GROSS',
      width: 120,
      render: (_, row) => <PayrollAmountCell value={row.gross} />,
    },
    {
      key: 'deductions',
      label: 'DEDUCTIONS',
      width: 120,
      render: (_, row) => <PayrollAmountCell value={row.deductions} />,
    },
    {
      key: 'net',
      label: 'NET',
      width: 120,
      render: (_, row) => <PayrollAmountCell value={row.net} emphasized />,
    },
    {
      key: 'status',
      label: 'STATUS',
      width: 110,
      render: (_, row) => <PayrollStatusBadge status={row.status} />,
    },
    {
      key: 'actions',
      label: 'ACTIONS',
      fixed: true,
      resizable: false,
      width: 120,
      headerClassName: 'whitespace-nowrap text-right',
      className: 'whitespace-nowrap text-right align-middle',
      render: (_, row) => {
        const locked = isPayrollRowLocked(row)
        return (
          <div
            className="flex min-w-[100px] shrink-0 items-center justify-end gap-0.5"
            onClick={(event) => event.stopPropagation()}
          >
            <Button
              variant="ghost"
              size="sm"
              className="p-2 text-emerald-600 hover:bg-emerald-50"
              title="View payroll record"
              onClick={() => handlers.onView(row)}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="p-2 text-red-600 hover:bg-red-50 disabled:opacity-40"
              title={locked ? 'Cannot delete locked or paid runs' : 'Remove from payroll run'}
              disabled={locked || handlers.deletingId === row.id}
              onClick={() => handlers.onDelete(row)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )
      },
    },
  ]
}

export function employeePayrollViewHref(row, employee) {
  if (!employee?.id || !row?.lineItemId) return '/payroll'
  return `/employees/${employee.id}/payroll/${row.lineItemId}`
}
