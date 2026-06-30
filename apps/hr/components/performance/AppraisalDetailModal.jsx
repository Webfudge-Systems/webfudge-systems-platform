'use client'

import { Edit, Trash2 } from 'lucide-react'
import { Button, Modal } from '@webfudge/ui'
import { AppraisalOverviewPanel } from './PerformanceDetailTabPanels'
import { isCustomAppraisal } from '../../lib/performanceAppraisalsService'

export default function AppraisalDetailModal({
  appraisal,
  open,
  onClose,
  onEdit,
  onDelete,
  deleting = false,
}) {
  if (!appraisal) return null

  const canModify = isCustomAppraisal(appraisal)

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={appraisal.employee}
      subtitle={appraisal.department || 'Employee appraisal'}
      size="lg"
    >
      <AppraisalOverviewPanel appraisal={appraisal} />

      <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-gray-200 pt-5">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        <Button variant="secondary" className="gap-2" onClick={() => onEdit?.(appraisal)}>
          <Edit className="h-4 w-4" aria-hidden />
          Edit
        </Button>
        <Button
          variant="primary"
          className="gap-2 !bg-red-600 hover:!bg-red-700"
          disabled={deleting || !canModify}
          title={canModify ? 'Delete appraisal' : 'Sample appraisal cannot be deleted'}
          onClick={() => onDelete?.(appraisal)}
        >
          <Trash2 className="h-4 w-4" aria-hidden />
          {deleting ? 'Deleting…' : 'Delete'}
        </Button>
      </div>
    </Modal>
  )
}
