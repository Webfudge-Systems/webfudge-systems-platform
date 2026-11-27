'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Circle, History, Pencil, Trash2, Link2 } from 'lucide-react';
import { Button } from '@webfudge/ui';
import goalService from '../../lib/api/goalService';
import { HealthChip, ProgressBar, inputClass, krValueText, relativeTime, METRIC_LABEL } from './goalUi';
import KeyResultForm from './KeyResultForm';

const CONFIDENCE_OPTIONS = [
  ['on_track', 'On track'],
  ['at_risk', 'At risk'],
  ['off_track', 'Off track'],
];

function CheckInForm({ kr, busy, onSubmit, onCancel }) {
  const isTasks = kr.metricType === 'tasks';
  const [value, setValue] = useState(isTasks ? '' : String(kr.currentValue ?? ''));
  const [confidence, setConfidence] = useState(kr.confidence || 'on_track');
  const [note, setNote] = useState('');
  return (
    <form
      className="grid gap-2 rounded-lg border border-orange-200 bg-orange-50/40 p-3 md:grid-cols-6"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(isTasks ? { confidence, note } : { value: Number(value), confidence, note });
      }}
    >
      {!isTasks ? (
        <label className="text-sm md:col-span-1">
          <span className="mb-1 block font-medium text-gray-700">Current value</span>
          <input className={inputClass} value={value} onChange={(e) => setValue(e.target.value)} inputMode="decimal" required autoFocus />
        </label>
      ) : null}
      <label className="text-sm md:col-span-1">
        <span className="mb-1 block font-medium text-gray-700">Confidence</span>
        <select className={inputClass} value={confidence} onChange={(e) => setConfidence(e.target.value)}>
          {CONFIDENCE_OPTIONS.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </label>
      <label className={`text-sm ${isTasks ? 'md:col-span-5' : 'md:col-span-4'}`}>
        <span className="mb-1 block font-medium text-gray-700">Note {isTasks ? '' : '(optional)'}</span>
        <input className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What moved, what's blocking" required={isTasks} />
      </label>
      <div className="flex justify-end gap-2 md:col-span-6">
        <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" disabled={busy || (!isTasks && (value === '' || !Number.isFinite(Number(value))))}>
          Save check-in
        </Button>
      </div>
    </form>
  );
}

/**
 * One key result: progress, latest check-in, check-in form and history. Task-based key results also
 * list their linked work; their progress moves when those tasks are completed.
 */
