'use client';

import { Select } from '@webfudge/ui';
import { DEV_ROLE_DEFINITIONS, normalizeDevMetadata } from '../lib/taskDev';

function userLabel(user) {
  return user?.name || [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.username || user?.email || `User ${user?.id}`;
}

export default function TaskDevRolePickers({ value, onChange, users = [], disabled = false, compact = false }) {
  const meta = normalizeDevMetadata(value);
  const roles = meta.roles;

  const patchRole = (key, userId) => {
    onChange?.({
      ...meta,
      roles: { ...roles, [key]: userId || '' },
    });
  };

  const userOptions = [
    { value: '', label: 'Unassigned' },
    ...users.map((u) => ({ value: String(u.id), label: userLabel(u) })),
  ];

  return (
    <div className="space-y-3">
      {!compact ? (
        <div>
          <p className="text-sm font-semibold text-gray-900">Team roles</p>
          <p className="mt-0.5 text-xs text-gray-500">Assign people responsible for delivery, analysis, QA, and testing.</p>
        </div>
      ) : null}
      <div className={`grid grid-cols-1 gap-3 ${compact ? '' : 'sm:grid-cols-2'}`}>
        {DEV_ROLE_DEFINITIONS.map(({ key, label }) => (
          <Select
            key={key}
            label={label}
            value={roles[key] || ''}
            options={userOptions}
            onChange={(v) => patchRole(key, v)}
            disabled={disabled}
            searchable
            searchPlaceholder="Search team…"
          />
        ))}
      </div>
    </div>
  );
}
