'use client'

import { Edit, Trash2 } from 'lucide-react'
import { Button, Modal } from '@webfudge/ui'
import { GoalOverviewPanel } from './PerformanceDetailTabPanels'
import { getGoalScopeLabel } from '../../lib/performancePage'
import { isCustomGoal } from '../../lib/performanceGoalsService'

export default function GoalDetailModal({
  goal,
  open,
  onClose,
  onEdit,
  onDelete,
  deleting = false,
}) {
  if (!goal) return null

  const canModify = isCustomGoal(goal)

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={goal.objective}
      subtitle={goal.reviewCycle || getGoalScopeLabel(goal)}
      size="lg"
    >
      <GoalOverviewPanel goal={goal} />

      <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-gray-200 pt-5">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        <Button
          variant="secondary"
          className="gap-2"
          disabled={!canModify}
          title={canModify ? 'Edit goal' : 'Sample goal cannot be edited'}
          onClick={() => onEdit?.(goal)}
        >
          <Edit className="h-4 w-4" aria-hidden />
          Edit
        </Button>
        <Button
          variant="primary"
          className="gap-2 !bg-red-600 hover:!bg-red-700"
          disabled={deleting || !canModify}
          title={canModify ? 'Delete goal' : 'Sample goal cannot be deleted'}
          onClick={() => onDelete?.(goal)}
        >
          <Trash2 className="h-4 w-4" aria-hidden />
          {deleting ? 'Deleting…' : 'Delete'}
        </Button>
      </div>
    </Modal>
  )
}
