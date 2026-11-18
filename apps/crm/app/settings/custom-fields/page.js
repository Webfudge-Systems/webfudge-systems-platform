'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { Button, Card, LoadingSpinner } from '@webfudge/ui';
import CRMPageHeader from '../../../components/CRMPageHeader';
import customFieldService, { CUSTOM_FIELD_ENTITIES, CUSTOM_FIELD_TYPES } from '../../../lib/api/customFieldService';
import { canManageCRM } from '../../../lib/rbac';

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 disabled:bg-gray-50';

const typeLabel = (t) => CUSTOM_FIELD_TYPES.find((x) => x.value === t)?.label || t;
const hasOptions = (t) => t === 'select' || t === 'multiselect';
const parseOptions = (text) =>
  String(text || '')
    .split(/\n|,/)
    .map((s) => s.trim())
    .filter(Boolean);

function Banner({ tone, children }) {
  const cls = tone === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-800';
  return (
    <p className={`rounded-lg border px-4 py-2.5 text-sm ${cls}`} role={tone === 'error' ? 'alert' : 'status'}>
      {children}
    </p>
  );
}

const EMPTY_NEW = { label: '', type: 'text', optionsText: '', required: false, showInTable: false };

export default function CustomFieldsSettingsPage() {
  const canEdit = canManageCRM('settings');
  const [entity, setEntity] = useState('lead');
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState(EMPTY_NEW);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setFields(await customFieldService.list());
    } catch (e) {
      setMessage({ tone: 'error', text: e?.message || 'Could not load custom fields' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const entityFields = useMemo(
    () => fields.filter((f) => f.entity === entity).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.id - b.id),
    [fields, entity]
  );

  const run = async (fn, okText) => {
    setBusy(true);
    setMessage(null);
    try {
      await fn();
      if (okText) setMessage({ tone: 'ok', text: okText });
      await load();
    } catch (e) {
      setMessage({ tone: 'error', text: e?.message || 'Could not save' });
    } finally {
      setBusy(false);
    }
  };

  const addField = (e) => {
    e.preventDefault();
    if (!draft.label.trim()) return;
    run(async () => {
      await customFieldService.create({
        entity,
        label: draft.label.trim(),
        type: draft.type,
        options: hasOptions(draft.type) ? parseOptions(draft.optionsText) : undefined,
        required: draft.required,
        showInTable: draft.showInTable,
      });
      setDraft(EMPTY_NEW);
    }, `Field "${draft.label.trim()}" added. It now shows on every ${CUSTOM_FIELD_ENTITIES.find((x) => x.value === entity)?.label.toLowerCase()} record.`);
  };

  const move = (index, delta) => {
    const target = index + delta;
    if (target < 0 || target >= entityFields.length) return;
    const order = [...entityFields];
    [order[index], order[target]] = [order[target], order[index]];
    run(() => Promise.all(order.map((f, i) => customFieldService.update(f.id, { sortOrder: i }))));
  };

  const startEdit = (f) => {
    setEditingId(f.id);
    setEditDraft({ label: f.label, optionsText: (f.options || []).join('\n'), required: f.required, showInTable: f.showInTable });
  };

  const saveEdit = (f) =>
    run(async () => {
      await customFieldService.update(f.id, {
        label: editDraft.label,
        options: hasOptions(f.type) ? parseOptions(editDraft.optionsText) : undefined,
        required: editDraft.required,
        showInTable: editDraft.showInTable,
      });
      setEditingId(null);
    }, 'Field saved.');

  const removeField = (f) => {
    if (!window.confirm(`Delete the "${f.label}" field? It disappears from every record. Values already entered are kept but hidden.`)) return;
    run(() => customFieldService.remove(f.id), `Field "${f.label}" deleted.`);
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <CRMPageHeader
        title="Custom fields"
        subtitle="Extra fields on your CRM records: no code, no deploy"
        breadcrumb={[
          { label: 'Settings', href: '/settings' },
          { label: 'Custom fields', href: '/settings/custom-fields' },
        ]}
      />

      {!canEdit ? (
        <Banner tone="error">You can view these fields. Ask an admin (CRM settings manage access) to change them.</Banner>
      ) : null}
      {message ? <Banner tone={message.tone}>{message.text}</Banner> : null}

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Record type">
        {CUSTOM_FIELD_ENTITIES.map((e) => {
          const count = fields.filter((f) => f.entity === e.value).length;
          return (
            <button
              key={e.value}
              type="button"
              role="tab"
              aria-selected={e.value === entity}
              onClick={() => {
                setEntity(e.value);
                setEditingId(null);
              }}
              className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${
                e.value === entity ? 'border-orange-500 bg-orange-500 text-white' : 'border-gray-200 bg-white text-gray-700 hover:border-orange-300'
              }`}
            >
              {e.label} <span className="opacity-75">({count})</span>
            </button>
          );
        })}
      </div>

      {canEdit ? (
        <Card className="border border-gray-200 p-5">
          <h2 className="mb-3 text-base font-semibold text-gray-900">Add a field</h2>
          <form onSubmit={addField} className="grid grid-cols-1 gap-3 md:grid-cols-12 md:items-end">
            <div className="md:col-span-4">
              <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="cf-new-label">
                Name
              </label>
              <input
                id="cf-new-label"
                className={inputClass}
                value={draft.label}
                onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
                placeholder="e.g. Budget, Property type, Course"
              />
            </div>
            <div className="md:col-span-3">
              <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="cf-new-type">
                Type
              </label>
              <select id="cf-new-type" className={inputClass} value={draft.type} onChange={(e) => setDraft((d) => ({ ...d, type: e.target.value }))}>
                {CUSTOM_FIELD_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap items-center gap-4 md:col-span-3">
              <label className="inline-flex items-center gap-1.5 text-sm text-gray-700">
                <input type="checkbox" className="h-4 w-4 accent-orange-500" checked={draft.required} onChange={(e) => setDraft((d) => ({ ...d, required: e.target.checked }))} />
                Required
              </label>
              <label className="inline-flex items-center gap-1.5 text-sm text-gray-700">
                <input type="checkbox" className="h-4 w-4 accent-orange-500" checked={draft.showInTable} onChange={(e) => setDraft((d) => ({ ...d, showInTable: e.target.checked }))} />
                Show in list
              </label>
            </div>
            <div className="md:col-span-2">
              <Button type="submit" variant="primary" disabled={busy || !draft.label.trim() || (hasOptions(draft.type) && !parseOptions(draft.optionsText).length)} className="w-full">
                <Plus className="mr-1 h-4 w-4" aria-hidden />
                Add field
              </Button>
            </div>
            {hasOptions(draft.type) ? (
              <div className="md:col-span-12">
                <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="cf-new-options">
                  Options (one per line or comma-separated)
                </label>
                <textarea
                  id="cf-new-options"
                  rows={3}
                  className={inputClass}
                  value={draft.optionsText}
                  onChange={(e) => setDraft((d) => ({ ...d, optionsText: e.target.value }))}
                  placeholder={'Residential\nCommercial\nPlot'}
                />
              </div>
            ) : null}
          </form>
        </Card>
      ) : null}

      <Card className="border border-gray-200 p-5">
        <h2 className="mb-3 text-base font-semibold text-gray-900">
          {CUSTOM_FIELD_ENTITIES.find((x) => x.value === entity)?.label} fields
        </h2>
        {loading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner message="Loading fields…" />
          </div>
        ) : entityFields.length === 0 ? (
          <p className="py-4 text-sm text-gray-500">No custom fields yet.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {entityFields.map((f, index) => (
              <li key={f.id} className="py-3">
                {editingId === f.id && editDraft ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-12 md:items-end">
                      <div className="md:col-span-5">
                        <label className="mb-1 block text-xs font-medium text-gray-600">Name</label>
                        <input className={inputClass} value={editDraft.label} onChange={(e) => setEditDraft((d) => ({ ...d, label: e.target.value }))} />
                      </div>
                      <div className="flex items-center gap-4 md:col-span-5">
                        <label className="inline-flex items-center gap-1.5 text-sm text-gray-700">
                          <input type="checkbox" className="h-4 w-4 accent-orange-500" checked={editDraft.required} onChange={(e) => setEditDraft((d) => ({ ...d, required: e.target.checked }))} />
                          Required
                        </label>
                        <label className="inline-flex items-center gap-1.5 text-sm text-gray-700">
                          <input type="checkbox" className="h-4 w-4 accent-orange-500" checked={editDraft.showInTable} onChange={(e) => setEditDraft((d) => ({ ...d, showInTable: e.target.checked }))} />
                          Show in list
                        </label>
                      </div>
                    </div>
                    {hasOptions(f.type) ? (
                      <textarea rows={3} className={inputClass} value={editDraft.optionsText} onChange={(e) => setEditDraft((d) => ({ ...d, optionsText: e.target.value }))} aria-label="Options" />
                    ) : null}
                    <div className="flex gap-2">
                      <Button variant="primary" onClick={() => saveEdit(f)} disabled={busy}>
                        Save
                      </Button>
                      <Button variant="outline" onClick={() => setEditingId(null)} disabled={busy}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900">
                        {f.label}
                        {f.required ? <span className="ml-1 text-red-500">*</span> : null}
                      </p>
                      <p className="text-xs text-gray-500">
                        {typeLabel(f.type)}
                        {hasOptions(f.type) ? ` · ${(f.options || []).join(', ')}` : ''}
                        {f.showInTable ? ' · Shown in list' : ''}
                      </p>
                    </div>
                    {canEdit ? (
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => move(index, -1)} disabled={busy || index === 0} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-30" aria-label="Move up">
                          <ArrowUp className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => move(index, 1)} disabled={busy || index === entityFields.length - 1} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-30" aria-label="Move down">
                          <ArrowDown className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => startEdit(f)} disabled={busy} className="rounded-lg px-2 py-1 text-sm font-medium text-orange-600 hover:bg-orange-50">
                          Edit
                        </button>
                        <button type="button" onClick={() => removeField(f)} disabled={busy} className="rounded-lg p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600" aria-label={`Delete ${f.label}`}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ) : null}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