export default function KeyResultRow({ kr, canEdit, canCheckIn, users, projects, onChanged }) {
  const [mode, setMode] = useState(null); // 'checkin' | 'edit'
  const [history, setHistory] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const run = async (fn) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fn();
      setMode(null);
      if (history) setHistory((await goalService.listCheckIns(kr.id))?.data || []);
      onChanged?.(res?.data);
    } catch (e) {
      setError(e?.message || 'Could not save');
    } finally {
      setBusy(false);
    }
  };

  const toggleHistory = async () => {
    if (history) return setHistory(null);
    const res = await goalService.listCheckIns(kr.id).catch(() => null);
    setHistory(res?.data || []);
  };

  if (mode === 'edit') {
    return (
      <li className="rounded-lg border border-gray-200 p-3">
        <KeyResultForm initial={kr} users={users} projects={projects} busy={busy} onCancel={() => setMode(null)} onSave={(d) => run(() => goalService.updateKeyResult(kr.id, d))} />
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      </li>
    );
  }

  const linkedCount = (kr.linkedTaskCount || 0) + (kr.linkedProjectCount || 0);
  return (
    <li className="space-y-2 rounded-lg border border-gray-100 bg-white p-3">
      <div className="flex flex-wrap items-start gap-x-3 gap-y-1">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-900">{kr.title}</p>
          <p className="text-xs text-gray-500">
            {METRIC_LABEL[kr.metricType]} · {krValueText(kr)}
            {kr.owner ? ` · ${kr.owner.name}` : ''}
            {kr.lastCheckInAt ? ` · updated ${relativeTime(kr.lastCheckInAt)}` : ''}
          </p>
        </div>
        <HealthChip value={kr.confidence} />
        <span className="w-12 text-right text-sm font-semibold tabular-nums text-gray-900">{Math.round(kr.progress)}%</span>
      </div>
      <ProgressBar value={kr.progress} health={kr.confidence} size="sm" />

      {kr.metricType === 'tasks' && (kr.tasks?.length || kr.projects?.length) ? (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {(kr.projects || []).map((p) => (
            <Link key={`p${p.id}`} href={`/projects/${p.slug || p.id}`} className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700 hover:bg-gray-200">
              <Link2 className="h-3 w-3" aria-hidden />
              {p.name}
            </Link>
          ))}
          {(kr.tasks || []).map((t) => (
            <span key={`t${t.id}`} className={`inline-flex max-w-[16rem] items-center gap-1 rounded-full px-2 py-0.5 text-xs ${t.done ? 'bg-emerald-50 text-emerald-800' : 'bg-gray-100 text-gray-700'}`}>
              {t.done ? <CheckCircle2 className="h-3 w-3 shrink-0" aria-label="Done" /> : <Circle className="h-3 w-3 shrink-0" aria-label="Open" />}
              <span className="truncate">{t.name}</span>
            </span>
          ))}
          {kr.hiddenTaskCount ? <span className="text-xs text-gray-400">+{kr.hiddenTaskCount} you can&apos;t see</span> : null}
        </div>
      ) : kr.metricType === 'tasks' && !linkedCount ? (
        <p className="text-xs text-amber-700">Link projects or tasks so this key result can track progress.</p>
      ) : null}

      {mode === 'checkin' ? (
        <CheckInForm kr={kr} busy={busy} onCancel={() => setMode(null)} onSubmit={(d) => run(() => goalService.checkIn(kr.id, d))} />
      ) : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex flex-wrap items-center gap-3 pt-0.5">
        {canCheckIn && mode !== 'checkin' ? (
          <button type="button" className="text-sm font-medium text-orange-600 hover:text-orange-700" onClick={() => setMode('checkin')}>
            {kr.metricType === 'tasks' ? 'Add update' : 'Check in'}
          </button>
        ) : null}
        <button type="button" className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900" onClick={toggleHistory}>
          <History className="h-3.5 w-3.5" aria-hidden />
          {history ? 'Hide history' : 'History'}
        </button>
        {canEdit ? (
          <div className="ml-auto flex gap-1">
            <button type="button" className="rounded p-1.5 text-gray-500 hover:bg-gray-100" onClick={() => setMode('edit')} aria-label={`Edit ${kr.title}`}>
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="rounded p-1.5 text-red-500 hover:bg-red-50"
              onClick={() => window.confirm(`Delete the key result "${kr.title}" and its check-ins?`) && run(() => goalService.deleteKeyResult(kr.id))}
              aria-label={`Delete ${kr.title}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ) : null}
      </div>

      {history ? (
        <ol className="divide-y divide-gray-100 rounded-lg border border-gray-200 text-sm">
          {history.map((c) => (
            <li key={c.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 px-3 py-2">
              <span className="w-20 shrink-0 text-xs text-gray-500" title={new Date(c.createdAt).toLocaleString()}>
                {relativeTime(c.createdAt)}
              </span>
              {c.value != null && kr.metricType !== 'tasks' ? <span className="font-medium tabular-nums text-gray-900">{c.value}</span> : null}
              {c.progress != null ? <span className="tabular-nums text-gray-600">{Math.round(c.progress)}%</span> : null}
              {c.confidence ? <HealthChip value={c.confidence} /> : null}
              <span className="min-w-0 flex-1 text-gray-700">{c.note}</span>
              <span className="text-xs text-gray-400">{c.source === 'auto' ? 'automatic' : c.author?.name || ''}</span>
            </li>
          ))}
          {!history.length ? <li className="px-3 py-2 text-gray-500">No check-ins yet.</li> : null}
        </ol>
      ) : null}
    </li>
  );
}
