'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, ChevronDown, ChevronRight, Loader2, Mail, MessageCircle, RefreshCw, Send, Sparkles, Trash2 } from 'lucide-react';
import { Card, IS_SAAS_PLATFORM, LoadingSpinner, PlanGate, UpgradePrompt, planErrorDetails } from '@webfudge/ui';
import PMPageHeader from '../../components/PMPageHeader';
import strapiClient from '../../lib/strapiClient';

/**
 * W17 Status Reporter (SaaS). Every Friday Fudge AI drafts a weekly update per active project from
 * real task activity: a client version and an internal version. Review, edit and send each in one click.
 */

const FEATURE = 'pm.ai_teammates';
const inputClass =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20';

const HEALTH = {
  on_track: { label: 'On track', chip: 'bg-emerald-50 text-emerald-700' },
  at_risk: { label: 'At risk', chip: 'bg-amber-50 text-amber-800' },
  off_track: { label: 'Off track', chip: 'bg-red-50 text-red-700' },
};
const REPORT_STATUS = {
  draft: { label: 'Ready for approval', chip: 'bg-orange-50 text-orange-700' },
  partially_sent: { label: 'Partly sent', chip: 'bg-sky-50 text-sky-700' },
  sent: { label: 'Sent', chip: 'bg-emerald-50 text-emerald-700' },
  discarded: { label: 'Discarded', chip: 'bg-gray-100 text-gray-600' },
};
const VERSION_STATE = {
  pending: 'Waiting for approval',
  draft: 'Draft',
  sending: 'Sending…',
  sent: 'Sent',
  discarded: 'Discarded',
  failed: 'Failed',
  no_recipients: 'No recipients yet',
};
const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'Hindi' },
  { value: 'mr', label: 'Marathi' },
];

