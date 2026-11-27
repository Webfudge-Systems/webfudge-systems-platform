'use client';

import { useEffect, useState } from 'react';
import PMPageHeader from '../../components/PMPageHeader';
import DocsList from '../../components/docs/DocsList';
import strapiClient from '../../lib/strapiClient';
import workspaceService from '../../lib/api/workspaceService';

/** Documents (W8): every doc the user can see, across projects and workspaces. */
export default function DocsPage() {
  const [projects, setProjects] = useState([]);
  const [workspaces, setWorkspaces] = useState([]);

  useEffect(() => {
    strapiClient
      .get('/projects', { 'pagination[pageSize]': 200, sort: 'name:asc', 'fields[0]': 'name' })
      .then((res) => setProjects((res?.data || []).map((p) => ({ id: p.id, name: p.name ?? p.attributes?.name })).filter((p) => p.name)))
      .catch(() => setProjects([]));
    workspaceService
      .list()
      .then(({ items }) => setWorkspaces(items.map((w) => ({ id: w.id, name: w.name }))))
      .catch(() => setWorkspaces([]));
  }, []);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PMPageHeader
        title="Documents"
        subtitle="Project briefs, SOPs and meeting notes. Mention teammates, link tasks and turn any line into a task."
        breadcrumb={[
          { label: 'Dashboard', href: '/' },
          { label: 'Documents', href: '/docs' },
        ]}
      />
      <DocsList projects={projects} workspaces={workspaces} />
    </div>
  );
}
