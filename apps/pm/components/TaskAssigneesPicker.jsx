'use client';

import { useEffect, useRef, useState } from 'react';
import { Avatar, Checkbox } from '@webfudge/ui';
import { ownerDisplayFromUser } from '@webfudge/ui';
import { UserPlus } from 'lucide-react';

/** Rotating rim colors (stacked avatar rings, similar to team columns in reference designs). */
const RING_CLASSES = [
  'ring-2 ring-sky-400 ring-offset-[2px] ring-offset-white',
  'ring-2 ring-amber-400 ring-offset-[2px] ring-offset-white',
  'ring-2 ring-rose-400 ring-offset-[2px] ring-offset-white',
];

function usersForIds(ids, assigneesResolved, directory) {
  return ids.map((rawId) => {
    const n = Number(rawId);
    const fromResolved = assigneesResolved?.find((u) => Number(u.id) === n);
    if (fromResolved) return fromResolved;
    return directory.find((u) => Number(u.id) === n);
  }).filter(Boolean);
}

/**
 * Stacked avatar display + checklist popover for task assignees (`collaborators` in Strapi).
 * @param {number[]} userIds Selected user primary keys
 * @param {object[]} assignees Resolved assignee objects (from transformTask `assignees`) for avatars without a round-trip
 * @param {object[]} users Organization directory (`transformUser`)
 */
export default function TaskAssigneesPicker({
  userIds,
  assignees = [],
  users = [],
  onChange,
  disabled = false,
  compact = false,
  maxShown = null,
}) {
  const numericIds = Array.isArray(userIds)
    ? [...new Set(userIds.map(Number).filter((x) => Number.isFinite(x) && x > 0))]
    : [];
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const fn = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [open]);

  const stackUsers = usersForIds(numericIds, assignees, users);
  const cap = maxShown ?? (compact ? 5 : 8);
  const shown = stackUsers.slice(0, cap);
  const overflow = stackUsers.length - shown.length;

  const toggle = (uid) => {
    const n = Number(uid);
    const set = new Set(numericIds);
    if (set.has(n)) set.delete(n);
    else set.add(n);
    onChange?.([...set]);
  };

  const maxH = compact ? 'max-h-44' : 'max-h-60';

  return (
    <div className="relative inline-flex align-middle" ref={rootRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          if (!disabled) setOpen((o) => !o);
        }}
        className="inline-flex items-center rounded-lg py-0.5 pl-0.5 pr-2 text-left transition hover:bg-gray-50 disabled:opacity-45"
      >
        {shown.length === 0 ? (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-gray-300 bg-gray-50 text-gray-400">
              <UserPlus className="h-3.5 w-3.5" aria-hidden />
            </span>
            {compact ? '—' : 'Add'}
          </span>
        ) : (
          <span className="flex items-center pt-0.5">
            {shown.map((u, i) => {
              const derived = ownerDisplayFromUser(u);
              return (
                <Avatar
                  key={u.id}
                  src={u.avatar || undefined}
                  alt={derived.label}
                  fallback={derived.avatarFallback}
                  size="sm"
                  className={`relative border-2 border-white bg-gray-600 text-white ${RING_CLASSES[i % RING_CLASSES.length]} ${
                    i > 0 ? '-ml-2' : ''
                  }`}
                  style={{ zIndex: 10 + i }}
                />
              );
            })}
            {overflow > 0 ? (
              <span
                className="-ml-1.5 inline-flex h-7 min-w-[1.625rem] items-center justify-center rounded-full border-2 border-white bg-gray-200 px-1 text-[10px] font-bold text-gray-800 ring-2 ring-gray-300 ring-offset-2 ring-offset-white"
                style={{ zIndex: 20 + shown.length }}
              >
                +{overflow}
              </span>
            ) : null}
          </span>
        )}
      </button>
      {open ? (
        <div
          role="dialog"
          aria-label="Choose assignees"
          className={`absolute left-0 top-full z-[100] mt-1 min-w-[14rem] max-w-[min(18rem,calc(100vw-2rem))] rounded-lg border border-gray-200 bg-white py-2 shadow-xl ${maxH} overflow-auto`}
          onClick={(e) => e.stopPropagation()}
        >
          <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
            Assignees (working on this task)
          </p>
          {users.length === 0 ? (
            <p className="px-3 pb-2 text-xs text-gray-500">No users available.</p>
          ) : (
            users.map((u) => (
              <div key={u.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50">
                <Checkbox
                  checked={numericIds.includes(Number(u.id))}
                  onChange={() => toggle(u.id)}
                  disabled={disabled}
                  aria-label={`Assign ${u.name || u.email || u.id}`}
                />
                <span className="min-w-0 flex-1 truncate text-xs font-medium text-gray-800">{u.name || u.email}</span>
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
