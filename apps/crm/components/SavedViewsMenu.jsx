'use client';

/**
 * Saved views for Grow lists (G3): save the current columns, filters, sort and layout; open your
 * own or teammates' shared views; star one as your default (opened when the page loads).
 * Stored server-side (/saved-views), so views follow you across devices.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Bookmark, Share2, Star, Trash2, Users } from 'lucide-react';
import strapiClient from '../lib/strapiClient';

export function useSavedViews(scope) {
  const [views, setViews] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const load = useCallback(async () => {
    try {
      const res = await strapiClient.get('/saved-views', { scope });
      setViews(Array.isArray(res?.data) ? res.data : []);
    } catch {
      setViews([]);
    } finally {
      setLoaded(true);
    }
  }, [scope]);
  useEffect(() => {
    load();
  }, [load]);
  const save = async (payload) => {
    const res = await strapiClient.post('/saved-views', { data: { scope, ...payload } });
    await load();
    return res?.data;
  };
  const update = async (id, patch) => {
    const res = await strapiClient.put(`/saved-views/${id}`, { data: patch });
    await load();
    return res?.data;
  };
  const remove = async (id) => {
    await strapiClient.delete(`/saved-views/${id}`);
    await load();
  };
  return { views, loaded, defaultView: views.find((v) => v.isDefault) || null, save, update, remove };
}

/**
 * Applies the user's default view once, when the list loads.
 * @param {ReturnType<typeof useSavedViews>} saved
 * @param {(config: object) => void} apply
 */
export function useApplyDefaultView(saved, apply) {
  const done = useRef(false);
  useEffect(() => {
    if (done.current || !saved.loaded) return;
    done.current = true;
    if (saved.defaultView?.config) apply(saved.defaultView.config);
  }, [saved.loaded, saved.defaultView, apply]);
}

/**
 * @param {{ saved: ReturnType<typeof useSavedViews>, getConfig: () => object, onApply: (config: object) => void }} props
 */
export default function SavedViewsMenu({ saved, getConfig, onApply }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [shared, setShared] = useState(false);
  const [isDefault, setIsDefault] = useState(false);
  const [error, setError] = useState('');
  const [active, setActive] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setError('');
    try {
      const v = await saved.save({ name: name.trim(), config: getConfig(), shared, isDefault });
      setActive(v?.id || null);
      setName('');
      setShared(false);
      setIsDefault(false);
    } catch (err) {
      setError(err?.message || 'Could not save the view');
    }
  };

  const mine = saved.views.filter((v) => v.mine);
  const team = saved.views.filter((v) => !v.mine);
  const activeView = saved.views.find((v) => v.id === active);

  const row = (v) => (
    <li key={v.id} className={`flex items-center gap-1 rounded-lg ${active === v.id ? 'bg-orange-50' : 'hover:bg-gray-50'}`}>
      <button
        type="button"
        className="min-w-0 flex-1 truncate px-2 py-1.5 text-left text-sm text-gray-800"
        onClick={() => {
          onApply(v.config || {});
          setActive(v.id);
          setOpen(false);
        }}
        title={v.mine ? v.name : `${v.name} · shared by ${v.owner?.name || 'a teammate'}`}
      >
        {v.name}
        {!v.mine ? <span className="ml-1 text-xs text-gray-400">· {v.owner?.name}</span> : null}
      </button>
      {v.mine ? (
        <>
          <button
            type="button"
            aria-label={v.shared ? `Stop sharing ${v.name}` : `Share ${v.name} with the team`}
            title={v.shared ? 'Shared with the team (click to make private)' : 'Private (click to share with the team)'}
            className={`rounded p-1 ${v.shared ? 'text-orange-600' : 'text-gray-300 hover:text-orange-600'}`}
            onClick={() => saved.update(v.id, { shared: !v.shared })}
          >
            <Share2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label={`Make ${v.name} my default view`}
            title={v.isDefault ? 'Opens by default' : 'Open this view by default'}
            className={`rounded p-1 ${v.isDefault ? 'text-amber-500' : 'text-gray-300 hover:text-amber-500'}`}
            onClick={() => saved.update(v.id, { isDefault: !v.isDefault })}
          >
            <Star className="h-4 w-4" fill={v.isDefault ? 'currentColor' : 'none'} />
          </button>
          <button
            type="button"
            aria-label={`Delete ${v.name}`}
            className="rounded p-1 text-gray-400 hover:text-red-600"
            onClick={() => window.confirm(`Delete the view "${v.name}"?`) && saved.remove(v.id)}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </>
      ) : null}
    </li>
  );

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-700 shadow-sm hover:bg-gray-50"
      >
        <Bookmark className="h-4 w-4" aria-hidden />
        <span className="max-w-[10rem] truncate">{activeView ? activeView.name : 'Views'}</span>
      </button>
      {open ? (
        <div className="absolute right-0 z-40 mt-1 w-80 rounded-xl border border-gray-200 bg-white p-2 shadow-xl">
          {mine.length ? (
            <>
              <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">My views</p>
              <ul className="mb-2 max-h-48 overflow-y-auto">{mine.map(row)}</ul>
            </>
          ) : null}
          {team.length ? (
            <>
              <p className="flex items-center gap-1 px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <Users className="h-3.5 w-3.5" aria-hidden /> Shared by teammates
              </p>
              <ul className="mb-2 max-h-40 overflow-y-auto">{team.map(row)}</ul>
            </>
          ) : null}
          {!saved.views.length ? <p className="mb-2 px-2 text-xs text-gray-500">No saved views yet. Save the current columns, filters and sort below.</p> : null}
          <form onSubmit={submit} className="space-y-2 border-t border-gray-100 pt-2">
            <input
              className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-orange-500 focus:outline-none"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name this view, e.g. Hot Pune leads"
              aria-label="View name"
            />
            <label className="flex items-center gap-2 text-xs text-gray-600">
              <input type="checkbox" checked={shared} onChange={(e) => setShared(e.target.checked)} />
              Share with my team
            </label>
            <label className="flex items-center gap-2 text-xs text-gray-600">
              <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} />
              Open this view by default
            </label>
            {error ? <p className="text-xs text-red-600">{error}</p> : null}
            <button type="submit" disabled={!name.trim()} className="w-full rounded-lg bg-orange-500 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">
              Save current view
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
