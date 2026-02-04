'use client';

import { Card, EmptyState } from '@webfudge/ui';
import CRMPageHeader from '../../components/CRMPageHeader';

export default function ThreadsPage() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <CRMPageHeader
        title="Conversations"
        subtitle="Comments and threads on leads, deals, and contacts"
        breadcrumb={[{ label: 'Threads', href: '/threads' }]}
      />
      <Card className="border border-gray-200">
        <EmptyState
          title="No conversations yet"
          description="Threads and comments will appear here when connected to your backend."
        />
      </Card>
    </div>
  );
}
