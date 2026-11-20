'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Pencil, SlidersHorizontal } from 'lucide-react';
import { Button, Card } from '@webfudge/ui';
import strapiClient from '../../lib/strapiClient';
import useCustomFields from '../../lib/useCustomFields';
import { formatCustomFieldValue } from '../../lib/api/customFieldService';
import { canManageCRM } from '../../lib/rbac';
import CustomFieldInput from './CustomFieldInput';

let usersCache = null;
async function loadUsers() {
  if (usersCache) return usersCache;
  try {
    const res = await strapiClient.getOrganizationUsers({ pageSize: 200 });
    usersCache = Array.isArray(res?.data) ? res.data : [];
  } catch {
    usersCache = [];
  }
  return usersCache;
}

/**
 * "Custom fields" card for a record detail page (ticket G1). Shows nothing when the org has no fields
 * for this record type (admins see a hint to add some).
 * @param {{
 *   entity: 'lead'|'contact'|'account'|'deal',
 *   values: object|null,
 *   canEdit?: boolean,
 *   onSave: (customFields: object) => Promise<object|void>,
 * }} props
 */
export default function CustomFieldsCard({ entity, values, canEdit = false, onSave }) {
  const { fields, loading } = useCustomFields(entity);
  const [users, setUsers] = useState([]);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (fields.some((f) => f.type === 'user')) loadUsers().then(setUsers);
  }, [fields]);

  if (loading) return null;
  if (!fields.length) {
    if (!canManageCRM('settings')) return null;
    return (
      <Card className="border border-dashed border-gray-300 p-4">
        <p className="text-sm text-gray-600">
          Track extra details here with custom fields.{' '}
          <Link href="/settings/custom-fields" className="font-medium text-orange-600 hover:underline">
            Add custom fields
          </Link>
        </p>
      </Card>
    );
  }

  const current = values && typeof values === 'object' ? values : {};

  const start = () => {
    setDraft({ ...current });
    setError('');
    setEditing(true);
  };

  const save = async () => {
    const missing = fields.filter((f) => f.required && (draft[f.key] == null || draft[f.key] === '' || (Array.isArray(draft[f.key]) && !draft[f.key].length)));
    if (missing.length) {
      setError(`Fill in ${missing.map((f) => f.label).join(', ')}`);
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {};
      for (const f of fields) payload[f.key] = draft[f.key] ?? null;
      await onSave(payload);
      setEditing(false);
    } catch (e) {
      setError(e?.message || 'Could not save custom fields');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border border-gray-200 p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-5 w-5 text-orange-500" aria-hidden />
          <h2 className="text-base font-semibold text-gray-900">Custom fields</h2>
        </div>
        {canEdit && !editing ? (
          <button
            type="button"
            onClick={start}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium text-orange-600 hover:bg-orange-50"
          >
            <Pencil className="h-4 w-4" aria-hidden />
            Edit
          </button>
        ) : null}
      </div>

      {editing ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {fields.map((f) => (
              <div key={f.id} className={f.type === 'multiselect' ? 'sm:col-span-2' : ''}>
                {f.type !== 'checkbox' ? (
                  <label id={`cf-${f.key}-label`} htmlFor={`cf-${f.key}`} className="mb-1 block text-sm font-medium text-gray-700">
                    {f.label}
                    {f.required ? <span className="text-red-500"> *</span> : null}
                  </label>
                ) : null}
                <CustomFieldInput field={f} value={draft[f.key]} users={users} onChange={(v) => setDraft((d) => ({ ...d, [f.key]: v }))} />
              </div>
            ))}
          </div>
          {error ? (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}
          <div className="flex gap-2">
            <Button variant="primary" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
            <Button variant="outline" onClick={() => setEditing(false)} disabled={saving}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
          {fields.map((f) => {
            const text = formatCustomFieldValue(f, current[f.key], users);
            return (
              <div key={f.id} className="min-w-0">
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">{f.label}</dt>
                <dd className="mt-0.5 truncate text-sm text-gray-900">
                  {text ? (
                    f.type === 'url' ? (
                      <a href={current[f.key]} target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:underline">
                        {text}
                      </a>
                    ) : (
                      text
                    )
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </dd>
              </div>
            );
          })}
        </dl>
      )}
    </Card>
  );
}
