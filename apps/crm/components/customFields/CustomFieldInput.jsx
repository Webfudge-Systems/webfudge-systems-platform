'use client';

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20';

/**
 * One input for a custom field, by type (ticket G1).
 * @param {{ field: object, value: any, onChange: (v: any) => void, users?: object[], id?: string }} props
 */
export default function CustomFieldInput({ field, value, onChange, users = [], id }) {
  const inputId = id || `cf-${field.key}`;
  switch (field.type) {
    case 'checkbox':
      return (
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-gray-800">
          <input
            id={inputId}
            type="checkbox"
            className="h-4 w-4 accent-orange-500"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
          />
          {field.label}
        </label>
      );
    case 'select':
      return (
        <select id={inputId} className={inputClass} value={value ?? ''} onChange={(e) => onChange(e.target.value || null)}>
          <option value="">—</option>
          {(field.options || []).map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      );
    case 'multiselect': {
      const selected = new Set(Array.isArray(value) ? value : []);
      return (
        <div className="flex flex-wrap gap-1.5" role="group" aria-labelledby={`${inputId}-label`}>
          {(field.options || []).map((o) => {
            const on = selected.has(o);
            return (
              <button
                key={o}
                type="button"
                aria-pressed={on}
                onClick={() => {
                  const next = new Set(selected);
                  if (on) next.delete(o);
                  else next.add(o);
                  onChange([...next]);
                }}
                className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                  on ? 'border-orange-500 bg-orange-500 text-white' : 'border-gray-300 bg-white text-gray-700 hover:border-orange-300'
                }`}
              >
                {o}
              </button>
            );
          })}
        </div>
      );
    }
    case 'user':
      return (
        <select id={inputId} className={inputClass} value={value ?? ''} onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}>
          <option value="">—</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {[u.firstName, u.lastName].filter(Boolean).join(' ') || u.username || u.email}
            </option>
          ))}
        </select>
      );
    case 'number':
    case 'currency':
      return (
        <input
          id={inputId}
          type="number"
          step={field.type === 'currency' ? '0.01' : 'any'}
          inputMode="decimal"
          className={inputClass}
          value={value ?? ''}
          placeholder={field.type === 'currency' ? '₹' : ''}
          onChange={(e) => onChange(e.target.value === '' ? null : e.target.value)}
        />
      );
    case 'date':
      return (
        <input id={inputId} type="date" className={inputClass} value={value ?? ''} onChange={(e) => onChange(e.target.value || null)} />
      );
    case 'url':
      return (
        <input id={inputId} type="url" className={inputClass} value={value ?? ''} placeholder="https://" onChange={(e) => onChange(e.target.value)} />
      );
    case 'phone':
      return (
        <input id={inputId} type="tel" className={inputClass} value={value ?? ''} placeholder="+91" onChange={(e) => onChange(e.target.value)} />
      );
    default:
      return <input id={inputId} type="text" className={inputClass} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />;
  }
}
