'use client';

import { useCallback, useEffect, useState } from 'react';
import workspaceService from './api/workspaceService';

const STORAGE_KEY = 'pm.activeWorkspace';
const EVENT = 'pm:workspace-change';
const REFRESH_EVENT = 'pm:workspaces-refresh';

function readActive() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) || 'all';
  } catch {
    return 'all';
  }
}

/** Remember the selected workspace ('all' or an id) and tell every mounted hook. */
export function setActiveWorkspace(id) {
  const value = id == null || id === '' ? 'all' : String(id);
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    /* private mode: keep it in memory for this page only */
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: value }));
}

/** Ask every mounted hook to reload the workspace list (after create / edit / delete). */
export function refreshWorkspaces() {
  window.dispatchEvent(new Event(REFRESH_EVENT));
}

/**
 * Workspaces the user can see + the active one (shared across sidebar and pages).
 * `activeId` is 'all' or a workspace id string; a stale id falls back to 'all'.
 * Wait for `ready` before fetching with `activeId`.
 */
export default function useWorkspaces() {
  const [workspaces, setWorkspaces] = useState([]);
  const [canCreate, setCanCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState('all');
  // false until the saved choice is read from storage — pages wait for it so they don't
  // fetch "all" first and race the filtered request
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    try {
      const { items, canCreate: cc } = await workspaceService.list();
      setWorkspaces(items);
      setCanCreate(cc);
    } catch {
      setWorkspaces([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setActiveId(readActive());
    setReady(true);
    load();
    const onChange = (e) => setActiveId(e.detail || 'all');
    window.addEventListener(EVENT, onChange);
    window.addEventListener(REFRESH_EVENT, load);
    return () => {
      window.removeEventListener(EVENT, onChange);
      window.removeEventListener(REFRESH_EVENT, load);
    };
  }, [load]);

  const known = activeId === 'all' || workspaces.some((w) => String(w.id) === String(activeId));
  const effectiveId = loading || known ? activeId : 'all';
  const active = workspaces.find((w) => String(w.id) === String(effectiveId)) || null;

  return { workspaces, canCreate, loading, ready, activeId: effectiveId, active, reload: load };
}
