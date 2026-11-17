'use client';

import { useEffect, useState } from 'react';
import { LEAD_STATUS_OPTIONS } from '@webfudge/ui';
import leadCompanyService from './api/leadCompanyService';

const FALLBACK = LEAD_STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label, color: null, kind: null }));

/**
 * The org's lead statuses in order (ticket G2): [{ value: 'NEW', label: 'New', color, kind }].
 * Falls back to the built-in list until loaded or if the request fails.
 */
export default function useLeadStatuses() {
  const [statuses, setStatuses] = useState(FALLBACK);

  useEffect(() => {
    let cancelled = false;
    leadCompanyService
      .getStatuses()
      .then((rows) => {
        if (cancelled || !rows.length) return;
        setStatuses(
          rows.map((r) => ({
            value: String(r.value).toUpperCase(),
            label: r.label || String(r.value),
            color: r.color || null,
            kind: r.kind || null,
          }))
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return statuses;
}
