'use client';

import { useCallback, useEffect, useState } from 'react';
import { Sparkles, Check, X, Pencil, Undo2, RefreshCw } from 'lucide-react';
import { Card, IS_SAAS_PLATFORM, UpgradePrompt, planErrorDetails } from '@webfudge/ui';
import strapiClient from '../lib/strapiClient';

/**
 * Fudge AI auto-capture (G10): budget, timeline, requirement, next step and stage proposed from the
 * record's conversations. Accept (optionally edited) or dismiss each one; applied ones can be undone.
 * SaaS only. subjectType: 'lead_company' | 'deal'.
 */

const LABELS = { budget: 'Budget', timeline: 'Timeline', requirement: 'Requirement', nextStep: 'Next step (creates a task)', stage: 'Stage' };
const ORDER = ['budget', 'timeline', 'requirement', 'nextStep', 'stage'];

const money = (n, cur) => {
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: cur || 'INR', maximumFractionDigits: 0 }).format(n);
  } catch {
    return `${cur || ''} ${n}`;
  }
};

function display(key, f) {
  if (key === 'budget') return money(f.amount, f.currency);
  if (key === 'timeline') return f.date && f.date !== f.text ? `${f.text} (${f.date})` : f.text;
  if (key === 'requirement') return f.text;
  if (key === 'nextStep') return f.dueDate ? `${f.title} · due ${f.dueDate}` : f.title;
  if (key === 'stage') return String(f.value).replace(/_/g, ' ');
  return '';
}

/** The editable part of a suggestion, as the apply endpoint expects it. */
function editOf(key, f) {
  if (key === 'budget') return { amount: f.amount };
  if (key === 'timeline') return { text: f.text, date: f.date || null };
  if (key === 'requirement') return { text: f.text };
  if (key === 'nextStep') return { title: f.title, dueDate: f.dueDate || null };
  return { value: f.value };
}

function EditFields({ field, value, onChange }) {
  const input = 'w-full rounded-lg border border-gray-300 px-2 py-1 text-sm';
  const set = (k) => (e) => onChange({ ...value, [k]: k === 'amount' ? Number(e.target.value) : e.target.value || null });
  if (field === 'budget') return <input type="number" min="0" className={input} value={value.amount ?? ''} onChange={set('amount')} />;
  if (field === 'timeline')
    return (
      <div className="flex gap-2">
        <input className={input} value={value.text ?? ''} onChange={set('text')} />
        <input type="date" className={input} value={value.date ?? ''} onChange={set('date')} />
      </div>
    );
  if (field === 'requirement') return <textarea rows={2} className={input} value={value.text ?? ''} onChange={set('text')} />;
  if (field === 'nextStep')
    return (
      <div className="flex gap-2">
        <input className={input} value={value.title ?? ''} onChange={set('title')} />
        <input type="date" className={input} value={value.dueDate ?? ''} onChange={set('dueDate')} />
      </div>
    );
  return <input className={input} value={value.value ?? ''} onChange={set('value')} />;
}

