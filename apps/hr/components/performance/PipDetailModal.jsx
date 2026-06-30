'use client'

import { Edit, Trash2 } from 'lucide-react'
import { Button, Modal } from '@webfudge/ui'
import { PipOverviewPanel } from './PerformanceDetailTabPanels'
import { isCustomPip } from '../../lib/performancePipsService'

export default function PipDetailModal({
  pip,
  open,
  onClose,
  onEdit,
  onDelete,
  deleting = false,
}) {
  if (!pip) return null

  const canModify = isCustomPip(pip)

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={pip.employee}
      subtitle={`Manager: ${pip.manager || '—'}`}
      size="lg"
    >
      <PipOverviewPanel pip={pip} />

      <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-gray-200 pt-5">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        <Button variant="secondary" className="gap-2" onClick={() => onEdit?.(pip)}>
          <Edit className="h-4 w-4" aria-hidden />
          Edit
        </Button>
        <Button
          variant="primary"
          className="gap-2 !bg-red-600 hover:!bg-red-700"
          disabled={deleting || !canModify}
          title={canModify ? 'Delete PIP' : 'Sample PIP cannot be deleted'}
          onClick={() => onDelete?.(pip)}
        >
          <Trash2 className="h-4 w-4" aria-hidden />
          {deleting ? 'Deleting…' : 'Delete'}
        </Button>
      </div>
    </Modal>
  )
}
