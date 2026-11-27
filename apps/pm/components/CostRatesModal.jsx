'use client';

/**
 * Cost rates & target margin (W22). Org admins only — the API refuses everyone else.
 * Hourly cost per member is entered by hand for now; Fudge People will supply it later.
 */

import { useCallback, useEffect, useState } from 'react';
import { Check, Lock } from 'lucide-react';
import { LoadingSpinner, Modal } from '@webfudge/ui';
import strapiClient from '../lib/strapiClient';

const input =
  'rounded-lg border border-gray-300 py-1.5 pl-3 text-sm tabular-nums focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20';
const btn = 'inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50';

function RateRow({ member, onSaved }) {
  const [value, setValue] = useState(member.hourlyCost ?? '');
  const [state, setState] = useState('idle'); // idle | saving | saved | error
  const [error, setError] = useState('');
  const dirty = String(value) !== String(member.hourlyCost ?? '');

  const save = async () => {
    if (!dirty) return;
    setState('saving');
    setError('');
    try {
      await strapiClient.put(`/profitability/cost-rates/${member.userId}`, { hourlyCost: value === '' ? null : Number(value) });
      setState('saved');
      onSaved(member.userId, value === '' ? null : Number(value));
    } catch (e) {
      setState('error');
      setError(e?.message || 'Could not save');
    }
  };

  return (
    <tr className="border-b border-gray-100 last:border-0">
      <td className="py-2 pr-3">
        <p className="text-sm font-medium text-gray-900">{member.name}</p>
        <p className="text-xs text-gray-500">{[member.jobRole, member.role].filter(Boolean).join(' · ') || member.email}</p>
      </td>
      <td className="py-2">
        <form
          className="flex items-center justify-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <label className="sr-only" htmlFor={`rate-${member.userId}`}>
            Hourly cost for {member.name}
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-2.5 top-1.5 text-sm text-gray-400">₹</span>
            <input
              id={`rate-${member.userId}`}
              type="number"
              min={0}
              step="1"
              inputMode="decimal"
              placeholder="Not set"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setState('idle');
              }}
              onBlur={save}
              className={`${input} w-28 pl-6 pr-8`}
            />
            <span className="pointer-events-none absolute right-2.5 top-1.5 text-xs text-gray-400">/h</span>
          </div>
          <span className="w-4" aria-live="polite">
            {state === 'saving' ? <LoadingSpinner size="sm" /> : state === 'saved' && !dirty ? <Check className="h-4 w-4 text-emerald-600" aria-label="Saved" /> : null}
          </span>
        </form>
        {error ? <p className="mt-1 text-right text-xs text-red-600">{error}</p> : null}
      </td>
    </tr>
  );
}

export default function CostRatesModal({ isOpen, onClose, onChanged }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [target, setTarget] = useState('');
  const [targetState, setTargetState] = useState('idle');

  const load = useCallback(async () => {
    try {
      const res = await strapiClient.get('/profitability/settings');
      setData(res?.data || null);
      setTarget(res?.data?.orgTarget ?? '');
      setError('');
    } catch (e) {
      setError(e?.message || 'Could not load cost rates');
    }
  }, []);

  useEffect(() => {
    if (isOpen) load();
  }, [isOpen, load]);

  const saveTarget = async (e) => {
    e.preventDefault();
    setTargetState('saving');
    try {
      await strapiClient.put('/profitability/settings/target', { targetMarginPct: Number(target) });
      setTargetState('saved');
      onChanged?.();
    } catch (err) {
      setTargetState('idle');
      setError(err?.message || 'Could not save the target');
    }
  };

  const missing = data ? data.members.filter((m) => m.hourlyCost == null).length : 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Cost rates & targets" subtitle="Used to work out each project's real margin" size="lg">
      {error ? (
        <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      {!data ? (
        <div className="flex justify-center py-10">
          <LoadingSpinner />
        </div>
      ) : (
        <div className="space-y-5">
          <form onSubmit={saveTarget} className="rounded-xl border border-gray-200 p-4">
            <label htmlFor="org-target" className="text-sm font-semibold text-gray-900">
              Default target margin
            </label>
            <p className="mt-0.5 text-xs text-gray-500">Projects without their own target use this. Below it, admins and the project manager get an alert (once a month).</p>
            <div className="mt-2 flex items-center gap-2">
              <div className="relative">
                <input
                  id="org-target"
                  type="number"
                  min={-100}
                  max={100}
                  step="0.5"
                  value={target}
                  onChange={(e) => {
                    setTarget(e.target.value);
                    setTargetState('idle');
                  }}
                  className={`${input} w-24 pr-7`}
                />
                <span className="pointer-events-none absolute right-2.5 top-1.5 text-sm text-gray-400">%</span>
              </div>
              <button type="submit" disabled={targetState === 'saving' || target === ''} className={`${btn} bg-orange-600 text-white hover:bg-orange-700`}>
                Save
              </button>
              {targetState === 'saved' ? <Check className="h-4 w-4 text-emerald-600" aria-label="Saved" /> : null}
            </div>
          </form>

          <div>
            <div className="flex items-start gap-2 text-xs text-gray-500">
              <Lock className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" aria-hidden />
              <span>
                Hourly cost is what a person costs the business (salary and overheads per hour). Only admins can see these numbers. Cost = approved timesheet hours × rate.
                {missing ? ` ${missing} ${missing === 1 ? 'person has' : 'people have'} no rate yet.` : ''}
              </span>
            </div>
            <table className="mt-2 w-full">
              <tbody>
                {data.members.map((m) => (
                  <RateRow
                    key={m.userId}
                    member={m}
                    onSaved={(userId, hourlyCost) => {
                      setData((d) => ({ ...d, members: d.members.map((x) => (x.userId === userId ? { ...x, hourlyCost } : x)) }));
                      onChanged?.();
                    }}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Modal>
  );
}
