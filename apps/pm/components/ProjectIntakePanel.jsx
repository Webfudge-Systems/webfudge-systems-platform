'use client';

/**
 * Project → Intake tab (W13, SaaS). Channels that turn outside requests into tasks in a chosen list:
 * a shareable form, an inbound email address, and WhatsApp (shown as not available until Fudge Connect).
 */

import { useCallback, useEffect, useState } from 'react';
import { Check, Copy, ExternalLink, FileText, Mail, MessageCircle, Plus, RefreshCw, Trash2, X } from 'lucide-react';
import { LoadingSpinner } from '@webfudge/ui';
import strapiClient from '../lib/strapiClient';

const card = 'rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5';
const btn = 'inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50';
const btnPrimary = `${btn} bg-orange-600 text-white hover:bg-orange-700`;
const btnGhost = `${btn} border border-gray-200 bg-white text-gray-700 hover:bg-gray-50`;
const btnDanger = `${btn} border border-rose-200 bg-white text-rose-700 hover:bg-rose-50`;
const input = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100';

const FIELD_TYPES = [
  ['text', 'Short text'],
  ['textarea', 'Long text'],
  ['email', 'Email'],
  ['phone', 'Phone'],
  ['number', 'Number'],
  ['date', 'Date'],
  ['select', 'Dropdown'],
];
const ICONS = { form: FileText, email: Mail, whatsapp: MessageCircle };

