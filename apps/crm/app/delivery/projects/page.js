'use client';

import Link from 'next/link';
import { Card, EmptyState, Button } from '@webfudge/ui';
import CRMPageHeader from '../../../components/CRMPageHeader';

export default function ProjectsPage() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <CRMPageHeader
        title="Projects"
        subtitle="Manage delivery projects"
        breadcrumb={[{ label: 'Delivery', href: '/delivery' }, { label: 'Projects', href: '/delivery/projects' }]}
      >
        <Link href="/delivery/projects/board">
          <Button variant="outline">Board view</Button>
        </Link>
      </CRMPageHeader>
      <Card className="border border-gray-200">
        <EmptyState
          title="No projects yet"
          description="Projects will appear here when connected to your backend."
          action={
            <Link href="/delivery/projects/board">
              <Button variant="primary">Open board</Button>
            </Link>
          }
        />
      </Card>
    </div>
  );
}
