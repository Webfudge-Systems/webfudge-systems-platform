'use client'

import { useState } from 'react'
import { Pencil, Mail, Trash2 } from 'lucide-react'
import { Button, Modal } from '@webfudge/ui'

/** Inline edit / email / delete actions for HR data tables (PM-style orange icons). */
export default function HRTableRowActions({
  onEdit,
  editTitle = 'Edit',
  email,
  onDelete,
  deleteTitle = 'Delete',
  deleteMessage = 'Are you sure? This action cannot be undone.',
  itemName,
}) {
  const [confirmOpen, setConfirmOpen] = useState(false)

  const handleDelete = () => {
    setConfirmOpen(false)
    onDelete?.()
  }

  if (!onEdit && !email && !onDelete) return null

  return (
    <>
      <div className="flex min-w-[120px] items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
        {onEdit ? (
          <Button
            variant="ghost"
            size="sm"
            className="p-2 text-orange-600 hover:bg-orange-50"
            title={editTitle}
            onClick={onEdit}
          >
            <Pencil className="h-4 w-4" />
          </Button>
        ) : null}
        {email ? (
          <Button
            variant="ghost"
            size="sm"
            className="p-2 text-orange-600 hover:bg-orange-50"
            title="Send email"
            onClick={() => {
              window.location.href = `mailto:${email}`
            }}
          >
            <Mail className="h-4 w-4" />
          </Button>
        ) : null}
        {onDelete ? (
          <Button
            variant="ghost"
            size="sm"
            className="p-2 text-red-600 hover:bg-red-50"
            title={deleteTitle}
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      {onDelete ? (
        <Modal
          isOpen={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          title={deleteTitle}
          size="sm"
        >
          <p className="text-sm text-gray-600">
            {deleteMessage}
            {itemName ? (
              <>
                {' '}
                <span className="font-semibold text-gray-900">{itemName}</span>
              </>
            ) : null}
          </p>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              className="!bg-red-600 hover:!bg-red-700"
              onClick={handleDelete}
            >
              Delete
            </Button>
          </div>
        </Modal>
      ) : null}
    </>
  )
}