export default function AiCaptureCard({ subjectType, subjectId, canEdit = true, onApplied }) {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState({});
  const base = `/ai-capture/${subjectType}/${subjectId}`;

  const load = useCallback(async () => {
    try {
      const res = await strapiClient.get(base);
      setData(res?.data || null);
    } catch {
      setData(null);
    }
  }, [base]);

  useEffect(() => {
    if (IS_SAAS_PLATFORM && subjectId) load();
  }, [load, subjectId]);

  if (!IS_SAAS_PLATFORM || !data) return null;

  const call = async (key, fn) => {
    setBusy(key);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(null);
    }
  };

  const run = () =>
    call('run', async () => {
      const res = await strapiClient.post(`${base}/run`, {});
      setData((d) => ({ ...d, capture: res?.data?.capture ?? d.capture }));
    });

  const apply = (key, edits = {}) =>
    call(key, async () => {
      const res = await strapiClient.post(`${base}/apply`, { fields: { [key]: edits } });
      setData((d) => ({ ...d, capture: res?.data?.capture ?? d.capture }));
      setEditing(null);
      onApplied?.();
    });

  const dismiss = (key) =>
    call(key, async () => {
      const res = await strapiClient.post(`${base}/dismiss`, { field: key });
      setData((d) => ({ ...d, capture: res?.data?.capture ?? d.capture }));
    });

  const undo = (key, actionId) =>
    call(key, async () => {
      await strapiClient.post(`/ai/actions/${actionId}/undo`, {});
      await load();
      onApplied?.();
    });

  const fields = data.capture?.fields || {};
  const visible = ORDER.filter((k) => fields[k] && fields[k].status !== 'dismissed');
  const sources = data.sources || [];
  const plan = error ? planErrorDetails(error) : null;

  return (
    <Card variant="elevated" className="rounded-xl">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-orange-500" aria-hidden />
          <h3 className="text-sm font-semibold text-gray-900">AI captured from conversations</h3>
        </div>
        {data.aiEnabled && canEdit && (
          <button type="button" onClick={run} disabled={busy === 'run'} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50">
            <RefreshCw className={`h-3.5 w-3.5 ${busy === 'run' ? 'animate-spin' : ''}`} aria-hidden />
            {busy === 'run' ? 'Reading…' : 'Re-read'}
          </button>
        )}
      </div>

      {plan ? (
        <div className="mt-3">
          <UpgradePrompt {...plan} />
        </div>
      ) : error ? (
        <p className="mt-3 text-sm text-red-600">{error.message}</p>
      ) : null}

      {visible.length === 0 ? (
        <p className="mt-3 text-sm text-gray-500">
          {data.capture ? 'Nothing new to suggest.' : 'After you add a comment or meeting notes, Fudge AI suggests budget, timeline and the next step here.'}
          {data.settings?.autoApply ? ' Suggestions are applied automatically for your organization.' : ''}
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-gray-100">
          {visible.map((key) => {
            const f = fields[key];
            const applied = f.status === 'applied';
            return (
              <li key={key} className="py-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium uppercase text-gray-500">{LABELS[key]}</p>
                    {editing === key ? (
                      <div className="mt-1">
                        <EditFields field={key} value={draft} onChange={setDraft} />
                      </div>
                    ) : (
                      <p className={`mt-0.5 text-sm ${applied ? 'text-gray-500' : 'text-gray-900'}`}>{display(key, f)}</p>
                    )}
                    {f.evidence && <p className="mt-0.5 truncate text-xs italic text-gray-400" title={f.evidence}>“{f.evidence}”</p>}
                  </div>
                  {canEdit && (
                    <div className="flex shrink-0 items-center gap-1">
                      {applied ? (
                        f.actionId && (
                          <button type="button" onClick={() => undo(key, f.actionId)} disabled={busy === key} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-gray-600 hover:bg-gray-100" title="Undo">
                            <Undo2 className="h-3.5 w-3.5" aria-hidden /> Undo
                          </button>
                        )
                      ) : editing === key ? (
                        <>
                          <button type="button" onClick={() => apply(key, draft)} disabled={busy === key} className="rounded-lg bg-orange-500 px-2 py-1 text-xs font-medium text-white hover:bg-orange-600">
                            Save
                          </button>
                          <button type="button" onClick={() => setEditing(null)} className="rounded-lg px-2 py-1 text-xs text-gray-600 hover:bg-gray-100">
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button type="button" onClick={() => apply(key)} disabled={busy === key} className="rounded-lg p-1.5 text-green-600 hover:bg-green-50" title="Accept" aria-label={`Accept ${LABELS[key]}`}>
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDraft(editOf(key, f));
                              setEditing(key);
                            }}
                            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
                            title="Edit, then accept"
                            aria-label={`Edit ${LABELS[key]}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button type="button" onClick={() => dismiss(key)} disabled={busy === key} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100" title="Dismiss" aria-label={`Dismiss ${LABELS[key]}`}>
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-3 text-xs text-gray-400">
        Reads {sources.filter((s) => s.available).map((s) => s.label.toLowerCase()).join(', ')}.
        {sources.some((s) => !s.available) && ` Coming later: ${sources.filter((s) => !s.available).map((s) => s.label).join(', ')}.`}
      </p>
    </Card>
  );
}
