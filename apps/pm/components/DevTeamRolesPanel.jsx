'use client';

import { Avatar } from '@webfudge/ui';
import { Users } from 'lucide-react';
import { DEV_ROLE_DEFINITIONS, normalizeDevMetadata, resolveRoleUser } from '../lib/taskDev';

function userDisplayName(user) {
  return user?.name || [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || '—';
}

export default function DevTeamRolesPanel({ task, users = [], className = '', compact = false }) {
  const roles = normalizeDevMetadata(task?.devMetadata).roles;
  const filled = DEV_ROLE_DEFINITIONS.filter(({ key }) => roles[key]);
  const gridClass = compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';

  return (
    <div className={`flex flex-1 flex-col p-5 ${className}`}>
      <div className="mb-4 flex items-center gap-2">
        <Users className="h-4 w-4 shrink-0 text-violet-600" aria-hidden />
        <h3 className="text-sm font-semibold text-gray-900">Team & roles</h3>
      </div>

      {filled.length === 0 ? (
        <p className="text-sm text-gray-500">No roles assigned yet.</p>
      ) : (
        <div className={`grid gap-3 ${gridClass}`}>
          {DEV_ROLE_DEFINITIONS.map(({ key, label, color }) => {
            const user = resolveRoleUser(roles, key, users);
            if (!user) return null;
            const name = userDisplayName(user);
            return (
              <div
                key={key}
                className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50/60 px-3 py-2.5"
              >
                <Avatar
                  size="sm"
                  src={user.avatar || undefined}
                  fallback={user.initials || name.charAt(0).toUpperCase()}
                  alt={name}
                  className={`shrink-0 text-white ${user.color || color}`}
                />
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">{label}</p>
                  <p className="truncate text-sm font-semibold text-gray-900">{name}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
