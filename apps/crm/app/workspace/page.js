'use client';

import CRMPageHeader from '../../components/CRMPageHeader';
import { PersonalDashboardView } from '../../components/dashboard';
import FollowUpsDueWidget from '../../components/dashboard/FollowUpsDueWidget';
import { canReadCRM } from '../../lib/rbac';

/** Workspace → Overview: my follow-ups, tasks, meetings and assigned leads in one place. */
export default function WorkspaceOverviewPage() {
  const canViewLeads = canReadCRM('leads');
  const canViewMeetings = canReadCRM('meetings');

  return (
    <div className="min-h-full space-y-4 bg-white p-4">
      <CRMPageHeader
        title="Workspace"
        subtitle="Your follow-ups, tasks and meetings"
        breadcrumb={[{ label: 'Workspace', href: '/workspace' }]}
      />
      {canViewLeads ? <FollowUpsDueWidget /> : null}
      <PersonalDashboardView canViewLeads={canViewLeads} canViewMeetings={canViewMeetings} />
    </div>
  );
}
