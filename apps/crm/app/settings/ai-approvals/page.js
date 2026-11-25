'use client';

import { AiApprovalQueue, IS_SAAS_PLATFORM } from '@webfudge/ui';
import CRMPageHeader from '../../../components/CRMPageHeader';
import strapiClient from '../../../lib/strapiClient';

const BREADCRUMB = [
  { label: 'Settings', href: '/settings' },
  { label: 'AI approvals', href: '/settings/ai-approvals' },
];

// AiApprovalQueue passes '/api/...' paths; strapiClient adds the /api prefix itself.
const request = (path, { method = 'GET', body } = {}) => strapiClient.request(path.replace(/^\/api/, ''), { method, body });

/** Fudge AI approval queue (P5) for Grow: AI-drafted emails wait here until someone approves them. SaaS only. */
export default function AiApprovalsPage() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <CRMPageHeader title="AI approvals" subtitle="Review what Fudge AI drafted before anything is sent to a lead." breadcrumb={BREADCRUMB} />
      {IS_SAAS_PLATFORM ? (
        <AiApprovalQueue request={request} app="crm" />
      ) : (
        <p className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-600">Fudge AI is available on Webfudge SaaS.</p>
      )}
    </div>
  );
}
