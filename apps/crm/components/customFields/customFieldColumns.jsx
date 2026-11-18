'use client';

import { TableCellText } from '@webfudge/ui';
import { formatCustomFieldValue } from '../../lib/api/customFieldService';

/**
 * Table columns for custom fields marked "Show in list" (ticket G1).
 * @param {object[]} fields custom field definitions
 * @param {object[]} [users] team members, to show names for "Team member" fields
 */
export function customFieldColumns(fields, users = []) {
  return (fields || [])
    .filter((f) => f.showInTable)
    .map((f) => ({
      key: `cf_${f.key}`,
      label: String(f.label).toUpperCase(),
      render: (_, row) => (
        <TableCellText value={formatCustomFieldValue(f, row?.customFields?.[f.key], users)} maxWidthClass="max-w-[200px]" />
      ),
    }));
}

/**
 * Filter controls for one custom field (used in list filter modals).
 * @param {{ fields: object[], fieldKey: string, value: string, onChange: (next: { key: string, value: string }) => void }} props
 */
export function CustomFieldFilter({ fields, fieldKey, value, onChange }) {
  const usable = (fields || []).filter((f) => f.type !== 'user');
  if (!usable.length) return null;
  const field = usable.find((f) => f.key === fieldKey);
  const cls =
    'w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20';
  return (
    <div className="space-y-1.5 sm:col-span-2">
      <span className="text-sm font-medium text-gray-700">Custom field</span>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <select
          aria-label="Custom field"
          className={cls}
          value={fieldKey}
          onChange={(e) => onChange({ key: e.target.value, value: '' })}
        >
          <option value="">Any custom field</option>
          {usable.map((f) => (
            <option key={f.key} value={f.key}>
              {f.label}
            </option>
          ))}
        </select>
        {field ? (
          field.type === 'select' || field.type === 'multiselect' ? (
            <select aria-label={`${field.label} value`} className={cls} value={value} onChange={(e) => onChange({ key: fieldKey, value: e.target.value })}>
              <option value="">Select value</option>
              {(field.options || []).map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          ) : field.type === 'checkbox' ? (
            <select aria-label={`${field.label} value`} className={cls} value={value} onChange={(e) => onChange({ key: fieldKey, value: e.target.value })}>
              <option value="">Select value</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          ) : (
            <input
              aria-label={`${field.label} value`}
              type={field.type === 'date' ? 'date' : field.type === 'number' || field.type === 'currency' ? 'number' : 'text'}
              className={cls}
              value={value}
              placeholder={['text', 'phone', 'url'].includes(field.type) ? 'Contains…' : 'Equals…'}
              onChange={(e) => onChange({ key: fieldKey, value: e.target.value })}
            />
          )
        ) : null}
      </div>
    </div>
  );
}
