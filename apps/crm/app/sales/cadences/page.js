'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowDown, ArrowUp, CalendarDays, Plus, Trash2 } from 'lucide-react';
import { Button, Card, IS_SAAS_PLATFORM } from '@webfudge/ui';
import CRMPageHeader from '../../../components/CRMPageHeader';
import cadenceService, { STEP_TYPE_LABELS, STOP_REASON_LABELS } from '../../../lib/api/cadenceService';
import { canWriteCRM } from '../../../lib/rbac';

const EMPTY = {
  name: '',
  description: '',
  steps: [
    { day: 1, type: 'call', title: 'Intro call with {{company}}', subject: '', body: '' },
    { day: 2, type: 'whatsapp', title: '', subject: '', body: 'Hi {{firstName}}, this is {{ownerName}}. Following up on your enquiry.' },
    { day: 4, type: 'email', title: '', subject: 'Quick question, {{firstName}}', body: 'Hi {{firstName}},\n\nI wanted to follow up about {{company}}. Would a short call this week work?\n\n{{ownerName}}' },
  ],
};

const inputCls = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none';
const fmt = (d) => (d ? new Date(d).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—');

function StepEditor({ step, index, count, channels, onChange, onMove, onRemove }) {
  const unavailable = channels.find((c) => c.key === step.type && c.available === false);
  return (
    <div className="rounded-lg border border-gray-200 p-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-gray-500">Day</span>
        <input type="number" min={1} max={90} value={step.day} onChange={(e) => onChange({ day: Number(e.target.value) })} className="w-16 rounded-lg border border-gray-200 px-2 py-1 text-sm" aria-label="Day" />
        <select value={step.type} onChange={(e) => onChange({ type: e.target.value })} className="rounded-lg border border-gray-200 px-2 py-1 text-sm" aria-label="Step type">
          {Object.entries(STEP_TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}{channels.find((c) => c.key === k && c.available === false) ? ' (not available yet)' : ''}</option>
          ))}
        </select>
        <div className="ml-auto flex gap-1">
          <button type="button" disabled={index === 0} onClick={() => onMove(-1)} className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30" aria-label="Move up"><ArrowUp className="h-4 w-4" /></button>
          <button type="button" disabled={index === count - 1} onClick={() => onMove(1)} className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30" aria-label="Move down"><ArrowDown className="h-4 w-4" /></button>
          <button type="button" onClick={onRemove} className="p-1 text-gray-400 hover:text-red-600" aria-label="Remove step"><Trash2 className="h-4 w-4" /></button>
        </div>
      </div>
      {(step.type === 'call' || step.type === 'task') && (
        <input className={inputCls} placeholder="Task title, e.g. Intro call with {{company}}" value={step.title} onChange={(e) => onChange({ title: e.target.value })} />
      )}
      {step.type === 'email' && (
        <input className={inputCls} placeholder="Subject" value={step.subject} onChange={(e) => onChange({ subject: e.target.value })} />
      )}
      <textarea
        className={`${inputCls} min-h-[70px]`}
        placeholder={step.type === 'email' || step.type === 'whatsapp' ? 'Message' : 'Notes for the task (optional)'}
        value={step.body}
        onChange={(e) => onChange({ body: e.target.value })}
      />
      {unavailable && (
        <p className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1">
          {unavailable.reason} Until then this step creates a task for the rep with the message to send.
        </p>
      )}
    </div>
  );
}