function CopyField({ value, label }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <code className="min-w-0 flex-1 truncate rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-800 ring-1 ring-gray-200" title={value}>
        {value}
      </code>
      <button
        type="button"
        className={btnGhost}
        aria-label={`Copy ${label}`}
        onClick={async () => {
          await navigator.clipboard?.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}

function FieldEditor({ fields, onChange }) {
  const update = (i, patch) => onChange(fields.map((f, j) => (j === i ? { ...f, ...patch } : f)));
  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500">Name and email are always asked. Add the questions you need on top.</p>
      {fields.map((f, i) => (
        <div key={i} className="grid gap-2 rounded-lg border border-gray-100 p-2 sm:grid-cols-[1fr_9rem_auto_auto]">
          <input className={input} value={f.label} placeholder="Question" onChange={(e) => update(i, { label: e.target.value })} />
          <select className={input} value={f.type} onChange={(e) => update(i, { type: e.target.value })}>
            {FIELD_TYPES.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-1.5 text-xs text-gray-600">
            <input type="checkbox" checked={Boolean(f.required)} onChange={(e) => update(i, { required: e.target.checked })} /> Required
          </label>
          <button type="button" className={btnGhost} aria-label="Remove question" onClick={() => onChange(fields.filter((_, j) => j !== i))}>
            <X className="h-3.5 w-3.5" />
          </button>
          {f.type === 'select' ? (
            <input
              className={`${input} sm:col-span-4`}
              placeholder="Choices, separated by commas"
              value={(f.options || []).join(', ')}
              onChange={(e) => update(i, { options: e.target.value.split(',').map((s) => s.trimStart()) })}
            />
          ) : null}
        </div>
      ))}
      <button type="button" className={btnGhost} onClick={() => onChange([...fields, { label: '', type: 'text', required: false }])}>
        <Plus className="h-3.5 w-3.5" /> Add question
      </button>
    </div>
  );
}

function ChannelCard({ ch, taskLists, onSave, onRotate, onDelete, busy }) {
  const [draft, setDraft] = useState(() => ({
    name: ch.name,
    enabled: ch.enabled,
    taskListId: ch.taskListId || '',
    fields: ch.fields || [],
    settings: ch.settings || {},
  }));
  const Icon = ICONS[ch.channel] || FileText;
  const formUrl = typeof window !== 'undefined' ? `${window.location.origin}/intake/${ch.secret}` : `/intake/${ch.secret}`;
  const setSetting = (k, v) => setDraft((d) => ({ ...d, settings: { ...d.settings, [k]: v } }));

  return (
    <div className={card}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Icon className="h-4 w-4 text-orange-600" />
        <input className={`${input} max-w-xs font-semibold`} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} aria-label="Channel name" />
        <label className="ml-auto flex items-center gap-1.5 text-xs text-gray-600">
          <input type="checkbox" checked={draft.enabled} onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })} /> Accepting requests
        </label>
      </div>

      <div className="space-y-3">
        {ch.channel === 'form' ? (
          <div className="space-y-1">
            <span className="text-xs font-medium text-gray-600">Public link</span>
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <CopyField value={formUrl} label="form link" />
              </div>
              <a className={btnGhost} href={formUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="h-3.5 w-3.5" /> Open
              </a>
            </div>
          </div>
        ) : null}
        {ch.channel === 'email' ? (
          <div className="space-y-1">
            <span className="text-xs font-medium text-gray-600">Forward or send emails to</span>
            {ch.emailAddress ? <CopyField value={ch.emailAddress} label="email address" /> : <p className="text-xs text-rose-600">Inbound email domain is not configured.</p>}
            <p className="text-xs text-gray-500">The subject becomes the task name; the body and attachments are added to the task. Auto-replies are ignored.</p>
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-xs font-medium text-gray-600">
            New tasks go to list
            <select className={input} value={draft.taskListId} onChange={(e) => setDraft({ ...draft, taskListId: e.target.value })}>
              <option value="">Default list</option>
              {taskLists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-xs font-medium text-gray-600">
            Priority
            <select className={input} value={draft.settings.priority || 'medium'} onChange={(e) => setSetting('priority', e.target.value)}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </label>
        </div>

        {ch.channel === 'form' ? (
          <>
            <label className="block space-y-1 text-xs font-medium text-gray-600">
              Intro shown above the form
              <textarea className={input} rows={2} value={draft.settings.intro || ''} onChange={(e) => setSetting('intro', e.target.value)} />
            </label>
            <label className="block space-y-1 text-xs font-medium text-gray-600">
              Thank-you message
              <input className={input} value={draft.settings.successMessage || ''} placeholder="Thanks! Your request was received." onChange={(e) => setSetting('successMessage', e.target.value)} />
            </label>
            <FieldEditor fields={draft.fields} onChange={(fields) => setDraft({ ...draft, fields })} />
          </>
        ) : null}
        {ch.channel === 'email' ? (
          <label className="block space-y-1 text-xs font-medium text-gray-600">
            Only accept senders from these domains (optional, comma separated)
            <input
              className={input}
              placeholder="client.com, partner.org"
              value={(draft.settings.allowedSenderDomains || []).join(', ')}
              onChange={(e) => setSetting('allowedSenderDomains', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
            />
          </label>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
        <span className="text-xs text-gray-500">
          {ch.submissionCount} task{ch.submissionCount === 1 ? '' : 's'} created
          {ch.lastSubmissionAt ? ` · last ${new Date(ch.lastSubmissionAt).toLocaleString()}` : ''}
        </span>
        <div className="ml-auto flex gap-2">
          <button type="button" className={btnGhost} disabled={busy} onClick={() => onRotate(ch)} title="The old link or address stops working">
            <RefreshCw className="h-3.5 w-3.5" /> New {ch.channel === 'email' ? 'address' : 'link'}
          </button>
          <button type="button" className={btnDanger} disabled={busy} onClick={() => onDelete(ch)}>
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </button>
          <button
            type="button"
            className={btnPrimary}
            disabled={busy}
            onClick={() => onSave(ch, { ...draft, taskListId: draft.taskListId ? Number(draft.taskListId) : null, fields: ch.channel === 'form' ? draft.fields : undefined })}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProjectIntakePanel({ projectId }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await strapiClient.get(`/pm-intake/projects/${projectId}`);
      setData(res?.data || null);
      setError('');
    } catch (e) {
      setError(e?.message || 'Could not load intake settings');
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (fn, ok) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await fn();
      if (ok) setNotice(ok);
      await load();
    } catch (e) {
      setError(e?.message || 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  if (!data && !error) return <div className="flex justify-center py-12"><LoadingSpinner /></div>;
  if (!data) return <div className={`${card} text-sm text-rose-700`}>{error}</div>;

  const { channels, availability, taskLists } = data;

  return (
    <div className="space-y-4">
      <div className={card}>
        <h3 className="text-sm font-semibold text-gray-900">Intake</h3>
        <p className="mt-1 text-sm text-gray-600">Turn requests from outside into tasks in this project. Each request becomes a task with the sender&apos;s details.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {Object.entries(availability).map(([key, a]) => {
            const Icon = ICONS[key] || FileText;
            return (
              <button
                key={key}
                type="button"
                className={a.available ? btnGhost : `${btnGhost} cursor-not-allowed`}
                disabled={busy || !a.available}
                title={a.available ? `Add ${a.label.toLowerCase()} intake` : a.reason}
                onClick={() => run(() => strapiClient.post(`/pm-intake/projects/${projectId}`, { channel: key }), `${a.label} intake added`)}
              >
                <Icon className="h-3.5 w-3.5" /> {a.available ? `Add ${a.label.toLowerCase()}` : `${a.label}: not available yet`}
              </button>
            );
          })}
        </div>
        {Object.entries(availability)
          .filter(([, a]) => !a.available)
          .map(([key, a]) => (
            <p key={key} className="mt-2 text-xs text-gray-500">
              {a.reason}
            </p>
          ))}
        {error ? <p className="mt-3 text-sm text-rose-700">{error}</p> : null}
        {notice ? <p className="mt-3 text-sm text-emerald-700">{notice}</p> : null}
      </div>

      {channels.length === 0 ? <p className="px-1 text-sm text-gray-500">No intake channels yet.</p> : null}
      {channels.map((ch) => (
        <ChannelCard
          key={`${ch.id}-${ch.secret}`}
          ch={ch}
          taskLists={taskLists}
          busy={busy}
          onSave={(c, body) => run(() => strapiClient.put(`/pm-intake/channels/${c.id}`, body), 'Saved')}
          onRotate={(c) => window.confirm('Create a new link/address? The current one stops working.') && run(() => strapiClient.post(`/pm-intake/channels/${c.id}/rotate`), 'New link created')}
          onDelete={(c) => window.confirm(`Delete "${c.name}"? Tasks already created stay.`) && run(() => strapiClient.delete(`/pm-intake/channels/${c.id}`), 'Deleted')}
        />
      ))}
    </div>
  );
}
