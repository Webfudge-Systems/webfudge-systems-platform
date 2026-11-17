'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Star } from 'lucide-react';
import { Button, Card, LoadingSpinner } from '@webfudge/ui';
import CRMPageHeader from '../../../components/CRMPageHeader';
import StagesEditor from '../../../components/settings/StagesEditor';
import pipelineService from '../../../lib/api/pipelineService';
import { canManageCRM } from '../../../lib/rbac';

const SYSTEM_LEAD_STATUSES = ['NEW', 'QUALIFIED', 'LOST', 'CONVERTED'];

function Banner({ tone, children }) {
  const cls = tone === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-800';
  return (
    <p className={`rounded-lg border px-4 py-2.5 text-sm ${cls}`} role={tone === 'error' ? 'alert' : 'status'}>
      {children}
    </p>
  );
}

export default function PipelineSettingsPage() {
  const canEdit = canManageCRM('settings');
  const [loading, setLoading] = useState(true);
  const [pipelines, setPipelines] = useState([]);
  const [meta, setMeta] = useState({});
  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState(null);
  const [leadList, setLeadList] = useState(null);
  const [leadDraft, setLeadDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [newName, setNewName] = useState('');

  const load = useCallback(async (keepId) => {
    setLoading(true);
    try {
      const [deals, leads] = await Promise.all([pipelineService.list('deal'), pipelineService.list('lead')]);
      setPipelines(deals.data);
      setMeta(deals.meta || {});
      const pick = deals.data.find((p) => p.id === keepId) || deals.data.find((p) => p.isDefault) || deals.data[0];
      setSelectedId(pick?.id ?? null);
      setDraft(pick ? { name: pick.name, stages: pick.stages } : null);
      const list = leads.data[0] || null;
      setLeadList(list);
      setLeadDraft(list ? list.stages : null);
    } catch (e) {
      setMessage({ tone: 'error', text: e?.message || 'Could not load pipelines' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(null);
  }, [load]);

  const selected = useMemo(() => pipelines.find((p) => p.id === selectedId) || null, [pipelines, selectedId]);

  const selectPipeline = (p) => {
    setSelectedId(p.id);
    setDraft({ name: p.name, stages: p.stages });
    setMessage(null);
  };

  const run = async (fn, okText) => {
    setSaving(true);
    setMessage(null);
    try {
      const keepId = await fn();
      setMessage({ tone: 'ok', text: okText });
      await load(keepId ?? selectedId);
    } catch (e) {
      setMessage({ tone: 'error', text: e?.message || 'Could not save' });
    } finally {
      setSaving(false);
    }
  };

  const savePipeline = () =>
    run(async () => {
      await pipelineService.update(selected.id, { name: draft.name, stages: draft.stages });
      return selected.id;
    }, 'Pipeline saved.');

  const createPipeline = (e) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    run(async () => {
      const created = await pipelineService.create({ name });
      setNewName('');
      return created?.id;
    }, `Pipeline "${name}" created. Edit its stages below.`);
  };

  const makeDefault = () => run(async () => {
    await pipelineService.update(selected.id, { isDefault: true });
    return selected.id;
  }, `"${selected.name}" is now the default pipeline.`);

  const deletePipeline = () => {
    if (!window.confirm(`Delete the "${selected.name}" pipeline? This can't be undone.`)) return;
    run(async () => {
      await pipelineService.remove(selected.id);
      return null;
    }, 'Pipeline deleted.');
  };

  const saveLeadStatuses = () =>
    run(async () => {
      await pipelineService.update(leadList.id, { stages: leadDraft });
      return selectedId;
    }, 'Lead statuses saved.');

  return (
    <div className="space-y-6 p-4 md:p-6">
      <CRMPageHeader
        title="Pipelines & lead statuses"
        subtitle="Deal pipelines, their stages, and your lead status list"
        breadcrumb={[
          { label: 'Settings', href: '/settings' },
          { label: 'Pipelines', href: '/settings/pipelines' },
        ]}
      />

      {!canEdit ? (
        <Banner tone="error">You can view these settings. Ask an admin (CRM settings manage access) to change them.</Banner>
      ) : null}
      {message ? <Banner tone={message.tone}>{message.text}</Banner> : null}

      {loading && !pipelines.length ? (
        <div className="flex min-h-[300px] items-center justify-center">
          <LoadingSpinner message="Loading pipelines…" />
        </div>
      ) : (
        <>
          <Card className="space-y-5 border border-gray-200 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Deal pipelines</h2>
                <p className="mt-0.5 text-sm text-gray-600">
                  Deals without a pipeline belong to the default one. Each stage sets the win probability shown on deals.
                </p>
              </div>
              {canEdit ? (
                <form onSubmit={createPipeline} className="flex items-center gap-2">
                  <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="New pipeline name, e.g. Renewals"
                    aria-label="New pipeline name"
                    className="w-60 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  />
                  <Button type="submit" variant="primary" disabled={saving || !newName.trim()}>
                    <Plus className="mr-1 h-4 w-4" aria-hidden />
                    Add pipeline
                  </Button>
                </form>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2" role="tablist" aria-label="Pipelines">
              {pipelines.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  role="tab"
                  aria-selected={p.id === selectedId}
                  onClick={() => selectPipeline(p)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${
                    p.id === selectedId
                      ? 'border-orange-500 bg-orange-500 text-white'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-orange-300'
                  }`}
                >
                  {p.isDefault ? <Star className="h-3.5 w-3.5" aria-label="Default" /> : null}
                  {p.name}
                </button>
              ))}
            </div>

            {selected && draft ? (
              <div className="space-y-4">
                <div className="max-w-sm">
                  <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="pipeline-name">
                    Pipeline name
                  </label>
                  <input
                    id="pipeline-name"
                    value={draft.name}
                    onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                    disabled={!canEdit}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 disabled:bg-gray-50"
                  />
                </div>
                <StagesEditor
                  entity="deal"
                  stages={draft.stages}
                  onChange={(stages) => setDraft((d) => ({ ...d, stages }))}
                  colors={meta.colors}
                  requiredFieldOptions={meta.requiredFieldOptions || []}
                  disabled={!canEdit}
                />
                {canEdit ? (
                  <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-4">
                    <Button variant="primary" onClick={savePipeline} disabled={saving}>
                      {saving ? 'Saving…' : 'Save pipeline'}
                    </Button>
                    {!selected.isDefault ? (
                      <>
                        <Button variant="outline" onClick={makeDefault} disabled={saving}>
                          Make default
                        </Button>
                        <Button variant="outline" onClick={deletePipeline} disabled={saving}>
                          Delete pipeline
                        </Button>
                      </>
                    ) : (
                      <span className="text-xs text-gray-500">Default pipeline: new deals start here.</span>
                    )}
                  </div>
                ) : null}
              </div>
            ) : null}
          </Card>

          {leadList && leadDraft ? (
            <Card className="space-y-4 border border-gray-200 p-5">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Lead statuses</h2>
                <p className="mt-0.5 text-sm text-gray-600">
                  The order here is the order of tabs, kanban columns and status menus on Leads. New, Qualified, Lost and
                  Converted are system statuses: rename or reorder them, but they can&apos;t be removed.
                </p>
              </div>
              <StagesEditor
                entity="lead"
                stages={leadDraft}
                onChange={setLeadDraft}
                colors={meta.colors}
                lockedKeys={SYSTEM_LEAD_STATUSES}
                disabled={!canEdit}
              />
              {canEdit ? (
                <div className="border-t border-gray-100 pt-4">
                  <Button variant="primary" onClick={saveLeadStatuses} disabled={saving}>
                    {saving ? 'Saving…' : 'Save lead statuses'}
                  </Button>
                </div>
              ) : null}
            </Card>
          ) : null}
        </>
      )}
    </div>
  );
}
