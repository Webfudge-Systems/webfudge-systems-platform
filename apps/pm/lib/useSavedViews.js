'use client';

import { useCallback, useEffect, useState } from 'react';
import strapiClient from './strapiClient';

/**
 * Per-user saved task views (W3), stored server-side.
 * scope: 'my-tasks' | `project:${id}`. A view's config: { view, groupBy }.
 * Returns the saved list, the default (opened first), and save / remove / setDefault helpers.
 */
export default function useSavedViews(scope) {
  const [views, setViews] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    if (!scope) return;
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
    setLoaded(false);
    load();
  }, [load]);

  const save = useCallback(
    async (name, config, isDefault = false) => {
      const res = await strapiClient.post('/saved-views', { data: { scope, name, config, isDefault } });
      await load();
      return res?.data;
    },
    [scope, load]
  );

  const update = useCallback(
    async (id, patch) => {
      const res = await strapiClient.put(`/saved-views/${id}`, { data: patch });
      await load();
      return res?.data;
    },
    [load]
  );

  const remove = useCallback(
    async (id) => {
      await strapiClient.delete(`/saved-views/${id}`);
      await load();
    },
    [load]
  );

  return { views, loaded, defaultView: views.find((v) => v.isDefault) || null, save, update, remove, reload: load };
}
