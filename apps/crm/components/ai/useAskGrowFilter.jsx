'use client';

import { useEffect, useState, useCallback } from 'react';
import { Sparkles, X } from 'lucide-react';
import { IS_SAAS_PLATFORM } from '@webfudge/ui';
import askGrowService from '../../lib/api/askGrowService';

/**
 * G20: applies an Ask Grow filter from the URL (?ai=<filter json>&aiq=<question>) to the leads list.
 * The backend re-runs the whitelisted filter with the user's permissions (no AI, no credits) and
 * returns matching ids; the list then loads those through the normal GET /lead-companies.
 * `ids` is null when no Ask Grow filter is active.
 */
export function useAskGrowFilter() {
  const [state, setState] = useState({ ids: null, chips: [], question: '', total: 0 });

  useEffect(() => {
    if (!IS_SAAS_PLATFORM || typeof window === 'undefined') return;
    const sp = new URLSearchParams(window.location.search);
    const raw = sp.get('ai');
    if (!raw) return;
    let filter;
    try {
      filter = JSON.parse(raw);
    } catch {
      return;
    }
    askGrowService
      .run(filter)
      .then((d) => setState({ ids: d?.ids || [], chips: d?.chips || [], question: sp.get('aiq') || '', total: d?.total ?? (d?.ids || []).length }))
      .catch(() => setState({ ids: [], chips: ['Could not apply the AI filter'], question: '', total: 0 }));
  }, []);

  const clear = useCallback(() => {
    setState({ ids: null, chips: [], question: '', total: 0 });
    const url = new URL(window.location.href);
    url.searchParams.delete('ai');
    url.searchParams.delete('aiq');
    window.history.replaceState(null, '', url.toString());
  }, []);

  return { ...state, clear };
}

/** Adds the id restriction to leadCompanyService list params. */
export function withAskGrowIds(params, ids) {
  if (!ids) return params;
  const next = { ...params };
  (ids.length ? ids : [-1]).forEach((id, i) => {
    next[`filters[id][$in][${i}]`] = id;
  });
  return next;
}

export function AskGrowFilterBanner({ filter }) {
  if (!filter?.ids) return null;
  return (
    <div className="flex max-w-full items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs text-orange-800">
      <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span className="truncate" title={filter.question}>
        AI filter: {filter.chips.join(' · ') || 'all leads'}
        {filter.total > filter.ids.length ? ` (first ${filter.ids.length} of ${filter.total})` : ''}
      </span>
      <button type="button" onClick={filter.clear} className="rounded-full p-0.5 hover:bg-orange-100" aria-label="Clear AI filter">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
