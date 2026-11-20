'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import PortalShell from '../../../components/portal/PortalShell';
import { portalRequest, setPortalToken } from '../../../lib/portalClient';

/** Magic-link landing: swaps the one-time link for a portal session, then opens the portal. */
export default function PortalAuth() {
  const [error, setError] = useState('');
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return; // the link works once; never send it twice (React strict mode)
    started.current = true;
    const token = new URLSearchParams(window.location.search).get('token') || '';
    // Drop the token from the address bar and history right away.
    window.history.replaceState(null, '', '/portal/auth');
    if (!token) {
      setError('This sign-in link is incomplete.');
      return;
    }
    portalRequest('/auth/exchange', { method: 'POST', body: { token } })
      .then((data) => {
        setPortalToken(data.token);
        window.location.replace('/portal');
      })
      .catch((e) => setError(e.message));
  }, []);

  return (
    <PortalShell>
      <div className="mx-auto mt-6 max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm sm:mt-16">
        {error ? (
          <>
            <h1 className="text-xl font-semibold">We could not sign you in</h1>
            <p className="mt-2 text-sm text-gray-600">{error}</p>
            <Link href="/portal" className="mt-6 inline-flex rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-black">
              Get a new link
            </Link>
          </>
        ) : (
          <p className="text-sm text-gray-600">Signing you in…</p>
        )}
      </div>
    </PortalShell>
  );
}
