'use client'

import { Edit, MessageSquare, Trash2 } from 'lucide-react'
import { Button, Modal } from '@webfudge/ui'
import {
  PendingFeedbackOverviewPanel,
  ReceivedFeedbackOverviewPanel,
} from './PerformanceDetailTabPanels'
import { isCustomFeedbackItem } from '../../lib/performanceFeedbackService'

export default function FeedbackDetailModal({
  item,
  open,
  onClose,
  onEdit,
  onGiveFeedback,
  onDelete,
  deleting = false,
}) {
  if (!item) return null

  const isPending = item.kind === 'pending'
  const canModify = isCustomFeedbackItem(item)

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={isPending ? item.label : 'Received feedback'}
      subtitle={isPending ? item.reviewCycle || item.type : item.period}
      size="lg"
    >
      {isPending ? (
        <PendingFeedbackOverviewPanel item={item} />
      ) : (
        <ReceivedFeedbackOverviewPanel item={item} />
      )}

      <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-gray-200 pt-5">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        {isPending ? (
          <Button variant="primary" className="gap-2" onClick={() => onGiveFeedback?.(item)}>
            <MessageSquare className="h-4 w-4" aria-hidden />
            Give Feedback
          </Button>
        ) : null}
        <Button
          variant="secondary"
          className="gap-2"
          disabled={!canModify}
          title={canModify ? 'Edit feedback' : 'Sample feedback cannot be edited'}
          onClick={() => onEdit?.(item)}
        >
          <Edit className="h-4 w-4" aria-hidden />
          Edit
        </Button>
        <Button
          variant="primary"
          className="gap-2 !bg-red-600 hover:!bg-red-700"
          disabled={deleting || (!canModify && !isPending)}
          title={
            isPending
              ? 'Remove feedback request'
              : canModify
                ? 'Delete feedback'
                : 'Sample feedback cannot be deleted'
          }
          onClick={() => onDelete?.(item)}
        >
          <Trash2 className="h-4 w-4" aria-hidden />
          {deleting ? 'Deleting…' : 'Delete'}
        </Button>
      </div>
    </Modal>
  )
}
