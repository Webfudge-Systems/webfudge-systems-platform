'use client';

import { Card } from '@webfudge/ui';
import CRMPageHeader from '../../../../components/CRMPageHeader';

export default function ProjectsBoardPage() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <CRMPageHeader
        title="Project board"
        subtitle="Kanban-style project board"
        breadcrumb={[
          { label: 'Delivery', href: '/delivery' },
          { label: 'Projects', href: '/delivery/projects' },
          { label: 'Board', href: '/delivery/projects/board' },
        ]}
      />
      <Card className="p-6 border border-gray-200">
        <p className="text-gray-600">
          Project board (Kanban) will appear here when connected to your backend.
        </p>
      </Card>
    </div>
  );
}
