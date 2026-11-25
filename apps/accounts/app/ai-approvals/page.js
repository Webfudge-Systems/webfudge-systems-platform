'use client'

import { useCallback } from 'react'
import { AiApprovalQueue } from '@webfudge/ui'
import { useHub } from '../../components/saas/HubShell'
import { Alert, LoadingBlock, PageFrame } from '../../components/saas/console'
import { api, IS_SAAS } from '../../lib/saas'

/** Fudge AI approval queue (P5): outbound messages the AI drafted, waiting for a person. SaaS only. */
export default function AiApprovalsPage() {
  const { currentOrg: org, error } = useHub()
  const request = useCallback((path, opts = {}) => api(path, { ...opts, orgId: org?.id }), [org?.id])

  const header = {
    title: 'AI approvals',
    subtitle: 'Review what Fudge AI drafted before anything is sent.',
    breadcrumb: [{ label: 'AI approvals', href: '/ai-approvals' }],
  }

  if (!IS_SAAS) return <PageFrame {...header}><Alert tone="info">Fudge AI is available on Webfudge SaaS.</Alert></PageFrame>
  if (!org) return <PageFrame {...header}>{error ? <Alert>{error}</Alert> : <LoadingBlock />}</PageFrame>

  return (
    <PageFrame {...header}>
      <AiApprovalQueue key={org.id} request={request} />
    </PageFrame>
  )
}
