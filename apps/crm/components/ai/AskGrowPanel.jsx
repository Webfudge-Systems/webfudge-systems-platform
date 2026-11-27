'use client';

import { useEffect, useState, useCallback } from 'react';
import { Sparkles, ArrowRight, Building2 } from 'lucide-react';
import { LoadingSpinner, UpgradePrompt, planErrorDetails } from '@webfudge/ui';
import askGrowService, { leadsHrefForFilter } from '../../lib/api/askGrowService';

/**
 * G20 Ask Grow inside Cmd+K: "Pune leads from Meta last week with score > 70 that nobody called".
 * Fudge AI turns the question into a whitelisted lead filter; the backend runs it with the user's
 * CRM permissions. Ctrl/Cmd+Enter asks. Results open the leads list with the filter applied.
 */
export default function AskGrowPanel({ question, onNavigate }) {
  const [state, setState] = useState({ status: 'idle' });

  useEffect(() => setState({ status: 'idle' }), [question]);

  const ask = useCallback(async () => {
    if (!question || state.status === 'loading') return;
    setState({ status: 'loading' });
    try {
      const data = await askGrowService.query(question);
      setState({ status: 'done', data });
    } catch (err) {
      setState({ status: 'error', plan: planErrorDetails(err), message: err?.message || 'Fudge AI could not answer that.' });
    }
  }, [question, state.status]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        ask();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ask]);

  const d = state.data;
  return (
    <div className="border-b border-gray-100 px-4 py-3">
      <button
        type="button"
        onClick={ask}
        className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-orange-50"
      >
        <Sparkles className="h-4 w-4 shrink-0 text-orange-500" aria-hidden />
        <span className="min-w-0 flex-1 truncate text-sm text-gray-800">
          Ask Fudge AI: <span className="font-medium">“{question}”</span>
        </span>
        <kbd className="rounded-md border border-gray-300 bg-white px-1.5 py-0.5 font-sans text-[11px] text-gray-500">Ctrl ↵</kbd>
      </button>

      {state.status === 'loading' && (
        <div className="flex items-center gap-2 px-2 py-2 text-sm text-gray-500">
          <LoadingSpinner size="sm" /> Finding leads…
        </div>
      )}

      {state.status === 'error' &&
        (state.plan ? (
          <div className="px-2 py-2"><UpgradePrompt {...state.plan} /></div>
        ) : (
          <p className="px-2 py-2 text-sm text-red-600">{state.message}</p>
        ))}

      {state.status === 'done' && d && (
        <div className="space-y-2 px-2 py-2">
          {d.error === 'not_allowed' ? (
            <p className="text-sm text-gray-600">You don’t have access to leads.</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-1.5">
                {(d.chips || []).map((c) => (
                  <span key={c} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">{c}</span>
                ))}
                {!d.chips?.length && <span className="text-xs text-gray-500">No filters found in that question — showing all leads.</span>}
              </div>
              {d.ignored?.includes('score') && <p className="text-xs text-amber-700">Lead scores aren’t available yet, so the score part was skipped.</p>}
              {d.ignored?.includes('status') && <p className="text-xs text-amber-700">That status isn’t in your pipeline, so it was skipped.</p>}
              <ul className="divide-y divide-gray-100">
                {(d.rows || []).slice(0, 5).map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => onNavigate(`/sales/lead-companies/${r.id}`)}
                      className="flex w-full items-center gap-2 py-1.5 text-left text-sm hover:text-orange-600"
                    >
                      <Building2 className="h-3.5 w-3.5 text-gray-400" aria-hidden />
                      <span className="flex-1 truncate">{r.companyName}</span>
                      <span className="text-xs text-gray-500">{[r.city, r.score != null ? `score ${r.score}` : null].filter(Boolean).join(' · ')}</span>
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => onNavigate(leadsHrefForFilter(d.filter, question))}
                className="inline-flex items-center gap-1 text-sm font-medium text-orange-600 hover:text-orange-700"
              >
                Open {d.total} lead{d.total === 1 ? '' : 's'} in the list <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
