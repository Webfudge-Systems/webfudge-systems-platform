'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FileText, Plus, Search } from 'lucide-react';
import { Button, Card, EmptyState, LoadingSpinner, Modal } from '@webfudge/ui';
import docService, { DOC_TYPES, docTypeLabel, templateFor } from '../../lib/api/docService';

const inputClass =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20';

const TYPE_CHIP = {
  brief: 'bg-orange-50 text-orange-700',
  sop: 'bg-sky-50 text-sky-700',
  meeting_notes: 'bg-violet-50 text-violet-700',
  wiki: 'bg-emerald-50 text-emerald-700',
  other: 'bg-gray-100 text-gray-600',
};

function fmt(ts) {
  return ts ? new Date(ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '';
}

/**
 * Doc list + "New doc" for one project (`projectId`) or across everything the user can see.
 * Across-everything mode lets the user pick the project or workspace for a new doc.
 */
export default function DocsList({ projectId, projectName, projects = [], workspaces = [], showScope = true }) {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [canCreate, setCanCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [docType, setDocType] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ title: '', docType: 'brief', scope: projectId ? `p:${projectId}` : '' });
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await docService.list({ project: projectId, q: q.trim() || undefined, docType: docType || undefined });
      setItems(res.items);
      setCanCreate(res.canCreate);
      setError('');
    } catch (e) {
      setError(e?.message || 'Could not load docs');
    } finally {
      setLoading(false);
    }
  }, [projectId, q, docType]);

  useEffect(() => {
    const t = setTimeout(load, q ? 250 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  const openCreate = (type = 'brief') => {
    const hasBrief = items.some((d) => d.docType === 'brief');
    const nextType = projectId && type === 'brief' && hasBrief ? 'meeting_notes' : type;
    setForm({
      title: projectId && nextType === 'brief' ? `${projectName || 'Project'} brief` : '',
      docType: nextType,
      scope: projectId ? `p:${projectId}` : form.scope,
    });
    setCreateOpen(true);
  };

  const create = async (e) => {
    e.preventDefault();
    const [kind, sid] = String(form.scope || '').split(':');
    if (!sid) {
      setError('Choose a project or workspace for the doc.');
      return;
    }
    setCreating(true);
    try {
      const doc = await docService.create({
        title: form.title.trim() || `${docTypeLabel(form.docType)}`,
        docType: form.docType,
        ...(kind === 'p' ? { project: Number(sid) } : { workspace: Number(sid) }),
        content: templateFor(form.docType),
      });
      router.push(`/docs/${doc.id}`);
    } catch (err) {
      setError(err?.message || 'Could not create the doc');
      setCreating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search docs" aria-label="Search docs" className={`${inputClass} pl-9`} />
        </div>
        <select value={docType} onChange={(e) => setDocType(e.target.value)} aria-label="Filter by type" className={`${inputClass} w-auto`}>
          <option value="">All types</option>
          {DOC_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        {canCreate ? (
          <Button onClick={() => openCreate()}>
            <Plus className="mr-1.5 h-4 w-4" /> New doc
          </Button>
        ) : null}
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {loading ? (
        <div className="flex justify-center py-10"><LoadingSpinner /></div>
      ) : items.length === 0 ? (
        <Card className="p-2">
          <EmptyState
            icon={FileText}
            title={q || docType ? 'No docs match' : projectId ? 'No docs in this project yet' : 'No docs yet'}
            description={
              projectId
                ? 'Start with a project brief: goals, scope and deliverables. Turn any line into a task.'
                : 'Write briefs, SOPs and meeting notes next to the work. Mention teammates and turn lines into tasks.'
            }
            action={
              canCreate && !q && !docType ? (
                <Button onClick={() => openCreate('brief')}>
                  <Plus className="mr-1.5 h-4 w-4" /> {projectId ? 'Write the project brief' : 'New doc'}
                </Button>
              ) : null
            }
          />
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {items.map((d) => (
            <Link key={d.id} href={`/docs/${d.id}`} className="group">
              <Card className="h-full space-y-2 border border-gray-200 p-4 transition-shadow group-hover:shadow-md">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="line-clamp-2 font-semibold text-gray-900 group-hover:text-orange-700">{d.title}</h3>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${TYPE_CHIP[d.docType] || TYPE_CHIP.other}`}>
                    {docTypeLabel(d.docType)}
                  </span>
                </div>
                {d.excerpt ? <p className="line-clamp-3 text-sm text-gray-500">{d.excerpt}</p> : <p className="text-sm italic text-gray-400">Empty</p>}
                <div className="flex flex-wrap items-center gap-x-2 text-xs text-gray-400">
                  {showScope && (d.project || d.workspace) ? (
                    <span className="font-medium text-gray-600">{d.project?.name || `${d.workspace?.name} workspace`}</span>
                  ) : null}
                  <span>Updated {fmt(d.updatedAt)}{d.lastEditedBy?.name ? ` by ${d.lastEditedBy.name}` : ''}</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="New doc" size="md">
        <form className="space-y-4" onSubmit={create}>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">Type</span>
            <select value={form.docType} onChange={(e) => setForm((f) => ({ ...f, docType: e.target.value }))} className={inputClass}>
              {DOC_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">Title</span>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder={docTypeLabel(form.docType)}
              maxLength={200}
              className={inputClass}
              autoFocus
            />
          </label>
          {!projectId ? (
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700">Lives in</span>
              <select value={form.scope} onChange={(e) => setForm((f) => ({ ...f, scope: e.target.value }))} className={inputClass} required>
                <option value="">Choose a project or workspace…</option>
                {projects.length ? (
                  <optgroup label="Projects">
                    {projects.map((p) => (
                      <option key={`p${p.id}`} value={`p:${p.id}`}>{p.name}</option>
                    ))}
                  </optgroup>
                ) : null}
                {workspaces.length ? (
                  <optgroup label="Workspaces (no project)">
                    {workspaces.map((w) => (
                      <option key={`w${w.id}`} value={`w:${w.id}`}>{w.name}</option>
                    ))}
                  </optgroup>
                ) : null}
              </select>
              <span className="mt-1 block text-xs text-gray-500">Tasks can be created from lines of project docs.</span>
            </label>
          ) : null}
          <p className="text-xs text-gray-500">Briefs, SOPs and meeting notes start from a short template you can change.</p>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>Cancel</Button>
            <Button type="submit" disabled={creating}>{creating ? 'Creating…' : 'Create doc'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
