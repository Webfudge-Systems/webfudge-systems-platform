'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Clock } from 'lucide-react';
import { Card, IS_SAAS_PLATFORM } from '@webfudge/ui';
import CRMPageHeader from '../../../components/CRMPageHeader';
import strapiClient from '../../../lib/strapiClient';

const BREADCRUMB = [
  { label: 'Settings', href: '/settings' },
  { label: 'Vertical packs', href: '/settings/vertical-packs' },
];

const SECTIONS = [
  ['pipelines', 'Pipelines'],
  ['leadStatuses', 'Lead statuses'],
  ['customFields', 'Custom fields'],
  ['views', 'Saved views'],
];

function SummaryList({ summary }) {
  return (
    <div className="space-y-4 text-sm">
      {SECTIONS.map(([key, label]) => {
        const added = summary.created[key] || [];
        const kept = summary.skipped[key] || [];
        if (!added.length && !kept.length) return null;
        return (
          <div key={key}>
            <p className="font-semibold text-gray-900">{label}</p>
            {added.length > 0 && <p className="text-gray-700">Adds: {added.join(', ')}</p>}
            {kept.length > 0 && <p className="text-gray-500">Already there, kept as is: {kept.join(', ')}</p>}
          </div>
        );
      })}
      {summary.pending.map((p) => (
        <div key={p.type} className="flex gap-2 rounded-lg bg-gray-50 p-3 text-gray-600">
          <Clock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>
            {p.type === 'cadences' ? 'Cadences' : 'WhatsApp templates'} ({p.items.join(', ')}): {p.note}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Vertical packs (G22, SaaS): preview and apply an industry starter pack. Adds only, never removes. */
export default function VerticalPacksPage() {
  const [packs, setPacks] = useState([]);
  const [applied, setApplied] = useState(null);
  const [selected, setSelected] = useState('');
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await strapiClient.get('/crm-vertical-packs');
      setPacks(res.data || []);
      setApplied(res.applied || null);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    if (IS_SAAS_PLATFORM) load();
  }, [load]);

  const choose = async (key) => {
    setSelected(key);
    setPreview(null);
    setResult(null);
    setError('');
    try {
      const res = await strapiClient.get(`/crm-vertical-packs/${key}/preview`);
      setPreview(res.data);
    } catch (e) {
      setError(e.message);
    }
  };

  const apply = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await strapiClient.post(`/crm-vertical-packs/${selected}/apply`, {});
      setResult(res.data);
      setPreview(null);
      await load();
    } catch (e) {
      setError(e.status === 403 ? 'You need manage access to Grow settings to apply a pack.' : e.message);
    } finally {
      setBusy(false);
    }
  };

  const nothingToAdd = preview && SECTIONS.every(([k]) => !(preview.created[k] || []).length);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <CRMPageHeader
        title="Vertical packs"
        subtitle="One-click starter setups for your industry: pipeline, lead statuses, custom fields and saved views."
        breadcrumb={BREADCRUMB}
      />
      {!IS_SAAS_PLATFORM ? (
        <p className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-600">Vertical packs are available on Webfudge SaaS.</p>
      ) : (
        <>
          {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <p className="text-sm text-gray-600">
            Packs only add things. Anything with the same name already in your Grow is kept as it is, and applying a pack twice changes nothing.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {packs.map((p) => {
              const isApplied = (applied?.history || []).includes(p.key);
              return (
                <button key={p.key} type="button" onClick={() => choose(p.key)} className="text-left">
                  <Card className={`h-full p-5 transition hover:border-orange-300 ${selected === p.key ? 'border-orange-400 ring-2 ring-orange-100' : ''}`}>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-gray-900">{p.label}</h3>
                      {isApplied && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Applied
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-gray-600">{p.description}</p>
                    <p className="mt-3 text-xs text-gray-500">
                      {p.counts.pipelines} pipeline · {p.counts.leadStatuses} statuses · {p.counts.customFields} fields · {p.counts.views} views
                    </p>
                  </Card>
                </button>
              );
            })}
          </div>

          {preview && (
            <Card className="space-y-4 p-5">
              <h2 className="text-lg font-semibold text-gray-900">Preview: {preview.pack.label}</h2>
              <SummaryList summary={preview} />
              <button
                type="button"
                onClick={apply}
                disabled={busy || nothingToAdd}
                className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50"
              >
                {nothingToAdd ? 'Everything is already set up' : busy ? 'Applying…' : `Apply ${preview.pack.label} pack`}
              </button>
            </Card>
          )}

          {result && (
            <Card className="space-y-4 p-5">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden /> {result.pack.label} pack applied
              </h2>
              <SummaryList summary={result} />
            </Card>
          )}
        </>
      )}
    </div>
  );
}
