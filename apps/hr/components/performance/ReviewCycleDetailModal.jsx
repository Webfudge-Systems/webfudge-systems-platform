'use client'

import { Edit, Trash2 } from 'lucide-react'
import { Button, Modal } from '@webfudge/ui'
import { ReviewCycleOverviewPanel } from './PerformanceDetailTabPanels'
import { isCustomReviewCycle } from '../../lib/performanceReviewsService'

export default function ReviewCycleDetailModal({
  cycle,
  open,
  onClose,
  onEdit,
  onDelete,
  deleting = false,
}) {
  if (!cycle) return null

  const canModify = isCustomReviewCycle(cycle)

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={cycle.name}
      subtitle={cycle.period}
      size="lg"
    >
      <ReviewCycleOverviewPanel cycle={cycle} />

      <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-gray-200 pt-5">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        <Button
          variant="secondary"
          className="gap-2"
          disabled={!canModify}
          title={canModify ? 'Edit review cycle' : 'Sample cycle cannot be edited'}
          onClick={() => onEdit?.(cycle)}
        >
          <Edit className="h-4 w-4" aria-hidden />
          Edit
        </Button>
        <Button
          variant="primary"
          className="gap-2 !bg-red-600 hover:!bg-red-700"
          disabled={deleting || !canModify}
          title={canModify ? 'Delete review cycle' : 'Sample cycle cannot be deleted'}
          onClick={() => onDelete?.(cycle)}
        >
          <Trash2 className="h-4 w-4" aria-hidden />
          {deleting ? 'Deleting…' : 'Delete'}
        </Button>
      </div>
    </Modal>
  )
}
