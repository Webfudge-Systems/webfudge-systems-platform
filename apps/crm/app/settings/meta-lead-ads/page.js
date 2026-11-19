'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Download, Link2, RefreshCw, Unplug } from 'lucide-react';
import { Button, Card, LoadingSpinner, IS_SAAS_PLATFORM } from '@webfudge/ui';
import CRMPageHeader from '../../../components/CRMPageHeader';
import metaLeadAdsService, { META_FIELD_TARGETS } from '../../../lib/api/metaLeadAdsService';
import { canManageCRM } from '../../../lib/rbac';

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 disabled:bg-gray-50';

const CALLBACK_MESSAGES = {
  connected: { tone: 'ok', text: 'Facebook account connected. Now choose the Page your lead ads run on.' },
  denied: { tone: 'error', text: 'Facebook connection was cancelled. Nothing was changed.' },
  cancelled: { tone: 'error', text: 'Facebook connection was cancelled. Nothing was changed.' },
  expired: { tone: 'error', text: 'The connect link expired. Click "Connect Facebook" again.' },
  not_member: { tone: 'error', text: 'You are no longer a member of this organization.' },
  not_configured: { tone: 'error', text: 'Meta Lead Ads is not set up on this server yet.' },
  exchange_failed: { tone: 'error', text: 'Meta did not accept the connection. Try again, and allow every permission Facebook asks for.' },
};

const BREADCRUMB = [
  { label: 'Settings', href: '/settings' },
  { label: 'Meta Lead Ads', href: '/settings/meta-lead-ads' },
];

