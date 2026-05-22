'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { clsx } from 'clsx';
import { Avatar, Button, Checkbox, Modal } from '@webfudge/ui';
import { ownerDisplayFromUser } from '@webfudge/ui';
import { Search, UserPlus, Users } from 'lucide-react';

/** Rotating rim colors (stacked avatar rings, similar to team columns in reference designs). */
const RING_CLASSES = [
  'ring-2 ring-sky-400 ring-offset-[2px] ring-offset-white',
  'ring-2 ring-amber-400 ring-offset-[2px] ring-offset-white',
  'ring-2 ring-rose-400 ring-offset-[2px] ring-offset-white',
];

function usersForIds(ids, assigneesResolved, directory) {
  return ids
    .map((rawId) => {
      const n = Number(rawId);
      const fromResolved = assigneesResolved?.find((u) => Number(u.id) === n);
      if (fromResolved) return fromResolved;
      return directory.find((u) => Number(u.id) === n);
    })
    .filter(Boolean);
}

function memberHaystack(u) {
  return [u.name, u.email, u.firstName, u.lastName, u.username]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function matchesQuery(u, query) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return memberHaystack(u).includes(q);
}

function MemberRow({ user, selected, disabled, onToggle, layout = 'list' }) {
  const derived = ownerDisplayFromUser(user);
  const secondary = user.email && user.email !== derived.label ? user.email : null;

  if (layout === 'card') {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={onToggle}
        className={clsx(
          'flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition',
          selected
            ? 'border-orange-300 bg-orange-50/80 ring-1 ring-orange-200'
            : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
        )}
      >
        <Avatar
          src={user.avatar || undefined}
          alt={derived.label}
          fallback={derived.avatarFallback}
          size="md"
          className="shrink-0 bg-gray-600 text-white"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-gray-900">{derived.label}</p>
          {secondary ? <p className="truncate text-xs text-gray-500">{secondary}</p> : null}
        </div>
        <span className="pointer-events-none shrink-0">
          <Checkbox checked={selected} onChange={() => {}} disabled={disabled} aria-hidden tabIndex={-1} />
        </span>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50">
      <Checkbox
        checked={selected}
        onChange={() => onToggle()}
        disabled={disabled}
        aria-label={`Assign ${user.name || user.email || user.id}`}
      />
      <Avatar
        src={user.avatar || undefined}
        alt={derived.label}
        fallback={derived.avatarFallback}
        size="sm"
        className="shrink-0 bg-gray-600 text-white"
      />
      <div className="min-w-0 flex-1">
        <span className="block truncate text-xs font-medium text-gray-800">{derived.label}</span>
        {secondary ? <span className="block truncate text-[10px] text-gray-500">{secondary}</span> : null}
      </div>
    </div>
  );
}

