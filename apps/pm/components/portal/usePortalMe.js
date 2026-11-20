'use client';

import { useCallback, useEffect, useState } from 'react';
import { clearPortalToken, getPortalToken, portalRequest } from '../../lib/portalClient';

/** Loads the signed-in portal contact. `me` is null when signed out (or access was removed). */
export default function usePortalMe() {
  const [state, setState] = useState({ loading: true, me: null, error: '' });

  const load = useCallback(async () => {
    if (!getPortalToken()) return setState({ loading: false, me: null, error: '' });
    try {
      setState({ loading: false, me: await portalRequest('/me'), error: '' });
    } catch (e) {
      setState({ loading: false, me: null, error: e.status === 403 ? e.message : '' });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const signOut = useCallback(async () => {
    await portalRequest('/auth/logout', { method: 'POST' }).catch(() => {});
    clearPortalToken();
    window.location.assign('/portal');
  }, []);

  return { ...state, reload: load, signOut };
}
