'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, Copy, RefreshCw, RotateCcw } from 'lucide-react';
import { Button, Card, IS_SAAS_PLATFORM, LoadingSpinner } from '@webfudge/ui';
import CRMPageHeader from '../../../components/CRMPageHeader';
import leadCaptureService from '../../../lib/api/leadCaptureService';
import { buildFormSnippet, sampleRequest } from '../../../lib/leadCaptureSnippet';
import { canManageCRM } from '../../../lib/rbac';

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 disabled:bg-gray-50';

/** Setup steps per source, shown under each card. Keep in sync with the PR / backend mapper notes. */
const SETUP = {
  web_form: [
    'Turn the form on, then copy the snippet below into your website (any page builder that accepts HTML).',
    'Already have a form? Point its action / webhook at the endpoint URL. Fields named name, email, phone, company, message (and most common variants) are mapped automatically; anything else is kept on the lead.',
    'Optional: list your domains so the endpoint only accepts posts from your site.',
  ],
  google_ads: [
    'Google Ads → your lead form asset → Lead delivery → Webhook integration.',
    'Paste the endpoint URL as "Webhook URL" and the key below as "Key".',
    'Click "Send test data": a test event appears below (test leads are not added to Grow).',
  ],
  indiamart: [
    'Recommended — push: IndiaMART seller panel → Lead Manager → Import/Export Leads → Push API. Paste the endpoint URL and confirm with the OTP.',
    'Or pull: generate a CRM key under Import/Export Leads → Pull API, paste it below and turn on pulling. Grow checks every 10 minutes. IndiaMART expires keys unused for 7 days.',
  ],
  justdial: [
    'JustDial has no self-serve webhook screen: ask your JustDial account manager to push leads (GET) to the endpoint URL.',
    'Getting leads only by email? Forward those emails to the email endpoint (for example with a Gmail filter + Zapier/Make "email to webhook", or any email-forwarding service that can POST subject/text/html as JSON).',
    'JustDial does not publish its field names: check the first lead below and tell us if something is missing.',
  ],
  ninety_nine_acres: [
    '99acres builder/agent CRM push is arranged with your 99acres account manager — share the endpoint URL with them.',
    'Most accounts get leads by email: forward 99acres lead emails to the email endpoint (subject/text/html as JSON).',
  ],
  magicbricks: [
    'MagicBricks CRM push is arranged with your MagicBricks account manager — share the endpoint URL with them.',
    'Most accounts get leads by email: forward MagicBricks lead emails to the email endpoint (subject/text/html as JSON).',
  ],
};

const STATUS_STYLE = {
  created: 'bg-emerald-50 text-emerald-700',
  merged: 'bg-sky-50 text-sky-700',
  duplicate_delivery: 'bg-gray-100 text-gray-600',
  test: 'bg-violet-50 text-violet-700',
  spam: 'bg-amber-50 text-amber-700',
  rate_limited: 'bg-amber-50 text-amber-700',
  rejected: 'bg-red-50 text-red-700',
  error: 'bg-red-50 text-red-700',
};
const STATUS_LABEL = { duplicate_delivery: 'repeat delivery', rate_limited: 'rate limited' };

function Banner({ tone, children }) {
  const cls = tone === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-800';
  return (
    <p className={`rounded-lg border px-4 py-2.5 text-sm ${cls}`} role={tone === 'error' ? 'alert' : 'status'}>
      {children}
    </p>
  );
}

function CopyField({ label, value, multiline }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked: the text is selectable */
    }
  };
  return (
    <div className="text-sm">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="font-medium text-gray-700">{label}</span>
        <button type="button" onClick={copy} className="inline-flex items-center gap-1 text-xs font-medium text-orange-700 hover:text-orange-800">
          {copied ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      {multiline ? (
        <textarea readOnly value={value} rows={8} className={`${inputClass} font-mono text-xs`} onFocus={(e) => e.target.select()} />
      ) : (
        <input readOnly value={value} className={`${inputClass} font-mono text-xs`} onFocus={(e) => e.target.select()} />
      )}
    </div>
  );
}

