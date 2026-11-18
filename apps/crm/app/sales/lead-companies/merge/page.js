'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeftRight, GitMerge } from 'lucide-react';
import { Button, Card, LoadingSpinner } from '@webfudge/ui';
import CRMPageHeader from '../../../../components/CRMPageHeader';
import leadCompanyService from '../../../../lib/api/leadCompanyService';
import importService from '../../../../lib/api/importService';
import useCustomFields from '../../../../lib/useCustomFields';
import { formatCustomFieldValue } from '../../../../lib/api/customFieldService';
import { canManageCRM } from '../../../../lib/rbac';

const FIELDS = [
  ['companyName', 'Company name'],
  ['email', 'Email'],
  ['phone', 'Phone'],
  ['website', 'Website'],
  ['industry', 'Industry'],
  ['status', 'Status'],
  ['source', 'Source'],
  ['city', 'City'],
  ['state', 'State'],
  ['country', 'Country'],
  ['address', 'Address'],
  ['dealValue', 'Deal value'],
  ['nextConnectDate', 'Next connect'],
  ['linkedIn', 'LinkedIn'],
  ['notes', 'Notes'],
  ['description', 'Description'],
];

const show = (v) => (v == null || v === '' ? '' : String(v));

/**
 * Merge two lead companies (ticket G4): pick which value survives for each field; the duplicate's
 * contacts, deals, meetings, tasks, proposals, invoices and activity move to the kept lead.
 * URL: /sales/lead-companies/merge?keep=<id>&merge=<id>
 */
export default function MergeLeadsPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [keepId, setKeepId] = useState(params.get('keep') || '');
  const [mergeId, setMergeId] = useState(params.get('merge') || '');
  const [keep, setKeep] = useState(null);
  const [dup, setDup] = useState(null);
  const [choice, setChoice] = useState({}); // field -> 'keep' | 'merge'
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { fields: customFields } = useCustomFields('lead');
  const canMerge = canManageCRM('leads');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const [a, b] = await Promise.all([leadCompanyService.getOne(keepId), leadCompanyService.getOne(mergeId)]);
        if (cancelled) return;
        setKeep(a?.data || null);
        setDup(b?.data || null);
        // Default: keep the kept lead's value, but fill its blanks from the duplicate.
        const next = {};
        for (const [f] of FIELDS) next[f] = show(a?.data?.[f]) === '' && show(b?.data?.[f]) !== '' ? 'merge' : 'keep';
        setChoice(next);
      } catch (e) {
        if (!cancelled) setError(e?.message || 'Could not load the two leads');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [keepId, mergeId]);

  const differing = useMemo(
    () => FIELDS.filter(([f]) => keep && dup && show(keep[f]) !== show(dup[f])),
    [keep, dup]
  );
  const cfRows = useMemo(
    () =>
      customFields.filter((f) => keep && dup && JSON.stringify(keep.customFields?.[f.key] ?? null) !== JSON.stringify(dup.customFields?.[f.key] ?? null)),
    [customFields, keep, dup]
  );

  const swap = () => {
    setKeepId(mergeId);
    setMergeId(keepId);
    router.replace(`/sales/lead-companies/merge?keep=${mergeId}&merge=${keepId}`);
  };

  const submit = async () => {
    if (!window.confirm(`Merge "${dup.companyName}" into "${keep.companyName}"? The duplicate is deleted after its records move. This can't be undone.`)) return;
    setBusy(true);
    setError('');
    try {
      const take = Object.entries(choice).filter(([, v]) => v === 'merge').map(([k]) => k);
      const takeCustom = cfRows.filter((f) => choice[`cf:${f.key}`] === 'merge').map((f) => f.key);
      await importService.mergeLeads({ keepId: Number(keepId), mergeId: Number(mergeId), take, takeCustom });
      router.push(`/sales/lead-companies/${keepId}`);
    } catch (e) {
      setError(e?.message || 'Could not merge');
      setBusy(false);
    }
  };

  const Row = ({ id, label, a, b }) => (
    <tr className="align-top">
      <th scope="row" className="py-2.5 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </th>
      {[
        ['keep', a],
        ['merge', b],
      ].map(([side, value]) => (
        <td key={side} className="py-2.5 pr-4">
          <label className={`flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-sm ${choice[id] === side ? 'border-orange-400 bg-orange-50' : 'border-gray-200'}`}>
            <input type="radio" name={id} className="mt-0.5 accent-orange-500" checked={choice[id] === side} onChange={() => setChoice((c) => ({ ...c, [id]: side }))} />
            <span className="break-words">{value || <span className="text-gray-400">empty</span>}</span>
          </label>
        </td>
      ))}
    </tr>
  );

  return (
    <div className="space-y-6 p-4 md:p-6">
      <CRMPageHeader
        title="Merge lead companies"
        subtitle="Keep one record, choose the values to keep, and move everything else onto it"
        breadcrumb={[
          { label: 'Lead companies', href: '/sales/lead-companies' },
          { label: 'Merge', href: '#' },
        ]}
      />
      {!canMerge ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">Merging needs manage access to leads.</p>
      ) : null}
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      {loading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner message="Loading leads…" />
        </div>
      ) : keep && dup ? (
        <Card className="space-y-5 border border-gray-200 p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="text-left text-sm">
                  <th className="w-40 pb-3" />
                  <th className="pb-3 pr-4">
                    <span className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Keep</span>
                    <p className="text-base font-semibold text-gray-900">{keep.companyName}</p>
                  </th>
                  <th className="pb-3 pr-4">
                    <span className="text-xs font-semibold uppercase tracking-wide text-red-600">Merge in, then delete</span>
                    <p className="text-base font-semibold text-gray-900">{dup.companyName}</p>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {differing.length || cfRows.length ? (
                  <>
                    {differing.map(([f, label]) => (
                      <Row key={f} id={f} label={label} a={show(keep[f])} b={show(dup[f])} />
                    ))}
                    {cfRows.map((f) => (
                      <Row
                        key={f.key}
                        id={`cf:${f.key}`}
                        label={f.label}
                        a={formatCustomFieldValue(f, keep.customFields?.[f.key])}
                        b={formatCustomFieldValue(f, dup.customFields?.[f.key])}
                      />
                    ))}
                  </>
                ) : (
                  <tr>
                    <td colSpan={3} className="py-4 text-sm text-gray-500">
                      All fields match; only the duplicate&apos;s linked records will move.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-gray-600">
            Contacts, deals, meetings, tasks, proposals, invoices and activity history from <strong>{dup.companyName}</strong> move to{' '}
            <strong>{keep.companyName}</strong>. Then {dup.companyName} is deleted.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={swap} disabled={busy}>
              <ArrowLeftRight className="mr-1.5 h-4 w-4" aria-hidden />
              Swap which one to keep
            </Button>
            <Button variant="primary" onClick={submit} disabled={busy || !canMerge}>
              <GitMerge className="mr-1.5 h-4 w-4" aria-hidden />
              {busy ? 'Merging…' : 'Merge'}
            </Button>
          </div>
        </Card>
      ) : (
        <p className="text-sm text-gray-600">Open this page from a duplicate warning or an import result.</p>
      )}
    </div>
  );
}