const formatDateTime = (v) => (v ? new Date(v).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—');

function Banner({ tone, children }) {
  const cls =
    tone === 'error'
      ? 'border-red-200 bg-red-50 text-red-700'
      : tone === 'info'
        ? 'border-gray-200 bg-gray-50 text-gray-700'
        : 'border-emerald-200 bg-emerald-50 text-emerald-800';
  return (
    <div className={`rounded-lg border px-4 py-2.5 text-sm ${cls}`} role={tone === 'error' ? 'alert' : 'status'}>
      {children}
    </div>
  );
}

function FormCard({ form, targets, canEdit, onChange }) {
  const [open, setOpen] = useState(false);
  const setTarget = (key, value) => onChange({ ...form, mapping: { ...form.mapping, [key]: value } });
  return (
    <div className="rounded-lg border border-gray-200">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
        <label className="flex flex-1 items-center gap-3 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
            checked={form.enabled}
            disabled={!canEdit}
            onChange={(e) => onChange({ ...form, enabled: e.target.checked })}
          />
          <span>
            <span className="font-medium text-gray-900">{form.name}</span>
            <span className="ml-2 text-xs text-gray-500">
              {form.questions.length} question{form.questions.length === 1 ? '' : 's'}
              {form.status && form.status !== 'ACTIVE' ? ` · ${form.status.toLowerCase()}` : ''}
            </span>
          </span>
        </label>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="inline-flex items-center gap-1 text-sm font-medium text-orange-700 hover:text-orange-800"
          aria-expanded={open}
        >
          Field mapping {open ? <ChevronUp className="h-4 w-4" aria-hidden /> : <ChevronDown className="h-4 w-4" aria-hidden />}
        </button>
      </div>
      {open ? (
        <div className="border-t border-gray-100 px-4 py-3">
          {form.questions.length ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="pb-2 font-medium">Question on the Meta form</th>
                  <th className="pb-2 font-medium">Goes to</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {form.questions.map((q) => (
                  <tr key={q.key}>
                    <td className="py-2 pr-4 text-gray-800">
                      {q.label}
                      {q.label !== q.key ? <span className="ml-1 text-xs text-gray-400">({q.key})</span> : null}
                    </td>
                    <td className="w-1/2 py-2">
                      <select
                        className={inputClass}
                        value={form.mapping[q.key] || 'notes'}
                        disabled={!canEdit}
                        onChange={(e) => setTarget(q.key, e.target.value)}
                        aria-label={`Field for ${q.label}`}
                      >
                        {targets.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-gray-500">Meta did not return any questions for this form.</p>
          )}
          <p className="mt-2 text-xs text-gray-500">
            Email and phone go on both the lead and its contact, and are used to spot people who are already in Grow. Answers
            you don&apos;t map are kept in the lead description.
          </p>
        </div>
      ) : null}
    </div>
  );
}

export default function MetaLeadAdsSettingsPage() {
  const canEdit = canManageCRM('settings');
  const [conn, setConn] = useState(null);
  const [pages, setPages] = useState(null);
  const [pageChoice, setPageChoice] = useState('');
  const [changingPage, setChangingPage] = useState(false);
  const [forms, setForms] = useState(null);
  const [customFields, setCustomFields] = useState([]);
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  const targets = useMemo(
    () => [...META_FIELD_TARGETS, ...customFields.map((f) => ({ value: `custom:${f.key}`, label: `Custom field: ${f.label}` }))],
    [customFields]
  );

  const loadForms = useCallback(async () => {
    try {
      const res = await metaLeadAdsService.listForms();
      setForms(res.forms);
      setCustomFields(res.customFields);
    } catch (e) {
      setForms([]);
      setMessage({ tone: 'error', text: e?.message || 'Could not load your lead forms from Meta' });
    }
  }, []);

  const loadPages = useCallback(async () => {
    try {
      const list = await metaLeadAdsService.listPages();
      setPages(list);
      if (list.length === 1) setPageChoice(list[0].id);
    } catch (e) {
      setPages([]);
      setMessage({ tone: 'error', text: e?.message || 'Could not load your Facebook Pages' });
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const c = await metaLeadAdsService.getConnection();
      setConn(c);
      if (canEdit && c?.connected && c.status === 'active' && c.page) await loadForms();
      if (canEdit && c?.connected && !c.page) await loadPages();
    } catch (e) {
      setMessage({ tone: 'error', text: e?.message || 'Could not load the Meta connection' });
    } finally {
      setLoading(false);
    }
  }, [canEdit, loadForms, loadPages]);

  useEffect(() => {
    if (!IS_SAAS_PLATFORM) return;
    const params = new URLSearchParams(window.location.search);
    const result = params.get('meta');
    if (result) {
      setMessage(CALLBACK_MESSAGES[result === 'connected' ? 'connected' : params.get('reason')] || CALLBACK_MESSAGES.exchange_failed);
      window.history.replaceState(null, '', window.location.pathname);
    }
    load();
  }, [load]);

  const run = async (fn) => {
    setBusy(true);
    setMessage(null);
    try {
      await fn();
    } catch (e) {
      setMessage({ tone: 'error', text: e?.message || 'Something went wrong' });
    } finally {
      setBusy(false);
    }
  };

  const connect = () =>
    run(async () => {
      const url = await metaLeadAdsService.getConnectUrl();
      if (url) window.location.assign(url);
    });

  const savePage = () =>
    run(async () => {
      const c = await metaLeadAdsService.selectPage(pageChoice);
      setConn(c);
      setChangingPage(false);
      setPages(null);
      setMessage({ tone: 'ok', text: `Connected to ${c?.page?.name || 'your Page'}. Now choose which lead forms to capture.` });
      await loadForms();
    });

  const saveForms = () =>
    run(async () => {
      const c = await metaLeadAdsService.saveForms(forms.map(({ id, name, enabled, mapping }) => ({ id, name, enabled, mapping })));
      setConn(c);
      const on = forms.filter((f) => f.enabled).length;
      setMessage({ tone: 'ok', text: on ? `Saved. New leads from ${on} form${on === 1 ? '' : 's'} will appear in Lead companies.` : 'Saved. No forms are switched on.' });
    });

  const backfill = () =>
    run(async () => {
      const r = await metaLeadAdsService.backfill({ days });
      const parts = [`${r.created} new lead${r.created === 1 ? '' : 's'} added`];
      if (r.duplicate) parts.push(`${r.duplicate} already in Grow`);
      if (r.matched) parts.push(`${r.matched} matched an existing lead`);
      if (r.failed) parts.push(`${r.failed} could not be saved`);
      setMessage({ tone: r.failed ? 'error' : 'ok', text: `${parts.join(', ')}.${r.capped ? ' Stopped at 500 leads; run it again for more.' : ''}` });
      setConn(await metaLeadAdsService.getConnection());
    });

  const disconnect = () => {
    if (!window.confirm('Disconnect Meta Lead Ads? New leads from Facebook and Instagram will stop coming into Grow. Leads already captured stay.')) return;
    run(async () => {
      await metaLeadAdsService.disconnect();
      setConn(await metaLeadAdsService.getConnection());
      setForms(null);
      setPages(null);
      setMessage({ tone: 'ok', text: 'Disconnected.' });
    });
  };

  const header = (
    <CRMPageHeader
      title="Meta Lead Ads"
      subtitle="Bring leads from Facebook and Instagram lead forms into Grow the moment they're submitted"
      breadcrumb={BREADCRUMB}
    />
  );

  if (!IS_SAAS_PLATFORM) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        {header}
        <Banner tone="info">Meta Lead Ads capture is not available on this deployment.</Banner>
      </div>
    );
  }

  const showPagePicker = conn?.connected && (!conn.page || changingPage);

  return (
    <div className="p-4 md:p-6 space-y-6">
      {header}
      {message ? <Banner tone={message.tone}>{message.text}</Banner> : null}
      {!canEdit ? <Banner tone="error">Only CRM admins can change this connection. You can view its status.</Banner> : null}

      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : !conn?.configured ? (
        <Banner tone="info">
          Meta Lead Ads isn&apos;t switched on for Webfudge yet. Your Webfudge administrator needs to finish the Meta app setup
          {conn?.missingConfig?.length ? ` (${conn.missingConfig.join(', ')})` : ''}.
        </Banner>
      ) : (
        <>
          <Card className="space-y-4 border border-gray-200 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Facebook connection</h2>
                {conn.connected ? (
                  <p className="mt-1 text-sm text-gray-600">
                    Connected as <span className="font-medium text-gray-900">{conn.metaUserName || 'your Facebook account'}</span>
                    {conn.page ? (
                      <>
                        {' '}
                        · Page <span className="font-medium text-gray-900">{conn.page.name || conn.page.id}</span>
                      </>
                    ) : null}
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-gray-600">
                    Sign in with a Facebook account that is an admin of the Page your lead ads run on. Grow keeps the login on its
                    server; it is never shown in the browser.
                  </p>
                )}
              </div>
              {canEdit ? (
                <div className="flex flex-wrap gap-2">
                  {conn.connected && conn.page && !changingPage ? (
                    <Button
                      variant="outline"
                      disabled={busy}
                      onClick={() => {
                        setChangingPage(true);
                        loadPages();
                      }}
                    >
                      Change Page
                    </Button>
                  ) : null}
                  <Button variant={conn.connected ? 'outline' : 'primary'} onClick={connect} disabled={busy}>
                    <Link2 className="mr-1 h-4 w-4" aria-hidden />
                    {conn.connected ? 'Reconnect' : 'Connect Facebook'}
                  </Button>
                  {conn.connected ? (
                    <Button variant="outline" onClick={disconnect} disabled={busy}>
                      <Unplug className="mr-1 h-4 w-4" aria-hidden />
                      Disconnect
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </div>

            {conn.lastError ? (
              <Banner tone="error">
                {conn.lastError}
                <span className="ml-1 text-xs opacity-75">({formatDateTime(conn.lastErrorAt)})</span>
              </Banner>
            ) : null}

            {conn.connected && conn.page ? (
              <dl className="grid gap-3 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-gray-500">Leads captured</dt>
                  <dd className="font-medium text-gray-900">{conn.leadsCaptured}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Last lead</dt>
                  <dd className="font-medium text-gray-900">{formatDateTime(conn.lastLeadAt)}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Forms switched on</dt>
                  <dd className="font-medium text-gray-900">{conn.forms.filter((f) => f.enabled).length}</dd>
                </div>
              </dl>
            ) : null}

            {canEdit && showPagePicker ? (
              <div className="rounded-lg border border-orange-200 bg-orange-50/40 p-4">
                {pages === null ? (
                  <LoadingSpinner />
                ) : pages.length ? (
                  <div className="flex flex-wrap items-end gap-3">
                    <label className="block min-w-[16rem] flex-1 text-sm">
                      <span className="mb-1 block font-medium text-gray-700">Facebook Page</span>
                      <select className={inputClass} value={pageChoice} onChange={(e) => setPageChoice(e.target.value)}>
                        <option value="">Choose a Page…</option>
                        {pages.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <Button onClick={savePage} disabled={busy || !pageChoice}>
                      Use this Page
                    </Button>
                    {changingPage ? (
                      <Button variant="outline" onClick={() => setChangingPage(false)} disabled={busy}>
                        Cancel
                      </Button>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-sm text-gray-700">
                    Meta did not share any Pages with Grow. Click Reconnect and tick the Page your lead ads run on.
                  </p>
                )}
              </div>
            ) : null}
          </Card>

          {canEdit && conn.connected && conn.page && conn.status === 'active' && !changingPage ? (
            <Card className="space-y-4 border border-gray-200 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">Lead forms</h2>
                  <p className="mt-1 text-sm text-gray-600">
                    Tick the forms to capture and choose where each answer goes. New leads get the source &quot;Meta Ads&quot;, the
                    campaign, ad set, ad and form they came from, and an owner from your assignment rules.
                  </p>
                </div>
                <Button variant="outline" onClick={() => run(loadForms)} disabled={busy}>
                  <RefreshCw className="mr-1 h-4 w-4" aria-hidden />
                  Refresh
                </Button>
              </div>
              {forms === null ? (
                <div className="flex justify-center py-6">
                  <LoadingSpinner />
                </div>
              ) : forms.length ? (
                <div className="space-y-3">
                  {forms.map((f) => (
                    <FormCard
                      key={f.id}
                      form={f}
                      targets={targets}
                      canEdit={canEdit}
                      onChange={(next) => setForms((list) => list.map((x) => (x.id === next.id ? next : x)))}
                    />
                  ))}
                  <div className="flex justify-end">
                    <Button onClick={saveForms} disabled={busy}>
                      Save forms
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-600">This Page has no lead forms yet. Create one in Meta Ads Manager, then click Refresh.</p>
              )}
            </Card>
          ) : null}

          {canEdit && conn.connected && conn.page && conn.forms.some((f) => f.enabled) ? (
            <Card className="space-y-3 border border-gray-200 p-5">
              <h2 className="text-base font-semibold text-gray-900">Import recent leads</h2>
              <p className="text-sm text-gray-600">
                Bring in leads submitted before you connected, or any that were missed. Leads already in Grow are skipped.
              </p>
              <div className="flex flex-wrap items-end gap-3">
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-gray-700">From the last</span>
                  <select className={inputClass} value={days} onChange={(e) => setDays(Number(e.target.value))}>
                    {[1, 7, 30, 90].map((d) => (
                      <option key={d} value={d}>
                        {d === 1 ? '24 hours' : `${d} days`}
                      </option>
                    ))}
                  </select>
                </label>
                <Button onClick={backfill} disabled={busy}>
                  <Download className="mr-1 h-4 w-4" aria-hidden />
                  Import leads
                </Button>
              </div>
            </Card>
          ) : null}
        </>
      )}
    </div>
  );
}