function Stats({ stats }) {
  const parts = [
    ['created', 'new'],
    ['merged', 'merged'],
    ['rejected', 'rejected'],
    ['spam', 'spam'],
    ['error', 'errors'],
  ].filter(([k]) => stats?.[k]);
  if (!parts.length) return <span className="text-xs text-gray-500">No activity in the last 7 days</span>;
  return <span className="text-xs text-gray-600">Last 7 days: {parts.map(([k, l]) => `${stats[k]} ${l}`).join(' · ')}</span>;
}

function SourceCard({ source, canManage, onChange, setBanner }) {
  const [busy, setBusy] = useState(false);
  const [web, setWeb] = useState({
    allowedDomains: (source.allowedDomains || []).join(', '),
    redirectUrl: source.redirectUrl || '',
    successMessage: source.successMessage || '',
  });
  const [crmKey, setCrmKey] = useState('');

  const run = async (fn, okText) => {
    setBusy(true);
    setBanner(null);
    try {
      const updated = await fn();
      if (updated?.key) onChange(updated);
      if (okText) setBanner({ tone: 'ok', text: okText });
      return updated;
    } catch (e) {
      setBanner({ tone: 'error', text: e?.message || 'Could not save' });
      return null;
    } finally {
      setBusy(false);
    }
  };

  const toggle = () =>
    run(() => leadCaptureService.update(source.slug, { enabled: !source.enabled }), `${source.label} ${source.enabled ? 'switched off' : 'switched on'}.`);
  const rotate = () => {
    if (!window.confirm(`Create a new ${source.label} link? The current link and key stop working immediately — update them wherever you pasted them.`)) return;
    run(() => leadCaptureService.rotate(source.slug), 'New link created. Update it in the source.');
  };
  const saveWeb = () =>
    run(
      () => leadCaptureService.update(source.slug, { allowedDomains: web.allowedDomains, redirectUrl: web.redirectUrl.trim(), successMessage: web.successMessage }),
      'Form options saved.'
    );
  const savePull = (enabled) =>
    run(async () => {
      const payload = { pull: { enabled } };
      if (crmKey.trim()) payload.pull.crmKey = crmKey.trim();
      const r = await leadCaptureService.update(source.slug, payload);
      setCrmKey('');
      return r;
    }, enabled ? 'IndiaMART pull is on.' : 'IndiaMART pull saved.');
  const pullNow = () =>
    run(async () => {
      const r = await leadCaptureService.pullIndiaMart();
      if (r?.skipped) throw new Error(r.skipped);
      if (r?.error) throw new Error(`IndiaMART: ${r.error}`);
      setBanner({ tone: 'ok', text: `Pulled ${r.fetched} lead(s): ${r.created} new, ${r.merged} merged, ${r.duplicates} already in Grow.` });
      return null;
    });

  const snippet = useMemo(() => (source.key === 'web_form' && source.endpointUrl ? buildFormSnippet(source.endpointUrl) : ''), [source.key, source.endpointUrl]);

  return (
    <Card className="space-y-4 border border-gray-200 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-gray-900">{source.label}</h2>
          <p className="mt-0.5 text-xs text-gray-500">
            Leads are tagged with source <code className="rounded bg-gray-100 px-1">{source.leadSource}</code> · <Stats stats={source.stats} />
          </p>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-700">
          <input type="checkbox" className="h-4 w-4 accent-orange-600" checked={source.enabled} disabled={!canManage || busy} onChange={toggle} />
          {source.enabled ? 'On' : 'Off'}
        </label>
      </div>

      <ol className="list-decimal space-y-1 pl-5 text-sm text-gray-600">
        {(SETUP[source.key] || []).map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ol>

      {source.endpointUrl ? (
        <div className="space-y-3">
          <CopyField label={source.kind === 'form' ? 'Form endpoint URL' : 'Webhook URL'} value={source.endpointUrl} />
          {source.googleKey ? <CopyField label="Key (paste into Google Ads)" value={source.googleKey} /> : null}
          {source.emailEndpointUrl ? <CopyField label="Email endpoint (POST JSON: subject, text, html, from)" value={source.emailEndpointUrl} /> : null}
          {source.key === 'web_form' ? <CopyField label="Embeddable form (paste into your site)" value={snippet} multiline /> : null}
          {source.kind === 'webhook' ? (
            <details className="text-sm text-gray-600">
              <summary className="cursor-pointer font-medium text-gray-700">Send a test lead from a terminal</summary>
              <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all rounded-lg bg-gray-50 p-3 font-mono text-xs">{sampleRequest(source)}</pre>
            </details>
          ) : null}
          {canManage ? (
            <button type="button" onClick={rotate} disabled={busy} className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-red-700">
              <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Create a new link (stops the current one)
            </button>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-gray-500">Turn this source on to get its private link.</p>
      )}

      {source.key === 'web_form' && source.endpointUrl ? (
        <div className="grid gap-3 border-t border-gray-100 pt-4 md:grid-cols-2">
          <label className="block text-sm md:col-span-2">
            <span className="mb-1 block font-medium text-gray-700">Only accept posts from these domains (optional)</span>
            <input className={inputClass} value={web.allowedDomains} disabled={!canManage} placeholder="example.com, shop.example.com" onChange={(e) => setWeb({ ...web, allowedDomains: e.target.value })} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">Thank-you page URL (optional)</span>
            <input className={inputClass} value={web.redirectUrl} disabled={!canManage} placeholder="https://example.com/thank-you" onChange={(e) => setWeb({ ...web, redirectUrl: e.target.value })} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">Success message</span>
            <input className={inputClass} value={web.successMessage} disabled={!canManage} placeholder="Thank you! We will get in touch shortly." onChange={(e) => setWeb({ ...web, successMessage: e.target.value })} />
          </label>
          {canManage ? (
            <div className="md:col-span-2">
              <Button type="button" onClick={saveWeb} disabled={busy}>
                Save form options
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      {source.pull ? (
        <div className="space-y-3 border-t border-gray-100 pt-4">
          <p className="text-sm font-medium text-gray-700">Pull from IndiaMART (optional)</p>
          <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
            <label className="block text-sm">
              <span className="mb-1 block text-gray-600">CRM key {source.pull.hasCrmKey ? '(saved — paste a new one to replace it)' : ''}</span>
              <input type="password" autoComplete="off" className={inputClass} value={crmKey} disabled={!canManage} placeholder={source.pull.hasCrmKey ? '••••••••••' : 'Paste your IndiaMART CRM key'} onChange={(e) => setCrmKey(e.target.value)} />
            </label>
            {canManage ? (
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={() => savePull(!source.pull.enabled)} disabled={busy || (!source.pull.enabled && !source.pull.hasCrmKey && !crmKey.trim())}>
                  {source.pull.enabled ? 'Turn pull off' : 'Save & turn pull on'}
                </Button>
                {source.pull.enabled ? (
                  <Button type="button" variant="outline" onClick={pullNow} disabled={busy || !source.enabled}>
                    <RefreshCw className="mr-1.5 h-4 w-4" aria-hidden /> Pull now
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>
          <p className="text-xs text-gray-500">
            {source.pull.enabled ? 'Pulling every 10 minutes.' : 'Pull is off.'}
            {source.pull.lastPulledAt ? ` Last pulled ${new Date(source.pull.lastPulledAt).toLocaleString()}.` : ''}
          </p>
          {source.pull.lastError ? <Banner tone="error">{source.pull.lastError}</Banner> : null}
        </div>
      ) : null}
    </Card>
  );
}

function EventLog({ events, sources }) {
  const [filter, setFilter] = useState('');
  const label = useMemo(() => Object.fromEntries(sources.map((s) => [s.key, s.label])), [sources]);
  const rows = filter ? events.filter((e) => e.source === filter) : events;
  return (
    <Card className="border border-gray-200 p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-gray-900">Recent events</h2>
        <select className={`${inputClass} w-auto`} value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter by source">
          <option value="">All sources</option>
          {sources.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      {rows.length ? (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase text-gray-500">
              <tr>
                <th className="py-2 pr-4 font-medium">When</th>
                <th className="py-2 pr-4 font-medium">Source</th>
                <th className="py-2 pr-4 font-medium">Result</th>
                <th className="py-2 font-medium">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((e) => (
                <tr key={e.id} className="align-top">
                  <td className="whitespace-nowrap py-2 pr-4 text-gray-600">{new Date(e.createdAt).toLocaleString()}</td>
                  <td className="whitespace-nowrap py-2 pr-4 text-gray-800">{label[e.source] || e.source}</td>
                  <td className="py-2 pr-4">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[e.status] || 'bg-gray-100 text-gray-700'}`}>{STATUS_LABEL[e.status] || e.status}</span>
                  </td>
                  <td className="py-2 text-gray-700">
                    {e.message || '—'}
                    {e.leadCompanyId ? (
                      <>
                        {' '}
                        <Link href={`/sales/lead-companies/${e.leadCompanyId}`} className="font-medium text-orange-700 hover:underline">
                          Open lead
                        </Link>
                      </>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-gray-500">Nothing received yet. Turn a source on and send a test lead.</p>
      )}
    </Card>
  );
}

export default function LeadSourcesSettingsPage() {
  const canManage = canManageCRM('settings');
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [banner, setBanner] = useState(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setData(await leadCaptureService.overview());
    } catch (e) {
      setError(e?.message || 'Could not load lead sources');
    }
  }, []);

  useEffect(() => {
    if (IS_SAAS_PLATFORM && canManage) load();
  }, [canManage, load]);

  const onChange = (updated) => {
    setData((d) => ({ ...d, sources: d.sources.map((s) => (s.key === updated.key ? updated : s)) }));
    leadCaptureService.events().then((events) => setData((d) => ({ ...d, events }))).catch(() => {});
  };

  const header = (
    <CRMPageHeader
      title="Lead sources"
      subtitle="Capture leads automatically from your website, Google Ads, IndiaMART, JustDial, 99acres and MagicBricks. Duplicates are merged by phone or email, and assignment rules apply."
      breadcrumb={[
        { label: 'Settings', href: '/settings' },
        { label: 'Lead sources', href: '/settings/lead-sources' },
      ]}
    />
  );

  if (!IS_SAAS_PLATFORM) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        {header}
        <p className="text-sm text-gray-600">Lead capture is available in Webfudge Systems Grow.</p>
      </div>
    );
  }
  if (!canManage) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        {header}
        <Banner tone="error">You need manage access to Grow settings to set up lead sources. Ask your organization admin.</Banner>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {header}
      {banner ? <Banner tone={banner.tone}>{banner.text}</Banner> : null}
      {error ? <Banner tone="error">{error}</Banner> : null}
      {!data && !error ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner />
        </div>
      ) : null}
      {data ? (
        <>
          <p className="text-sm text-gray-600">
            Each link below is private to your organization. Anyone with a link can send leads to it, so share it only with the source; create a new link if one leaks.
          </p>
          <div className="grid gap-4 xl:grid-cols-2">
            {data.sources.map((s) => (
              <SourceCard key={s.key} source={s} canManage={canManage} onChange={onChange} setBanner={setBanner} />
            ))}
          </div>
          <EventLog events={data.events || []} sources={data.sources} />
        </>
      ) : null}
    </div>
  );
}
