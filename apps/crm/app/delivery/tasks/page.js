'use client';

import { Card, EmptyState } from '@webfudge/ui';
import CRMPageHeader from '../../../components/CRMPageHeader';

export default function TasksPage() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <CRMPageHeader
        title="Tasks"
        subtitle="Manage delivery tasks"
        breadcrumb={[{ label: 'Delivery', href: '/delivery' }, { label: 'Tasks', href: '/delivery/tasks' }]}
      />
      <Card className="border border-gray-200">
        <EmptyState
          title="No tasks yet"
          description="Tasks will appear here when connected to your backend."
        />
      </Card>
    </div>
  );
}
