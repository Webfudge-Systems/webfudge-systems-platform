'use client';

/**
 * Project → Client portal tab (W10). Share the project with its client account, choose which tasks
 * and files the client sees, invite client contacts by magic link and revoke them.
 * Client contacts never need a Work seat.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, Copy, ExternalLink, FileText, Globe2, Mail, ShieldOff, UserCheck } from 'lucide-react';
import { LoadingSpinner } from '@webfudge/ui';
import strapiClient from '../lib/strapiClient';

const APPROVAL = {
  pending: { label: 'Waiting for client', cls: 'bg-amber-50 text-amber-700 ring-amber-200' },
  approved: { label: 'Client approved', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  changes_requested: { label: 'Changes requested', cls: 'bg-rose-50 text-rose-700 ring-rose-200' },
};
const TYPE_LABEL = { deliverable: 'Deliverable', milestone: 'Milestone', bug: 'Bug', task: 'Task' };

const card = 'rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5';
const btn = 'inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50';
const btnPrimary = `${btn} bg-orange-600 text-white hover:bg-orange-700`;
const btnGhost = `${btn} border border-gray-200 bg-white text-gray-700 hover:bg-gray-50`;
const btnDanger = `${btn} border border-rose-200 bg-white text-rose-700 hover:bg-rose-50`;

function Switch({ checked, onChange, disabled, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-50 ${checked ? 'bg-orange-600' : 'bg-gray-300'}`}
    >
      <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  );
}

const absUrl = (url) => (url && url.startsWith('/') ? `${strapiClient.baseURL}${url}` : url);
const when = (d) => (d ? new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : null);

export default function ProjectClientPortalPanel({ projectId, canEdit = true }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await strapiClient.get(`/client-portal/projects/${projectId}`);
      setData(res?.data || null);
      setError('');
    } catch (e) {
      setError(e?.message || 'Could not load the client portal settings');
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (key, fn, okMessage) => {
    setBusy(key);
    setError('');
    setNotice('');
    try {
      await fn();
      if (okMessage) setNotice(okMessage);
      await load();
    } catch (e) {
      setError(e?.message || 'Something went wrong');
    } finally {
      setBusy(null);
    }
  };

  const portalUrl = typeof window !== 'undefined' ? `${window.location.origin}/portal` : '/portal';
  const canManage = Boolean(data?.canManage) && canEdit;
  const visibleCount = useMemo(() => (data?.tasks || []).filter((t) => t.clientVisible).length, [data]);
  const sharedFiles = useMemo(() => (data?.files || []).filter((f) => f.clientShareable).length, [data]);

  if (!data && !error) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner />
      </div>
    );
  }
  if (!data) return <div className={`${card} text-sm text-rose-700`}>{error}</div>;

  const noClient = !data.clientAccount;

  return (
    <div className="space-y-5">
      {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div> : null}
      {notice ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</div> : null}

      <section className={card}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900">
              <Globe2 className="h-4 w-4 text-orange-600" /> Client portal
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              {noClient
                ? 'Link this project to a client account to share it.'
                : data.enabled
                  ? `Shared with ${data.clientAccount.name}. Invited contacts see progress, ${visibleCount} task${visibleCount === 1 ? '' : 's'} and ${sharedFiles} file${sharedFiles === 1 ? '' : 's'} you mark below.`
                  : `Not shared. Turn this on to let ${data.clientAccount.name}'s invited contacts follow the project.`}
            </p>
            <p className="mt-1 text-xs text-gray-500">Client contacts sign in with an email link. They never use a Work seat.</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700">{data.enabled ? 'Shared' : 'Off'}</span>
            <Switch
              label="Share this project with the client"
              checked={data.enabled}
              disabled={!canManage || noClient || busy === 'share' || data.featureAvailable === false}
              onChange={(enabled) =>
                run('share', () => strapiClient.put(`/client-portal/projects/${projectId}/sharing`, { enabled }), enabled ? 'Project shared with the client.' : 'Project is no longer shared.')
              }
            />
          </div>
        </div>
        {data.featureAvailable === false ? (
          <p className="mt-3 text-xs text-amber-700">The client portal is not included in your current plan.</p>
        ) : null}
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
          <span className="font-medium">Portal address:</span>
          <code className="min-w-0 break-all text-gray-800">{portalUrl}</code>
          <button
            type="button"
            className={btnGhost}
            onClick={() => {
              navigator.clipboard?.writeText(portalUrl);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </section>

      <section className={card}>
        <h3 className="text-sm font-semibold text-gray-900">Client contacts</h3>
        <p className="mt-0.5 text-xs text-gray-500">
          Contacts on {data.clientAccount?.name || 'the client account'} in Grow. Inviting one emails a sign-in link that works once for 15 minutes.
        </p>
        {data.contacts.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">
            {noClient ? 'No client account yet.' : 'This client account has no contacts yet. Add them in Grow first.'}
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-gray-100">
            {data.contacts.map((c) => (
              <li key={c.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">{c.name}</p>
                  <p className="truncate text-xs text-gray-500">
                    {c.email || 'No email'}
                    {c.portalAccess ? (
                      <span className="ml-2 inline-flex items-center gap-1 text-emerald-700">
                        <UserCheck className="h-3 w-3" /> Has access{c.lastActiveAt ? ` · last seen ${when(c.lastActiveAt)}` : ' · not signed in yet'}
                      </span>
                    ) : null}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    className={c.portalAccess ? btnGhost : btnPrimary}
                    disabled={!canManage || !c.email || busy === `invite-${c.id}` || data.featureAvailable === false}
                    onClick={() =>
                      run(`invite-${c.id}`, () => strapiClient.post(`/client-portal/contacts/${c.id}/invite`, { projectId }), `Sign-in link sent to ${c.email}.`)
                    }
                  >
                    <Mail className="h-3.5 w-3.5" /> {c.portalAccess ? 'Resend link' : 'Invite'}
                  </button>
                  {c.portalAccess ? (
                    <button
                      type="button"
                      className={btnDanger}
                      disabled={!canManage || busy === `revoke-${c.id}`}
                      onClick={() => {
                        if (!window.confirm(`Remove ${c.name}'s portal access? They are signed out at once.`)) return;
                        run(`revoke-${c.id}`, () => strapiClient.post(`/client-portal/contacts/${c.id}/revoke`, { projectId }), `${c.name} no longer has portal access.`);
                      }}
                    >
                      <ShieldOff className="h-3.5 w-3.5" /> Revoke
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={card}>
        <h3 className="text-sm font-semibold text-gray-900">What the client sees</h3>
        <p className="mt-0.5 text-xs text-gray-500">
          Tasks are hidden from the client until you switch them on. Sharing a deliverable asks the client to approve it.
        </p>
        {data.tasks.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">No tasks in this project yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-gray-100">
            {data.tasks.map((t) => {
              const approval = t.type === 'deliverable' && t.clientVisible ? APPROVAL[t.approval.status] : null;
              return (
                <li key={t.id} className="flex items-start gap-3 py-2.5">
                  <Switch
                    label={`Show ${t.name} to the client`}
                    checked={t.clientVisible}
                    disabled={!canEdit || busy === `task-${t.id}`}
                    onChange={(clientVisible) => run(`task-${t.id}`, () => strapiClient.put(`/client-portal/tasks/${t.id}`, { clientVisible }))}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <Link href={`/tasks/${t.id}`} className={`truncate text-sm hover:text-orange-600 ${t.isSubtask ? 'text-gray-600' : 'font-medium text-gray-900'}`}>
                        {t.isSubtask ? '↳ ' : ''}
                        {t.name}
                      </Link>
                      {t.type !== 'task' ? <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] font-medium text-gray-600">{TYPE_LABEL[t.type] || t.type}</span> : null}
                      {t.requestedBy ? <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[11px] font-medium text-blue-700">Client request · {t.requestedBy}</span> : null}
                      {approval ? <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ring-1 ${approval.cls}`}>{approval.label}</span> : null}
                    </div>
                    {approval && t.approval.comment ? <p className="mt-1 text-xs text-gray-600">“{t.approval.comment}”</p> : null}
                  </div>
                  {t.type === 'deliverable' && t.clientVisible && t.approval.status !== 'pending' ? (
                    <button
                      type="button"
                      className={btnGhost}
                      disabled={!canEdit || busy === `ask-${t.id}`}
                      onClick={() => run(`ask-${t.id}`, () => strapiClient.put(`/client-portal/tasks/${t.id}`, { requestApproval: true }), 'Asked the client to review it again.')}
                    >
                      Ask again
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className={card}>
        <h3 className="text-sm font-semibold text-gray-900">Shared files</h3>
        <p className="mt-0.5 text-xs text-gray-500">Files on this project and its tasks. Only the ones you switch on reach the client (task files also need the task to be visible).</p>
        {data.files.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">No files yet. Upload them in the Files tab or on a task.</p>
        ) : (
          <ul className="mt-3 divide-y divide-gray-100">
            {data.files.map((f) => (
              <li key={f.id} className="flex items-center gap-3 py-2.5">
                <Switch
                  label={`Share ${f.name} with the client`}
                  checked={f.clientShareable}
                  disabled={!canEdit || busy === `file-${f.id}`}
                  onChange={(clientShareable) => run(`file-${f.id}`, () => strapiClient.put(`/client-portal/attachments/${f.id}`, { clientShareable }))}
                />
                <FileText className="h-4 w-4 shrink-0 text-gray-400" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-gray-900">{f.name}</p>
                  {f.taskName ? <p className="truncate text-xs text-gray-500">On task: {f.taskName}</p> : null}
                </div>
                {f.url ? (
                  <a href={absUrl(f.url)} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-orange-600" aria-label={`Open ${f.name}`}>
                    <ExternalLink className="h-4 w-4" />
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