export default function CadencesPage() {
  const canWrite = canWriteCRM('leads');
  const [cadences, setCadences] = useState([]);
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null); // { id?, name, description, steps }
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [enrollments, setEnrollments] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await cadenceService.list();
      setCadences(res?.data || []);
      setChannels(res?.meta?.channels || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!form?.id) return setEnrollments([]);
    cadenceService.enrollments({ cadenceId: form.id }).then((r) => setEnrollments(r?.data || [])).catch(() => setEnrollments([]));
  }, [form?.id]);

  if (!IS_SAAS_PLATFORM) {
    return <div className="p-6 text-sm text-gray-500">Cadences are available in Fudge Grow.</div>;
  }

  const setStep = (i, patch) => setForm((f) => ({ ...f, steps: f.steps.map((s, j) => (j === i ? { ...s, ...patch } : s)) }));
  const moveStep = (i, dir) =>
    setForm((f) => {
      const steps = [...f.steps];
      const [s] = steps.splice(i, 1);
      steps.splice(i + dir, 0, s);
      return { ...f, steps };
    });

  async function save() {
    setSaving(true);
    setError('');
    try {
      const payload = { name: form.name, description: form.description, steps: form.steps };
      const res = form.id ? await cadenceService.update(form.id, payload) : await cadenceService.create(payload);
      setForm({ ...res.data });
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(c) {
    await cadenceService.update(c.id, { status: c.status === 'active' ? 'paused' : 'active' });
    await load();
  }

  async function archive(c) {
    if (!window.confirm(`Archive "${c.name}"? Leads in it stop getting steps.`)) return;
    await cadenceService.archive(c.id);
    if (form?.id === c.id) setForm(null);
    await load();
  }

  async function stop(e) {
    await cadenceService.stopEnrollment(e.id);
    const r = await cadenceService.enrollments({ cadenceId: form.id });
    setEnrollments(r?.data || []);
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <CRMPageHeader
        title="Cadences"
        subtitle="Follow-up sequences by day. Each lead stops getting steps as soon as they reply."
        breadcrumb={[{ label: 'Sales', href: '/sales' }, { label: 'Cadences', href: '/sales/cadences' }]}
      />
      <div className="flex flex-wrap gap-2">
        {canWrite && (
          <Button onClick={() => setForm({ ...EMPTY, steps: EMPTY.steps.map((s) => ({ ...s })) })}>
            <Plus className="h-4 w-4 mr-1 inline" /> New cadence
          </Button>
        )}
        <Link href="/meetings/booking-page">
          <Button variant="outline"><CalendarDays className="h-4 w-4 mr-1 inline" /> My booking page</Button>
        </Link>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <Card className="rounded-xl p-0 overflow-hidden">
          {loading ? (
            <p className="p-4 text-sm text-gray-500">Loading…</p>
          ) : cadences.length === 0 ? (
            <p className="p-4 text-sm text-gray-500">No cadences yet. Create one, then enrol leads from a lead&apos;s page.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {cadences.map((c) => (
                <li key={c.id} className={`p-4 flex items-start gap-3 ${form?.id === c.id ? 'bg-orange-50/60' : ''}`}>
                  <button type="button" className="text-left flex-1 min-w-0" onClick={() => setForm({ ...c })}>
                    <p className="font-medium text-gray-900 truncate">{c.name}</p>
                    <p className="text-xs text-gray-500">
                      {c.steps.map((s) => `Day ${s.day} ${STEP_TYPE_LABELS[s.type]}`).join(' · ')}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{c.activeCount} running · {c.totalCount} enrolled{c.status === 'paused' ? ' · paused' : ''}</p>
                  </button>
                  {canWrite && (
                    <div className="flex flex-col gap-1 text-xs">
                      <button type="button" className="text-orange-600 hover:underline" onClick={() => toggleStatus(c)}>{c.status === 'active' ? 'Pause' : 'Resume'}</button>
                      <button type="button" className="text-gray-500 hover:text-red-600" onClick={() => archive(c)}>Archive</button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>

        {form && (
          <Card className="rounded-xl p-4 space-y-3">
            <input className={inputCls} placeholder="Cadence name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} disabled={!canWrite} />
            <textarea className={inputCls} placeholder="What is it for? (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} disabled={!canWrite} />
            <p className="text-xs text-gray-500">
              Day 1 runs when the lead is enrolled. Placeholders: {'{{firstName}} {{lastName}} {{company}} {{ownerName}}'}. Emails go from your workspace mail sender.
            </p>
            <div className="space-y-2">
              {form.steps.map((s, i) => (
                <StepEditor
                  key={i}
                  step={s}
                  index={i}
                  count={form.steps.length}
                  channels={channels}
                  onChange={(patch) => setStep(i, patch)}
                  onMove={(dir) => moveStep(i, dir)}
                  onRemove={() => setForm((f) => ({ ...f, steps: f.steps.filter((_, j) => j !== i) }))}
                />
              ))}
            </div>
            {canWrite && (
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => setForm((f) => ({ ...f, steps: [...f.steps, { day: (f.steps.at(-1)?.day || 0) + 2, type: 'task', title: '', subject: '', body: '' }] }))}>
                  Add step
                </Button>
                <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : form.id ? 'Save changes' : 'Create cadence'}</Button>
              </div>
            )}

            {form.id && (
              <div className="pt-2">
                <h3 className="text-sm font-semibold text-gray-800 mb-2">Leads in this cadence</h3>
                {enrollments.length === 0 ? (
                  <p className="text-xs text-gray-500">Nobody yet. Open a lead and use “Enrol in cadence”.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-gray-500">
                          <th className="py-1 pr-2">Lead</th><th className="py-1 pr-2">Status</th><th className="py-1 pr-2">Next step</th><th />
                        </tr>
                      </thead>
                      <tbody>
                        {enrollments.map((e) => (
                          <tr key={e.id} className="border-t border-gray-100">
                            <td className="py-1.5 pr-2">
                              {e.leadCompany ? <Link className="text-orange-600 hover:underline" href={`/sales/lead-companies/${e.leadCompany.id}`}>{e.leadCompany.companyName}</Link> : '—'}
                            </td>
                            <td className="py-1.5 pr-2">{e.status === 'stopped' ? STOP_REASON_LABELS[e.stopReason] || 'Stopped' : e.status === 'active' ? 'Running' : 'Completed'}</td>
                            <td className="py-1.5 pr-2">{e.status === 'active' ? fmt(e.nextRunAt) : '—'}</td>
                            <td className="py-1.5 text-right">
                              {canWrite && e.status === 'active' && (
                                <button type="button" className="text-xs text-gray-500 hover:text-red-600" onClick={() => stop(e)}>Stop</button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
