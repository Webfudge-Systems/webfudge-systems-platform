'use client'

import Link from 'next/link'
import { Edit } from 'lucide-react'
import { Button, Modal } from '@webfudge/ui'
import PayrollRecordForm, { payrollRecordToForm } from './PayrollRecordForm'

import { getPayrollRecordTableStatus } from '../../lib/payrollShared'

export default function PayrollRecordDetailModal({
  record,
  month,
  open,
  onClose,
  onEdit,
  readOnlyRun = false,
}) {
  if (!record) return null

  const form = payrollRecordToForm({
    ...record,
    missingSalaryStructure: record.missingSalaryStructure,
    missingBankDetails: record.missingBankDetails,
    status: getPayrollRecordTableStatus(record),
  })

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={record.name}
      subtitle={`${record.employeeId || '—'} · ${month || 'Payroll run'}`}
      size="xl"
    >
      <div className="space-y-5">
        <PayrollRecordForm form={form} onChange={() => {}} readOnly month={month} />

        {record.employeeRefId ? (
          <div className="flex justify-start">
            <Link
              href={`/employees/${record.employeeRefId}`}
              className="text-sm font-medium text-orange-600 hover:text-orange-700 hover:underline"
            >
              View employee profile
            </Link>
          </div>
        ) : null}

        <div className="flex flex-wrap justify-end gap-2 border-t border-gray-200 pt-5">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="secondary"
            className="gap-2"
            disabled={readOnlyRun}
            onClick={() => onEdit?.(record)}
          >
            <Edit className="h-4 w-4" aria-hidden />
            Edit
          </Button>
        </div>
      </div>
    </Modal>
  )
}
