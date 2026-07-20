'use client';

import { useState } from 'react';

export const DOC_CATEGORIES = [
  'Guides',
  'Getting Started',
  'User Roles',
  'Applications',
  'Onboarding',
  'Reference',
  'API',
  'Tutorials',
  'Concepts',
  'How-to',
  'Release Notes',
  'FAQ',
  'General',
];

const CUSTOM = '__custom__';

/**
 * Category picker: a dropdown of common categories with an "Other…" escape
 * hatch for custom values. Style is injected by the caller so it matches both
 * the light page-editor and the blue admin shell.
 */
export default function CategorySelect({
  value = '',
  onChange,
  className = '',
  style,
  id,
  placeholder = 'Select a category',
}) {
  const knownValue = value && !DOC_CATEGORIES.includes(value);
  const [custom, setCustom] = useState(Boolean(knownValue));

  function handleSelect(e) {
    const next = e.target.value;
    if (next === CUSTOM) {
      setCustom(true);
      onChange('');
      return;
    }
    setCustom(false);
    onChange(next);
  }

  if (custom) {
    return (
      <div className="space-y-1.5">
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={className}
          style={style}
          placeholder="Type a custom category"
          autoFocus
        />
        <button
          type="button"
          onClick={() => {
            setCustom(false);
            onChange('');
          }}
          className="text-xs font-semibold underline"
          style={{ color: 'var(--admin-accent, #2563eb)' }}
        >
          Choose from list instead
        </button>
      </div>
    );
  }

  return (
    <select id={id} value={value} onChange={handleSelect} className={className} style={style}>
      <option value="">{placeholder}</option>
      {DOC_CATEGORIES.map((cat) => (
        <option key={cat} value={cat}>
          {cat}
        </option>
      ))}
      <option value={CUSTOM}>Other…</option>
    </select>
  );
}