const fmtDate = (v) => (v ? new Date(v).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '');
const fmtWhen = (v) => (v ? new Date(v).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');

function ErrorNotice({ error, onClose }) {
  if (!error) return null;
  const plan = planErrorDetails(error);
  if (plan) return <UpgradePrompt {...plan} compact />;
  const code = error?.details?.code;
  const message =
    code === 'AI_DISABLED'
      ? 'Fudge AI is not switched on for this workspace yet.'
      : code === 'AI_NOT_CONFIGURED'
        ? 'Fudge AI is not configured on this server yet (no AI provider key). Ask your admin.'
        : error?.message || 'Something went wrong.';
  return (
    <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
      <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
      <span className="flex-1">{message}</span>
      {onClose && (
        <button type="button" onClick={onClose} className="text-red-700 underline">
          Dismiss
        </button>
      )}
    </div>
  );
}

function VersionEditor({ report, audience, channels, onChanged }) {
  const v = report.versions?.[audience];
  const [subject, setSubject] = useState(v?.subject || '');
  const [body, setBody] = useState(v?.body || '');
  const [recipients, setRecipients] = useState((v?.recipients || []).join(', '));
  const [channel, setChannel] = useState(v?.channel || 'email');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    setSubject(v?.subject || '');
    setBody(v?.body || '');
    setRecipients((v?.recipients || []).join(', '));
    setChannel(v?.channel || 'email');
  }, [v?.subject, v?.body, v?.recipients, v?.channel]);

  if (!v) return <p className="text-sm text-gray-500">No {audience} version.</p>;
  const locked = v.state === 'sent' || v.state === 'sending' || v.state === 'discarded';
  const edits = { subject, body, recipients };

  const run = async (kind) => {
    setBusy(kind);
    setError(null);
    try {
      let res;
      if (kind === 'send') res = await strapiClient.post(`/status-reports/${report.id}/send`, { audience, channel, ...edits });
      else if (kind === 'save') res = await strapiClient.put(`/status-reports/${report.id}`, { [audience]: { ...edits, channel } });
      else res = await strapiClient.post(`/status-reports/${report.id}/discard`, { audience });
      onChanged(res.data);
    } catch (e) {
      setError(e);
      if (kind === 'send') onChanged(null); // refresh: a failed send is recorded
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className={`rounded-full px-2 py-0.5 font-medium ${v.state === 'sent' ? 'bg-emerald-50 text-emerald-700' : v.state === 'failed' ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
          {VERSION_STATE[v.state] || v.state}
        </span>
        {v.state === 'sent' && v.sentAt && <span className="text-gray-500">on {fmtWhen(v.sentAt)}</span>}
        {v.deliveryNote && <span className="text-amber-700">{v.deliveryNote}</span>}
        {v.state === 'failed' && v.error && <span className="text-red-700">{v.error}</span>}
      </div>

      <label className="block text-sm">
        <span className="mb-1 block font-medium text-gray-700">
          {audience === 'client' ? 'Client recipients' : 'Team recipients'} <span className="font-normal text-gray-500">(comma separated)</span>
        </span>
        <input className={inputClass} value={recipients} onChange={(e) => setRecipients(e.target.value)} disabled={locked} placeholder="name@company.com" />
      </label>

      <fieldset className="text-sm">
        <legend className="mb-1 font-medium text-gray-700">Send by</legend>
        <div className="flex flex-wrap gap-2">
          {channels.map((c) => (
            <label
              key={c.key}
              title={c.available ? '' : c.reason || ''}
              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 ${channel === c.key ? 'border-orange-500 bg-orange-50' : 'border-gray-300'} ${c.available ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}
            >
              <input type="radio" name={`ch-${report.id}-${audience}`} value={c.key} checked={channel === c.key} disabled={!c.available || locked} onChange={() => setChannel(c.key)} className="sr-only" />
              {c.key === 'whatsapp' ? <MessageCircle className="h-4 w-4" aria-hidden="true" /> : <Mail className="h-4 w-4" aria-hidden="true" />}
              {c.label}
              {!c.available && <span className="text-xs text-gray-500">· not available yet</span>}
            </label>
          ))}
        </div>
        {channels.some((c) => !c.available) && <p className="mt-1 text-xs text-gray-500">{channels.find((c) => !c.available)?.reason}</p>}
      </fieldset>

      <label className="block text-sm">
        <span className="mb-1 block font-medium text-gray-700">Subject</span>
        <input className={inputClass} value={subject} onChange={(e) => setSubject(e.target.value)} disabled={locked} />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-medium text-gray-700">Message</span>
        <textarea className={`${inputClass} min-h-[260px] font-mono text-[13px] leading-relaxed`} value={body} onChange={(e) => setBody(e.target.value)} disabled={locked} />
      </label>

      <ErrorNotice error={error} onClose={() => setError(null)} />

      {!locked && report.canSend && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => run('send')}
            disabled={Boolean(busy)}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-full bg-[#F5630F] px-4 text-sm font-semibold text-[#0F0F0F] hover:bg-[#E85A0A] disabled:opacity-60"
          >
            {busy === 'send' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
            Approve and send {audience} update
          </button>
          <button type="button" onClick={() => run('save')} disabled={Boolean(busy)} className="inline-flex min-h-[40px] items-center gap-2 rounded-full border border-gray-300 px-4 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-60">
            {busy === 'save' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />}
            Save draft
          </button>
          <button type="button" onClick={() => run('discard')} disabled={Boolean(busy)} className="inline-flex min-h-[40px] items-center gap-2 rounded-full px-3 text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-60">
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Discard
          </button>
        </div>
      )}
      {!locked && !report.canSend && <p className="text-sm text-gray-500">Only the project manager, PM managers or admins can send this update.</p>}
    </div>
  );
}

function ReportCard({ report, channels, open, onToggle, onChanged }) {
  const [audience, setAudience] = useState(report.versions?.client ? 'client' : 'internal');
  const health = HEALTH[report.health];
  const status = REPORT_STATUS[report.status] || REPORT_STATUS.draft;
  return (
    <Card className="overflow-hidden p-0">
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-50">
        {open ? <ChevronDown className="h-4 w-4 text-gray-500" aria-hidden="true" /> : <ChevronRight className="h-4 w-4 text-gray-500" aria-hidden="true" />}
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-gray-900">{report.project?.name || 'Project'}</p>
          <p className="truncate text-xs text-gray-500">
            {report.project?.client ? `${report.project.client} · ` : ''}
            Week of {fmtDate(report.periodStart)} · {report.source === 'scheduled' ? 'Friday draft' : 'Written on request'}
            {report.activity ? ` · ${report.activity.doneThisWeek} done, ${report.activity.blockedOrOverdue} blocked or overdue` : ''}
          </p>
        </div>
        {health && <span className={`hidden rounded-full px-2 py-0.5 text-xs font-medium sm:inline ${health.chip}`}>{health.label}</span>}
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.chip}`}>{status.label}</span>
      </button>
      {open && (
        <div className="border-t border-gray-100 px-4 py-4">
          <div role="tablist" className="mb-4 inline-flex rounded-full bg-gray-100 p-1 text-sm">
            {['client', 'internal'].map((a) => (
              <button
                key={a}
                type="button"
                role="tab"
                aria-selected={audience === a}
                onClick={() => setAudience(a)}
                className={`rounded-full px-4 py-1.5 font-medium ${audience === a ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'}`}
              >
                {a === 'client' ? 'Client version' : 'Internal version'}
                <span className="ml-1 text-xs text-gray-500">· {VERSION_STATE[report.versions?.[a]?.state] || '—'}</span>
              </button>
            ))}
          </div>
          <VersionEditor key={`${report.id}-${audience}`} report={report} audience={audience} channels={channels} onChanged={onChanged} />
          <p className="mt-4 text-xs text-gray-400">
            Written by Fudge AI{report.model ? ` (${report.model})` : ''} {report.generatedAt ? `on ${fmtWhen(report.generatedAt)}` : ''} · {report.creditsUsed} AI credit{report.creditsUsed === 1 ? '' : 's'}
          </p>
        </div>
      )}
    </Card>
  );
}

