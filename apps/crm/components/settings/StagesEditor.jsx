'use client';

import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';

const COLOR_SWATCH = {
  blue: 'bg-blue-500',
  violet: 'bg-violet-500',
  amber: 'bg-amber-500',
  orange: 'bg-orange-500',
  emerald: 'bg-emerald-500',
  red: 'bg-red-500',
  teal: 'bg-teal-500',
  pink: 'bg-pink-500',
  gray: 'bg-gray-400',
};

const FIELD_LABELS = {
  value: 'Value',
  expectedCloseDate: 'Close date',
  contact: 'Contact',
  clientAccount: 'Client account',
  leadCompany: 'Lead company',
  assignedTo: 'Owner',
  description: 'Description',
};

const inputClass =
  'w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm text-gray-900 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 disabled:bg-gray-50';

/**
 * Editable, ordered list of stages (deal pipeline) or statuses (lead list).
 * @param {{
 *   entity: 'deal'|'lead', stages: object[], onChange: (stages: object[]) => void,
 *   colors?: string[], requiredFieldOptions?: string[], lockedKeys?: string[], disabled?: boolean
 * }} props
 */
export default function StagesEditor({
  entity,
  stages,
  onChange,
  colors = Object.keys(COLOR_SWATCH),
  requiredFieldOptions = [],
  lockedKeys = [],
  disabled = false,
}) {
  const update = (index, patch) => onChange(stages.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  const move = (index, delta) => {
    const next = [...stages];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };
  const remove = (index) => onChange(stages.filter((_, i) => i !== index));
  const add = () =>
    onChange([
      ...stages,
      entity === 'deal'
        ? { label: '', kind: 'open', color: 'gray', probability: 50, requiredFields: [] }
        : { label: '', kind: 'open', color: 'gray' },
    ]);

  return (
    <div className="space-y-2">
      <div className="hidden grid-cols-12 gap-2 px-2 text-xs font-semibold uppercase tracking-wide text-gray-500 md:grid">
        <span className="col-span-4">Name</span>
        <span className="col-span-2">Type</span>
        <span className="col-span-2">Colour</span>
        {entity === 'deal' ? <span className="col-span-2">Win %</span> : <span className="col-span-2" />}
        <span className="col-span-2 text-right">Order</span>
      </div>
      {stages.map((stage, index) => {
        const locked = stage.key && lockedKeys.includes(stage.key);
        return (
          <div key={stage.key || `new-${index}`} className="rounded-xl border border-gray-200 bg-white p-2.5">
            <div className="grid grid-cols-2 items-center gap-2 md:grid-cols-12">
              <input
                className={`${inputClass} col-span-2 md:col-span-4`}
                value={stage.label}
                onChange={(e) => update(index, { label: e.target.value })}
                placeholder={entity === 'deal' ? 'Stage name' : 'Status name'}
                aria-label="Name"
                disabled={disabled}
              />
              <select
                className={`${inputClass} md:col-span-2`}
                value={stage.kind || 'open'}
                onChange={(e) => update(index, { kind: e.target.value })}
                aria-label="Type"
                disabled={disabled || locked}
              >
                <option value="open">Open</option>
                <option value="won">{entity === 'deal' ? 'Won' : 'Positive'}</option>
                <option value="lost">Lost</option>
              </select>
              <div className="flex items-center gap-1.5 md:col-span-2">
                <span className={`h-4 w-4 shrink-0 rounded-full ${COLOR_SWATCH[stage.color] || COLOR_SWATCH.gray}`} aria-hidden />
                <select
                  className={inputClass}
                  value={stage.color || 'gray'}
                  onChange={(e) => update(index, { color: e.target.value })}
                  aria-label="Colour"
                  disabled={disabled}
                >
                  {colors.map((c) => (
                    <option key={c} value={c}>
                      {c.charAt(0).toUpperCase() + c.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              {entity === 'deal' ? (
                <input
                  type="number"
                  min={0}
                  max={100}
                  className={`${inputClass} md:col-span-2`}
                  value={stage.probability ?? 0}
                  onChange={(e) => update(index, { probability: e.target.value === '' ? '' : Number(e.target.value) })}
                  aria-label="Win probability"
                  disabled={disabled}
                />
              ) : (
                <span className="text-xs text-gray-400 md:col-span-2">{locked ? 'System status' : ''}</span>
              )}
              <div className="col-span-2 flex items-center justify-end gap-1 md:col-span-2">
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={disabled || index === 0}
                  className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-30"
                  aria-label="Move up"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={disabled || index === stages.length - 1}
                  className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-30"
                  aria-label="Move down"
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => remove(index)}
                  disabled={disabled || locked}
                  className="rounded-lg p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                  aria-label="Remove"
                  title={locked ? 'System statuses can be renamed but not removed' : 'Remove'}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            {entity === 'deal' && requiredFieldOptions.length ? (
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 px-1 text-xs text-gray-600">
                <span className="font-medium text-gray-500">Required to enter:</span>
                {requiredFieldOptions.map((f) => {
                  const checked = (stage.requiredFields || []).includes(f);
                  return (
                    <label key={f} className="inline-flex cursor-pointer items-center gap-1">
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 accent-orange-500"
                        checked={checked}
                        disabled={disabled}
                        onChange={(e) => {
                          const set = new Set(stage.requiredFields || []);
                          if (e.target.checked) set.add(f);
                          else set.delete(f);
                          update(index, { requiredFields: [...set] });
                        }}
                      />
                      {FIELD_LABELS[f] || f}
                    </label>
                  );
                })}
              </div>
            ) : null}
          </div>
        );
      })}
      {!disabled ? (
        <button
          type="button"
          onClick={add}
          className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:border-orange-400 hover:text-orange-700"
        >
          <Plus className="h-4 w-4" aria-hidden />
          {entity === 'deal' ? 'Add stage' : 'Add status'}
        </button>
      ) : null}
    </div>
  );
}