function AssigneeSearchField({ value, onChange, placeholder, className }) {
  return (
    <div className={clsx('relative', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="block w-full rounded-lg border border-gray-300 py-2.5 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-orange-500"
        autoComplete="off"
      />
    </div>
  );
}

/**
 * Stacked avatar display + assignee selection (popover or centered modal).
 * @param {'popover' | 'modal'} pickerMode — modal recommended for project team pickers
 * @param {boolean} searchable — search filter (default: true for modal, or when roster has 4+ members in popover)
 */
export default function TaskAssigneesPicker({
  userIds,
  assignees = [],
  users = [],
  onChange,
  disabled = false,
  compact = false,
  maxShown = null,
  popoverTitle = 'Assignees (working on this task)',
  pickerMode = 'popover',
  searchable: searchableProp,
}) {
  const numericIds = Array.isArray(userIds)
    ? [...new Set(userIds.map(Number).filter((x) => Number.isFinite(x) && x > 0))]
    : [];
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [placement, setPlacement] = useState('below');
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  const useModal = pickerMode === 'modal';
  const searchable =
    searchableProp ?? (useModal || (!compact && users.length >= 4));

  const filteredUsers = useMemo(
    () => (searchable ? users.filter((u) => matchesQuery(u, query)) : users),
    [users, query, searchable]
  );

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  useEffect(() => {
    if (!open || useModal) return;
    const fn = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [open, useModal]);

  useEffect(() => {
    if (!open || useModal) return;
    setPlacement('below');
  }, [open, useModal]);

  useLayoutEffect(() => {
    if (!open || useModal) return;
    const trigger = triggerRef.current;
    const menu = menuRef.current;
    if (!trigger || !menu) return;

    const pad = 8;
    const gap = 4;
    menu.style.maxHeight = '';

    const tr = trigger.getBoundingClientRect();
    const mr = menu.getBoundingClientRect();

    const bottomOverflow = mr.bottom > window.innerHeight - pad;
    const topOverflow = mr.top < pad;

    if (!bottomOverflow && !topOverflow) return;

    const spaceBelow = window.innerHeight - tr.bottom - gap - pad;
    const spaceAbove = tr.top - gap - pad;

    if (bottomOverflow && !topOverflow) {
      if (spaceAbove >= mr.height) {
        setPlacement('above');
      } else {
        menu.style.maxHeight = `${Math.max(120, spaceBelow)}px`;
      }
      return;
    }

    if (topOverflow && !bottomOverflow) {
      if (spaceBelow >= mr.height) {
        setPlacement('below');
      } else {
        menu.style.maxHeight = `${Math.max(100, spaceAbove)}px`;
      }
      return;
    }

    if (bottomOverflow && topOverflow) {
      if (spaceAbove > spaceBelow) {
        setPlacement('above');
        menu.style.maxHeight = `${Math.max(100, spaceAbove)}px`;
      } else {
        setPlacement('below');
        menu.style.maxHeight = `${Math.max(100, spaceBelow)}px`;
      }
    }
  }, [open, users.length, compact, popoverTitle, useModal, query]);

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

  const openPicker = (e) => {
    e.stopPropagation();
    if (!disabled) setOpen(true);
  };

  const maxH = compact ? 'max-h-44' : 'max-h-60';

  const memberList = (layout) => {
    if (users.length === 0) {
      return <p className="py-6 text-center text-sm text-gray-500">No users available.</p>;
    }
    if (filteredUsers.length === 0) {
      return <p className="py-6 text-center text-sm text-gray-500">No members match your search.</p>;
    }
    return filteredUsers.map((u) => (
      <MemberRow
        key={u.id}
        user={u}
        selected={numericIds.includes(Number(u.id))}
        disabled={disabled}
        onToggle={() => toggle(u.id)}
        layout={layout}
      />
    ));
  };

  const modalPicker =
    typeof document !== 'undefined' && useModal
      ? createPortal(
          <Modal
            isOpen={open}
            onClose={() => setOpen(false)}
            title={popoverTitle}
            size="lg"
            contentClassName="space-y-4 !pt-4"
          >
            <p className="text-sm text-gray-600">
              {numericIds.length === 0
                ? 'Search and select teammates for this project.'
                : `${numericIds.length} teammate${numericIds.length === 1 ? '' : 's'} selected`}
            </p>
            {searchable ? (
              <AssigneeSearchField
                value={query}
                onChange={setQuery}
                placeholder="Search by name or email…"
              />
            ) : null}
            <div className="grid max-h-[min(26rem,55vh)] grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
              {memberList('card')}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-4">
              <span className="text-xs text-gray-500">
                {users.length} organization member{users.length === 1 ? '' : 's'}
              </span>
              <Button type="button" onClick={() => setOpen(false)}>
                Done
              </Button>
            </div>
          </Modal>,
          document.body
        )
      : null;

  return (
    <div className={clsx(useModal ? 'block w-full' : 'relative inline-flex align-middle')} ref={rootRef}>
      <div className={clsx('flex flex-wrap items-center gap-2', useModal && 'w-full')}>
        <button
          ref={triggerRef}
          type="button"
          disabled={disabled}
          onClick={openPicker}
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
        {useModal && !compact ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={openPicker}
            className="gap-1.5"
          >
            <Users className="h-3.5 w-3.5" aria-hidden />
            {shown.length === 0 ? 'Choose teammates' : 'Manage teammates'}
          </Button>
        ) : null}
      </div>

      {open && !useModal ? (
        <div
          ref={menuRef}
          role="dialog"
          aria-label="Choose assignees"
          className={clsx(
            'absolute left-0 z-[100] min-w-[16rem] max-w-[min(20rem,calc(100vw-2rem))] rounded-lg border border-gray-200 bg-white shadow-xl',
            maxH,
            'flex flex-col overflow-hidden',
            placement === 'above' ? 'bottom-full mb-1' : 'top-full mt-1'
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <p className="shrink-0 px-3 pb-1.5 pt-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
            {popoverTitle}
          </p>
          {searchable ? (
            <div className="shrink-0 border-b border-gray-100 px-2 pb-2">
              <AssigneeSearchField
                value={query}
                onChange={setQuery}
                placeholder="Search…"
                className="w-full"
              />
            </div>
          ) : null}
          <div className="min-h-0 flex-1 overflow-auto">{memberList('list')}</div>
        </div>
      ) : null}

      {modalPicker}
    </div>
  );
}
