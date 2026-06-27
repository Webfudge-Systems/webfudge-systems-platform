'use client'

import entityAttachmentService from './api/entityAttachmentService'

export const HR_API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === 'production' ? 'https://api.webfudge.in' : 'http://localhost:1338')

export const entityFilesPanelProps = {
  apiBase: HR_API_BASE,
  listFn: entityAttachmentService.list,
  uploadFn: entityAttachmentService.upload,
  deleteFn: entityAttachmentService.delete,
}
