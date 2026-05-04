'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Card,
  Button,
  Input,
  Textarea,
  Select,
  LoadingSpinner,
} from '@webfudge/ui';
import {
  ArrowLeft,
  Save,
  FolderOpen,
  CalendarDays,
  DollarSign,
} from 'lucide-react';
import PMPageHeader from '../../../../components/PMPageHeader';
import projectService from '../../../../lib/api/projectService';
import strapiClient from '../../../../lib/strapiClient';
import { fetchPmAssignableUsers } from '../../../../lib/api/messageService';
import { transformProject, transformUser } from '../../../../lib/api/dataTransformers';

const STATUS_OPTIONS = [
  { value: 'PLANNING', label: 'Planning' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'ON_HOLD', label: 'On Hold' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export default function EditProjectPage() {
  const params = useParams();
  const router = useRouter();
  const slug = Array.isArray(params?.slug) ? params.slug[0] : params?.slug;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [projectId, setProjectId] = useState(null);
  const [projectSlug, setProjectSlug] = useState('');
  const [errors, setErrors] = useState({});

  const [allUsers, setAllUsers] = useState([]);
  const [clients, setClients] = useState([]);

  const [form, setForm] = useState({
    name: '',
    description: '',
    status: 'PLANNING',
    startDate: '',
    endDate: '',
    budget: '',
    clientId: '',
    projectManagerId: '',
    teamMemberIds: [],
  });

  const loadUsersAndClients = useCallback(async () => {
    try {
      const [usersRes, clientsRes] = await Promise.allSettled([
        fetchPmAssignableUsers(),
        strapiClient.request('/lead-companies?pagination[pageSize]=100', { method: 'GET' }),
      ]);
      if (usersRes.status === 'fulfilled') {
        const raw = usersRes.value || [];
        setAllUsers(raw.map(transformUser).filter(Boolean));
      }
      if (clientsRes.status === 'fulfilled') {
        const body = clientsRes.value;
        setClients(body?.data || []);
      }
    } catch {}
  }, []);

  useEffect(() => {
    loadUsersAndClients();
  }, [loadUsersAndClients]);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        let res;
        if (/^\d+$/.test(String(slug))) {
          res = await projectService.getProjectById(slug);
        } else {
          res = await projectService.getProjectBySlug(slug);
        }
        const raw = res?.data;
        if (!cancelled && raw) {
          const p = transformProject(raw);
          setProjectId(p.id);
          setProjectSlug(p.slug || String(p.id));
          setForm({
            name: p.name || '',
            description: p.description || '',
            status: p.strapiStatus || 'PLANNING',
            startDate: p.startDate ? p.startDate.slice(0, 10) : '',
            endDate: p.endDate ? p.endDate.slice(0, 10) : '',
            budget: p.budget != null && p.budget !== '' ? String(p.budget) : '',
            clientId: p.clientAccountId ? String(p.clientAccountId) : '',
            projectManagerId: p.projectManager?.id ? String(p.projectManager.id) : '',
            teamMemberIds: (p.team || []).map((m) => String(m.id)),
          });
        }
      } catch (e) {
        console.error('Load project for edit:', e);
        if (!cancelled) setProjectId(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Project name is required';
    if (form.startDate && form.endDate && form.endDate < form.startDate) {
      errs.endDate = 'End date must be after start date';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleTeamToggle = (userId) => {
    setForm((prev) => {
      const ids = prev.teamMemberIds.includes(userId)
        ? prev.teamMemberIds.filter((id) => id !== userId)
        : [...prev.teamMemberIds, userId];
      return { ...prev, teamMemberIds: ids };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate() || !projectId) return;
    try {
      setSaving(true);
      setErrors((prev) => ({ ...prev, submit: '' }));
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        status: form.status,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        budget: form.budget ? Number(form.budget) : null,
      };
      if (form.projectManagerId) payload.projectManager = Number(form.projectManagerId);
      else payload.projectManager = null;
      if (form.clientId) payload.clientAccount = Number(form.clientId);
      else payload.clientAccount = null;
      payload.teamMembers = form.teamMemberIds.map(Number);

      await projectService.updateProject(projectId, payload);
      router.push(`/projects/${projectSlug || projectId}`);
    } catch (err) {
      console.error('Update project error:', err);
      setErrors({ submit: 'Failed to save project. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const userOptions = allUsers.map((u) => ({
    value: String(u.id),
    label: u.name || u.username || u.email || `User ${u.id}`,
  }));

  const clientOptions = clients.map((c) => {
    const attrs = c.attributes || c;
    return {
      value: String(c.id),
      label: attrs.name || attrs.companyName || `Client ${c.id}`,
    };
  });

  const detailHref = `/projects/${projectSlug || slug || projectId || ''}`;

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <PMPageHeader title="Loading..." breadcrumb={[{ label: 'PM', href: '/' }, { label: 'Projects', href: '/projects' }]} showProfile />
        <Card variant="elevated" className="flex justify-center p-12">
          <LoadingSpinner message="Loading project..." />
        </Card>
      </div>
    );
  }

  if (!projectId) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <PMPageHeader title="Project not found" breadcrumb={[{ label: 'PM', href: '/' }, { label: 'Projects', href: '/projects' }]} showProfile />
        <Card variant="elevated" className="p-12 text-center">
          <p className="text-gray-600">This project may have been deleted or moved.</p>
          <Link href="/projects" className="mt-4 inline-block">
            <Button variant="primary">Back to projects</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PMPageHeader
        title="Edit project"
        subtitle="Update project details, timeline, team, and client"
        showProfile
        breadcrumb={[
          { label: 'PM', href: '/' },
          { label: 'Projects', href: '/projects' },
          { label: form.name || 'Project', href: detailHref },
          { label: 'Edit', href: '#' },
        ]}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {errors.submit ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{errors.submit}</div>
        ) : null}

        <Card
          title={
            <span className="inline-flex items-center gap-3">
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-orange-500">
                <FolderOpen className="h-4 w-4 text-white" />
              </span>
              <span>Project information</span>
            </span>
          }
          subtitle="Basic information about the project"
          variant="default"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Input
                label="Project name"
                required
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                error={errors.name}
                placeholder="Enter project name"
              />
              <Select label="Status" value={form.status} options={STATUS_OPTIONS} onChange={(val) => setForm((p) => ({ ...p, status: val }))} />
            </div>
            <Textarea
              label="Project description"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              rows={4}
              placeholder="Describe the project goals and requirements..."
            />
          </div>
        </Card>

        <Card
          title={
            <span className="inline-flex items-center gap-3">
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-500">
                <CalendarDays className="h-4 w-4 text-white" />
              </span>
              <span>Project timeline</span>
            </span>
          }
          subtitle="Start and end dates for this project"
          variant="default"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Start date"
              type="date"
              value={form.startDate}
              onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
            />
            <Input
              label="Due date"
              type="date"
              value={form.endDate}
              onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))}
              error={errors.endDate}
            />
          </div>
        </Card>

        <Card
          title={
            <span className="inline-flex items-center gap-3">
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500">
                <DollarSign className="h-4 w-4 text-white" />
              </span>
              <span>Budget &amp; assignment</span>
            </span>
          }
          subtitle="Budget, client, and project manager"
          variant="default"
        >
          <div className="space-y-4">
            <Input
              label="Budget"
              type="number"
              min="0"
              value={form.budget}
              onChange={(e) => setForm((p) => ({ ...p, budget: e.target.value }))}
              placeholder="Optional"
            />
            {clientOptions.length > 0 ? (
              <Select
                label="Client"
                value={form.clientId}
                options={[{ value: '', label: 'No client' }, ...clientOptions]}
                onChange={(val) => setForm((p) => ({ ...p, clientId: val }))}
                placeholder="Select a client (optional)"
              />
            ) : null}
            <Select
              label="Project manager"
              value={form.projectManagerId}
              options={[{ value: '', label: 'Not assigned' }, ...userOptions]}
              onChange={(val) => setForm((p) => ({ ...p, projectManagerId: val }))}
              placeholder="Assign a project manager"
            />
          </div>
        </Card>

        {allUsers.length > 0 ? (
          <Card title={`Team members (${form.teamMemberIds.length} selected)`} variant="default">
            <div className="grid max-h-64 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
              {allUsers.map((u) => {
                const id = String(u.id);
                const checked = form.teamMemberIds.includes(id);
                return (
                  <label
                    key={u.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                      checked ? 'border-orange-200 bg-orange-50' : 'border-gray-100 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleTeamToggle(id)}
                      className="h-4 w-4 accent-orange-500"
                    />
                    <div className="flex min-w-0 items-center gap-2">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-bold text-orange-700">
                        {(u.name || u.username || '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-900">{u.name || u.username}</p>
                        <p className="truncate text-xs text-gray-500">{u.email || ''}</p>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </Card>
        ) : null}

        <div className="flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-center">
          <Button
            type="button"
            variant="outline"
            rounded="default"
            className="!border-gray-300 !text-gray-700 hover:!bg-gray-50 px-5"
            onClick={() => router.push(detailHref)}
            disabled={saving}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Cancel
          </Button>

          <Button
            type="submit"
            variant="primary"
            rounded="pill"
            className="bg-gradient-to-r from-orange-500 to-pink-500 px-6 shadow-lg hover:from-orange-600 hover:to-pink-600"
            disabled={saving}
          >
            {saving ? (
              <>
                <LoadingSpinner size="sm" />
                <span className="ml-2">Saving…</span>
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save project
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