function WeeklyUpdates() {
  const [reports, setReports] = useState(null);
  const [meta, setMeta] = useState({ channels: [] });
  const [projects, setProjects] = useState([]);
  const [scope, setScope] = useState('week');
  const [openId, setOpenId] = useState(null);
  const [error, setError] = useState(null);
  const [gen, setGen] = useState({ projectId: '', language: 'en', busy: false, error: null });

  const load = useCallback(async () => {
    setError(null);
    try {
      const first = await strapiClient.get('/status-reports', { limit: 100 });
      const week = first.meta?.weekKey;
      setMeta(first.meta || { channels: [] });
      setReports(scope === 'week' ? (first.data || []).filter((r) => r.weekKey === week) : first.data || []);
    } catch (e) {
      setError(e);
      setReports([]);
    }
  }, [scope]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    strapiClient
      .get('/projects', { 'pagination[pageSize]': 200, 'fields[0]': 'name', 'fields[1]': 'status' })
      .then((res) => setProjects((res.data || []).map((p) => ({ id: p.id, name: p.name ?? p.attributes?.name, status: p.status ?? p.attributes?.status }))))
      .catch(() => setProjects([]));
  }, []);

  const openProjects = useMemo(() => projects.filter((p) => !['completed', 'cancelled', 'archived'].includes(String(p.status || '').toLowerCase())), [projects]);

  const onChanged = (updated) => {
    if (!updated) return load();
    setReports((rows) => (rows || []).map((r) => (r.id === updated.id ? updated : r)));
  };

  const generate = async (e) => {
    e.preventDefault();
    if (!gen.projectId) return;
    setGen((g) => ({ ...g, busy: true, error: null }));
    try {
      const res = await strapiClient.post('/status-reports/generate', { projectId: Number(gen.projectId), language: gen.language });
      setReports((rows) => [res.data, ...(rows || []).filter((r) => r.id !== res.data.id)]);
      setOpenId(res.data.id);
      setGen((g) => ({ ...g, busy: false }));
    } catch (err) {
      setGen((g) => ({ ...g, busy: false, error: err }));
    }
  };

  const pending = (reports || []).filter((r) => r.status === 'draft' || r.status === 'partially_sent').length;

  return (
    <div className="space-y-5">
      <Card className="p-4">
        <form onSubmit={generate} className="flex flex-col gap-3 md:flex-row md:items-end">
          <label className="flex-1 text-sm">
            <span className="mb-1 block font-medium text-gray-700">Write this week&apos;s update now</span>
            <select className={inputClass} value={gen.projectId} onChange={(e) => setGen((g) => ({ ...g, projectId: e.target.value }))}>
              <option value="">Pick a project</option>
              {openProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm md:w-40">
            <span className="mb-1 block font-medium text-gray-700">Language</span>
            <select className={inputClass} value={gen.language} onChange={(e) => setGen((g) => ({ ...g, language: e.target.value }))}>
              {LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            disabled={!gen.projectId || gen.busy}
            className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-full bg-gray-900 px-4 text-sm font-semibold text-white hover:bg-black disabled:opacity-50"
          >
            {gen.busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Sparkles className="h-4 w-4" aria-hidden="true" />}
            {gen.busy ? 'Writing…' : 'Write update'}
          </button>
        </form>
        <p className="mt-2 text-xs text-gray-500">Drafts for every active project are written automatically on Fridays at 4 pm. Nothing is sent until you approve it.</p>
        {gen.error && (
          <div className="mt-3">
            <ErrorNotice error={gen.error} onClose={() => setGen((g) => ({ ...g, error: null }))} />
          </div>
        )}
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-full bg-gray-100 p-1 text-sm">
          {[
            ['week', 'This week'],
            ['all', 'All weeks'],
          ].map(([k, label]) => (
            <button key={k} type="button" onClick={() => setScope(k)} className={`rounded-full px-4 py-1.5 font-medium ${scope === k ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'}`}>
              {label}
            </button>
          ))}
        </div>
        {pending > 0 && <span className="text-sm text-gray-600">{pending} waiting for approval</span>}
        <button type="button" onClick={load} className="ml-auto inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100">
          <RefreshCw className="h-4 w-4" aria-hidden="true" /> Refresh
        </button>
      </div>

      <ErrorNotice error={error} />

      {reports === null ? (
        <div className="flex justify-center py-10">
          <LoadingSpinner />
        </div>
      ) : reports.length === 0 && !error ? (
        <Card className="p-8 text-center text-sm text-gray-600">
          {scope === 'week' ? 'No updates for this week yet. They are drafted on Friday afternoon, or write one now above.' : 'No weekly updates yet.'}
        </Card>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <ReportCard key={r.id} report={r} channels={meta.channels || []} open={openId === r.id} onToggle={() => setOpenId((id) => (id === r.id ? null : r.id))} onChanged={onChanged} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function WeeklyUpdatesPage() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <PMPageHeader title="Weekly updates" subtitle="Fudge AI writes each project's weekly update from real task activity. Review it, then send the client and team versions in one click." />
      {IS_SAAS_PLATFORM ? (
        <PlanGate feature={FEATURE}>
          <WeeklyUpdates />
        </PlanGate>
      ) : (
        <p className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-600">Weekly AI updates are available on Webfudge SaaS.</p>
      )}
    </div>
  );
}
