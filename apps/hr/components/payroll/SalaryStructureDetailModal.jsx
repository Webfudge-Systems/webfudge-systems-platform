'use client'

import { Edit, Trash2 } from 'lucide-react'
import { Button, Modal } from '@webfudge/ui'
import { PayrollStructureOverviewPanel } from './PayrollDetailTabPanels'
import { formatPayrollInr } from '../../lib/payrollPage'

export default function SalaryStructureDetailModal({
  structure,
  open,
  onClose,
  onEdit,
  onDelete,
  deleting = false,
}) {
  if (!structure) return null

  const ctc = Number(structure.ctc || 0)

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={structure.name}
      subtitle={ctc ? `Annual CTC ${formatPayrollInr(ctc)}` : 'Salary structure details'}
      size="lg"
    >
      <PayrollStructureOverviewPanel structure={structure} />

      <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-gray-200 pt-5">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        <Button variant="secondary" className="gap-2" onClick={() => onEdit?.(structure)}>
          <Edit className="h-4 w-4" aria-hidden />
          Edit
        </Button>
        <Button
          variant="primary"
          className="gap-2 !bg-red-600 hover:!bg-red-700"
          disabled={deleting}
          onClick={() => onDelete?.(structure)}
        >
          <Trash2 className="h-4 w-4" aria-hidden />
          {deleting ? 'Deleting…' : 'Delete'}
        </Button>
      </div>
    </Modal>
  )
}
