'use client';

/**
 * Project → Risk & scope tab: scope-creep watcher (W19). The SOW is pasted text or a project file;
 * Fudge AI compares client requests (client portal requests and comments) with it, flags out-of-scope
 * work and drafts a change order that waits in the AI approval queue until someone approves it.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown, ChevronRight, FileText, Loader2, Mail, ScanSearch, ShieldAlert, X } from 'lucide-react';
import { LoadingSpinner, UpgradePrompt, planErrorDetails } from '@webfudge/ui';
import strapiClient from '../lib/strapiClient';
import { listEntityAttachments } from '../lib/api/entityAttachmentService';

const VERDICT = {
  out_of_scope: { label: 'Out of scope', cls: 'bg-rose-50 text-rose-700 ring-rose-200' },
  unclear: { label: 'Unclear', cls: 'bg-amber-50 text-amber-800 ring-amber-200' },
  in_scope: { label: 'In scope', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
};
const ORDER_STATUS = {
  pending_approval: { label: 'Change order waiting for approval', cls: 'text-amber-700' },
  executed: { label: 'Change order approved', cls: 'text-emerald-700' },
  rejected: { label: 'Change order rejected', cls: 'text-gray-500' },
  failed: { label: 'Change order failed to send', cls: 'text-rose-700' },
};
const SOURCE = { client_request: 'Client request', change_request: 'Client comment', task: 'Task' };

const card = 'rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5';
const btn = 'inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50';
const btnPrimary = `${btn} bg-orange-600 text-white hover:bg-orange-700`;
const btnGhost = `${btn} border border-gray-200 bg-white text-gray-700 hover:bg-gray-50`;
const when = (d) => (d ? new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '');

function VerdictBadge({ verdict }) {
  const V = VERDICT[verdict] || VERDICT.unclear;
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${V.cls}`}>{V.label}</span>;
}

function SowEditor({ projectId, sow, onSaved }) {
  const [mode, setMode] = useState(sow.source === 'file' ? 'file' : 'text');
  const [text, setText] = useState(sow.text || '');
  const [files, setFiles] = useState(null);
  const [fileId, setFileId] = useState(sow.file?.attachmentId ? String(sow.file.attachmentId) : '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (mode !== 'file' || files) return;
    listEntityAttachments({ subjectType: 'project', subjectId: projectId })
      .then((res) => setFiles(res?.data || []))
      .catch(() => setFiles([]));
  }, [mode, files, projectId]);

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const payload = mode === 'text' ? { sowText: text, sowAttachmentId: null } : { sowText: '', sowAttachmentId: fileId ? Number(fileId) : null };
      await strapiClient.put(`/scope-watch/projects/${projectId}/sow`, payload);
      onSaved();
    } catch (e) {
      setError(e?.message || 'Could not save the SOW');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-3 space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
      <div role="radiogroup" aria-label="Where the SOW comes from" className="flex gap-2">
        {[
          ['text', 'Paste the text'],
          ['file', 'Use a project file'],
        ].map(([key, label]) => (
          <button key={key} type="button" role="radio" aria-checked={mode === key} onClick={() => setMode(key)} className={`${btn} ${mode === key ? 'bg-gray-900 text-white' : 'border border-gray-200 bg-white text-gray-700'}`}>
            {label}
          </button>
        ))}
      </div>
      {mode === 'text' ? (
        <textarea
          className="min-h-[160px] w-full rounded-lg border border-gray-300 bg-white p-2 text-sm"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste the statement of work: deliverables, quantities, revision rounds, exclusions…"
          aria-label="Statement of work text"
        />
      ) : files === null ? (
        <p className="text-sm text-gray-500">Loading project files…</p>
      ) : files.length ? (
        <select className="w-full rounded-lg border border-gray-300 bg-white px-2 py-2 text-sm" value={fileId} onChange={(e) => setFileId(e.target.value)} aria-label="SOW file">
          <option value="">Choose a file…</option>
          {files.map((f) => (
            <option key={f.id} value={f.id}>
              {f.fileName}
            </option>
          ))}
        </select>
      ) : (
        <p className="text-sm text-gray-500">No files on this project yet. Upload the SOW in the Files tab (PDF or text), then pick it here.</p>
      )}
      {mode === 'file' ? <p className="text-xs text-gray-500">Fudge AI reads PDF and text files. For Word files, paste the text instead.</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <button type="button" className={btnPrimary} onClick={save} disabled={saving || (mode === 'text' ? !text.trim() : !fileId)}>
        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
        Save SOW
      </button>
    </div>
  );
}

function CheckRow({ c, canEdit, busy, onDecide, onDismiss }) {
  const order = c.changeOrder;
  const status = order ? ORDER_STATUS[order.status] : null;
  const [open, setOpen] = useState(order?.status === 'pending_approval');
  return (
    <li className="rounded-lg border border-gray-200 p-3">
      <div className="flex flex-wrap items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <VerdictBadge verdict={c.verdict} />
            <span className="text-xs text-gray-500">
              {SOURCE[c.sourceType] || 'Request'}
              {c.requestedBy ? ` from ${c.requestedBy.name}` : ''} · checked {when(c.checkedAt)}
            </span>
          </div>
          <p className="mt-1 text-sm font-medium text-gray-900">{c.title}</p>
          {c.text ? <p className="mt-0.5 line-clamp-3 whitespace-pre-wrap text-xs text-gray-600">{c.text}</p> : null}
          <p className="mt-1.5 text-sm text-gray-700">{c.reason}</p>
          {c.sowReference ? <p className="mt-0.5 text-xs text-gray-500">SOW: {c.sowReference}</p> : null}
          {c.estimateHours ? <p className="mt-0.5 text-xs text-gray-500">Estimated extra effort: {c.estimateHours} h</p> : null}
        </div>
        {canEdit && c.verdict !== 'in_scope' && order?.status !== 'pending_approval' ? (
          <button type="button" className={btnGhost} onClick={() => onDismiss(c)} disabled={Boolean(busy)}>
            Dismiss
          </button>
        ) : null}
      </div>
      {order ? (
        <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50">
          <button type="button" className="flex w-full items-center gap-1.5 px-3 py-2 text-left text-xs font-semibold" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
            {open ? <ChevronDown className="h-3.5 w-3.5" aria-hidden /> : <ChevronRight className="h-3.5 w-3.5" aria-hidden />}
            <Mail className="h-3.5 w-3.5 text-gray-400" aria-hidden />
            <span className={status?.cls}>{status?.label || order.status}</span>
            {order.decidedBy ? <span className="font-normal text-gray-500">by {order.decidedBy.name}</span> : null}
            {order.status === 'executed' && order.delivered === false ? <span className="font-normal text-gray-500">· not emailed (no client email or email not set up)</span> : null}
          </button>
          {open ? (
            <div className="border-t border-gray-200 px-3 py-2 text-sm">
              <p className="text-xs text-gray-500">To: {order.to || 'no client email on file — approving records it without sending'}</p>
              <p className="mt-1 font-semibold text-gray-900">{order.subject}</p>
              <p className="mt-1 whitespace-pre-wrap leading-relaxed text-gray-700">{order.body}</p>
              {order.status === 'pending_approval' && canEdit ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" className={btnPrimary} disabled={Boolean(busy)} onClick={() => onDecide(order, 'approve')}>
                    {busy === `approve-${order.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Check className="h-3.5 w-3.5" aria-hidden />}
                    {order.to ? 'Approve and send' : 'Approve'}
                  </button>
                  <button type="button" className={btnGhost} disabled={Boolean(busy)} onClick={() => onDecide(order, 'reject')}>
                    <X className="h-3.5 w-3.5" aria-hidden /> Reject
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

export default function ProjectScopeWatchPanel({ projectId }) {
  const [data, setData] = useState(null);
  const [meta, setMeta] = useState({});
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [upgrade, setUpgrade] = useState(null);
  const [busy, setBusy] = useState(null);
  const [editing, setEditing] = useState(false);
  const [showResolved, setShowResolved] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await strapiClient.get(`/scope-watch/projects/${projectId}`);
      setData(res?.data || null);
      setMeta(res?.meta || {});
      setError('');
    } catch (e) {
      const p = planErrorDetails(e);
      if (p) setUpgrade(p);
      else setError(e?.message || 'Could not load the scope watcher');
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  const fail = (e, fallback) => {
    const p = planErrorDetails(e);
    if (p) setUpgrade(p);
    else setError(e?.message || fallback);
  };

  const runCheck = async () => {
    setBusy('check');
    setError('');
    setNotice('');
    try {
      const res = await strapiClient.post(`/scope-watch/projects/${projectId}/check`, {});
      const d = res?.data || {};
      setNotice(
        d.message ||
          `Checked ${d.checked?.length || 0} request${d.checked?.length === 1 ? '' : 's'}: ${d.outOfScope || 0} out of scope${d.drafted ? `, ${d.drafted} change order${d.drafted === 1 ? '' : 's'} drafted for approval` : ''}. Used ${d.creditsUsed || 0} AI credit${d.creditsUsed === 1 ? '' : 's'}.`
      );
      await load();
    } catch (e) {
      fail(e, 'Fudge AI could not check the requests');
    } finally {
      setBusy(null);
    }
  };

  const decide = async (order, verb) => {
    setBusy(`${verb}-${order.id}`);
    setError('');
    try {
      await strapiClient.post(`/ai/actions/${order.id}/${verb}`, {});
      setNotice(verb === 'approve' ? (order.to ? `Change order sent to ${order.to}.` : 'Change order approved.') : 'Change order rejected.');
      await load();
    } catch (e) {
      fail(e, `Could not ${verb} the change order`);
    } finally {
      setBusy(null);
    }
  };

  const dismiss = async (c) => {
    setBusy(`dismiss-${c.id}`);
    try {
      await strapiClient.post(`/scope-watch/checks/${c.id}/dismiss`, {});
      await load();
    } catch (e) {
      fail(e, 'Could not dismiss the flag');
    } finally {
      setBusy(null);
    }
  };

  const groups = useMemo(() => {
    const checks = data?.checks || [];
    const open = checks.filter((c) => !c.dismissed && c.verdict !== 'in_scope' && c.changeOrder?.status !== 'rejected');
    const rest = checks.filter((c) => !open.includes(c));
    const rank = (c) => (c.changeOrder?.status === 'pending_approval' ? 0 : c.verdict === 'out_of_scope' ? 1 : 2);
    return { open: open.sort((a, b) => rank(a) - rank(b)), rest };
  }, [data]);

  if (upgrade) return <UpgradePrompt {...upgrade} compact />;
  if (!data && !error) {
    return (
      <div className="flex justify-center py-10">
        <LoadingSpinner />
      </div>
    );
  }
  if (!data) return <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>;

  const { sow } = data;
  const canEdit = Boolean(meta.canEdit);
  return (
    <section className={card} aria-labelledby="scope-watch-title">
      <div className="flex flex-wrap items-start gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
          <ShieldAlert className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="scope-watch-title" className="text-base font-semibold text-gray-900">
            Scope-creep watcher
          </h2>
          <p className="mt-0.5 text-sm text-gray-500">Fudge AI compares client requests with the statement of work and drafts a change order for anything outside it. Nothing is sent until someone approves.</p>
        </div>
        {meta.aiEnabled && canEdit && sow.configured ? (
          <button type="button" className={btnPrimary} onClick={runCheck} disabled={busy === 'check'}>
            {busy === 'check' ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <ScanSearch className="h-3.5 w-3.5" aria-hidden />}
            Check client requests{data.unchecked ? ` (${data.unchecked} new)` : ''}
          </button>
        ) : null}
      </div>

      {!meta.aiEnabled ? <p className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">Fudge AI is not switched on for this workspace yet, so requests cannot be checked.</p> : null}
      {error ? <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      {notice ? <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</p> : null}

      <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 px-3 py-2.5">
        <FileText className="h-4 w-4 text-gray-400" aria-hidden />
        <p className="min-w-0 flex-1 text-sm text-gray-700">
          {sow.configured ? (
            <>
              <span className="font-medium text-gray-900">SOW:</span> {sow.source === 'file' ? sow.file?.name : `pasted text (${sow.text.length.toLocaleString()} characters)`}
              {sow.lastCheckedAt ? <span className="text-gray-500"> · last checked {when(sow.lastCheckedAt)}</span> : null}
            </>
          ) : sow.file?.missing ? (
            'The SOW file was removed from the project. Pick another file or paste the text.'
          ) : (
            'No statement of work yet. Add it so Fudge AI can tell what is in scope.'
          )}
        </p>
        {canEdit ? (
          <button type="button" className={btnGhost} onClick={() => setEditing((v) => !v)} aria-expanded={editing}>
            {editing ? 'Close' : sow.configured ? 'Change SOW' : 'Add SOW'}
          </button>
        ) : null}
      </div>
      {editing ? (
        <SowEditor
          projectId={projectId}
          sow={sow}
          onSaved={() => {
            setEditing(false);
            setNotice('SOW saved.');
            load();
          }}
        />
      ) : null}

      <div className="mt-5">
        <h3 className="text-sm font-semibold text-gray-900">Needs a decision</h3>
        {groups.open.length ? (
          <ul className="mt-2 space-y-2">
            {groups.open.map((c) => (
              <CheckRow key={c.id} c={c} canEdit={canEdit} busy={busy} onDecide={decide} onDismiss={dismiss} />
            ))}
          </ul>
        ) : (
          <p className="mt-2 rounded-lg bg-gray-50 px-3 py-4 text-center text-sm text-gray-500">
            {data.checks.length ? 'No open scope flags.' : data.unchecked ? `${data.unchecked} client request${data.unchecked === 1 ? '' : 's'} not checked yet.` : 'No client requests yet.'}
          </p>
        )}
      </div>

      {groups.rest.length ? (
        <div className="mt-4">
          <button type="button" className="flex items-center gap-1 text-xs font-semibold text-gray-600" onClick={() => setShowResolved((v) => !v)} aria-expanded={showResolved}>
            {showResolved ? <ChevronDown className="h-3.5 w-3.5" aria-hidden /> : <ChevronRight className="h-3.5 w-3.5" aria-hidden />}
            In scope and resolved ({groups.rest.length})
          </button>
          {showResolved ? (
            <ul className="mt-2 space-y-2">
              {groups.rest.map((c) => (
                <CheckRow key={c.id} c={c} canEdit={canEdit} busy={busy} onDecide={decide} onDismiss={dismiss} />
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
