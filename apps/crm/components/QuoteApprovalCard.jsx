'use client';

import { useState } from 'react';
import { ShieldCheck, History, PenLine } from 'lucide-react';
import { Button, Card } from '@webfudge/ui';
import productService from '../lib/api/productService';
import { canManageCRM, canWriteCRM } from '../lib/rbac';

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });
const when = (iso) => (iso ? new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '');

const STATE_COPY = {
  pending: { label: 'Waiting for manager approval', cls: 'bg-amber-50 text-amber-800 border-amber-200' },
  approved: { label: 'Discount approved', cls: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  rejected: { label: 'Discount rejected', cls: 'bg-red-50 text-red-700 border-red-200' },
};

/** G27: discount approval, quote versions and e-sign hand-off for a catalogue quote. */
export default function QuoteApprovalCard({ proposal, onChange, onDownloadPdf }) {
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [esignMsg, setEsignMsg] = useState('');
  const lines = Array.isArray(proposal?.lineItems) ? proposal.lineItems : [];
  if (!lines.length) return null;

  const approval = proposal.approval || { state: 'none' };
  const history = Array.isArray(proposal.versionHistory) ? [...proposal.versionHistory].reverse() : [];
  const version = Number(proposal.quoteVersion) || 1;
  const copy = STATE_COPY[approval.state];
  const canDecide = approval.state === 'pending' && canManageCRM('proposals');
  const blocked = ['pending', 'rejected'].includes(approval.state);

  const decide = async (decision) => {
    setBusy(decision);
    setError('');
    try {
      const updated = await productService.decideApproval(proposal.id, decision);
      if (updated) onChange?.({ ...proposal, ...updated });
    } catch (e) {
      setError(e?.message || 'Could not save the decision');
    } finally {
      setBusy('');
    }
  };

  const sendForSignature = async () => {
    setBusy('esign');
    setError('');
    try {
      const { esign, configured, message } = await productService.sendForSignature(proposal.id);
      onChange?.({ ...proposal, esign });
      setEsignMsg(configured ? 'Sent for signature.' : message);
    } catch (e) {
      setError(e?.message || 'Could not send for signature');
    } finally {
      setBusy('');
    }
  };

  return (
    <Card variant="elevated" className="space-y-4 rounded-xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900">
          <ShieldCheck className="h-5 w-5 text-orange-600" aria-hidden />
          Approval and signature
        </h3>
        <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700">Version {version}</span>
      </div>

      {copy ? (
        <div className={`rounded-lg border px-3 py-2 text-sm ${copy.cls}`}>
          <p className="font-semibold">{copy.label}</p>
          {approval.maxPct != null ? (
            <p>
              Highest discount {approval.maxPct}%{approval.maxAllowedPct != null ? `, limit ${approval.maxAllowedPct}%` : ''}.
              {approval.state === 'pending' ? ' The quote can’t be sent or invoiced until a manager approves it.' : ''}
            </p>
          ) : null}
          {approval.decidedAt ? <p className="text-xs opacity-80">Decided {when(approval.decidedAt)}{approval.note ? `: ${approval.note}` : ''}</p> : null}
        </div>
      ) : (
        <p className="text-sm text-gray-600">Discounts are within the limit. No approval needed.</p>
      )}

      {canDecide ? (
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => decide('approve')} disabled={Boolean(busy)}>{busy === 'approve' ? 'Approving…' : 'Approve discount'}</Button>
          <Button variant="outline" onClick={() => decide('reject')} disabled={Boolean(busy)}>{busy === 'reject' ? 'Rejecting…' : 'Reject'}</Button>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-4">
        <Button variant="outline" onClick={onDownloadPdf}>Download PDF</Button>
        {canWriteCRM('proposals') && !proposal.convertedInvoice ? (
          <a href={`/clients/proposals/quote/new?edit=${proposal.id}`} className="text-sm font-semibold text-orange-700 hover:underline">
            {['SENT', 'ACCEPTED'].includes(proposal.status) || approval.state === 'approved' ? 'Edit lines (new version)' : 'Edit lines'}
          </a>
        ) : null}
        {canWriteCRM('proposals') ? (
          <Button onClick={sendForSignature} disabled={blocked || Boolean(busy)} title={blocked ? 'Needs discount approval first' : undefined}>
            <PenLine className="mr-1 h-4 w-4" aria-hidden />
            {busy === 'esign' ? 'Sending…' : 'Send for signature'}
          </Button>
        ) : null}
        {proposal.esign?.state === 'sent' ? <span className="text-sm text-emerald-700">Out for signature</span> : null}
      </div>
      {esignMsg ? <p className="text-sm text-gray-600">{esignMsg}</p> : null}
      {error ? <p className="text-sm text-red-600" role="alert">{error}</p> : null}

      {history.length ? (
        <details className="border-t border-gray-100 pt-3">
          <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-gray-700">
            <History className="h-4 w-4" aria-hidden /> Earlier versions ({history.length})
          </summary>
          <ul className="mt-2 space-y-1 text-sm text-gray-600">
            {history.map((v) => (
              <li key={v.version} className="flex flex-wrap justify-between gap-2">
                <span>Version {v.version} · {v.status}{v.approval?.state && v.approval.state !== 'none' ? ` · ${v.approval.state}` : ''}</span>
                <span>{inr.format(Number(v.quoteTotals?.total) || 0)} · {when(v.savedAt)}</span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </Card>
  );
}
