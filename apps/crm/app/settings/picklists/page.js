'use client';

import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { Button, Card, LoadingSpinner } from '@webfudge/ui';
import CRMPageHeader from '../../../components/CRMPageHeader';
import crmSettingsService from '../../../lib/api/crmSettingsService';
import { DEFAULT_LEAD_SOURCES } from '../../../lib/leadSources';
import { canManageCRM } from '../../../lib/rbac';

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 disabled:bg-gray-50';

function Banner({ tone, children }) {
  const cls = tone === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-800';
  return (
    <p className={`rounded-lg border px-4 py-2.5 text-sm ${cls}`} role={tone === 'error' ? 'alert' : 'status'}>
      {children}
    </p>
  );
}

/** Editable ordered list of labels. */
function ListEditor({ items, onChange, disabled, placeholder, addLabel }) {
  const [draft, setDraft] = useState('');
  const add = (e) => {
    e.preventDefault();
    const v = draft.trim();
    if (!v || items.some((x) => x.toLowerCase() === v.toLowerCase())) return;
    onChange([...items, v]);
    setDraft('');
  };
  const move = (i, d) => {
    const t = i + d;
    if (t < 0 || t >= items.length) return;
    const next = [...items];
    [next[i], next[t]] = [next[t], next[i]];
    onChange(next);
  };
  return (
    <div className="space-y-3">
      {items.length ? (
        <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
          {items.map((label, i) => (
            <li key={`${label}-${i}`} className="flex items-center gap-2 px-3 py-2">
              <span className="flex-1 text-sm text-gray-900">{label}</span>
              {!disabled ? (
                <>
                  <button type="button" className="rounded p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-40" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move ${label} up`}>
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button type="button" className="rounded p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-40" onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label={`Move ${label} down`}>
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button type="button" className="rounded p-1 text-red-500 hover:bg-red-50" onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label={`Remove ${label}`}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-lg border border-dashed border-gray-300 p-4 text-center text-sm text-gray-500">Nothing added yet.</p>
      )}
      {!disabled ? (
        <form onSubmit={add} className="flex gap-2">
          <input className={inputClass} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={placeholder} aria-label={addLabel} />
          <Button type="submit" variant="outline" disabled={!draft.trim()}>
            <Plus className="mr-1 h-4 w-4" aria-hidden />
            Add
          </Button>
        </form>
      ) : null}
    </div>
  );
}

export default function PicklistsSettingsPage() {
  const canEdit = canManageCRM('settings');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const [industries, setIndustries] = useState([]);
  const [sources, setSources] = useState([]); // labels, in order
  const [sourceValues, setSourceValues] = useState({}); // label → stored value (keeps existing keys stable)
  const [customSources, setCustomSources] = useState(false);

  useEffect(() => {
    crmSettingsService
      .getAll({ force: true })
      .then((s) => {
        setIndustries(s?.industries?.items || []);
        const items = Array.isArray(s?.lead_sources?.items) ? s.lead_sources.items : null;
        const list = items || DEFAULT_LEAD_SOURCES;
        setCustomSources(Boolean(items));
        setSources(list.map((o) => o.label));
        setSourceValues(Object.fromEntries(list.map((o) => [o.label, o.value])));
      })
      .catch((e) => setMessage({ tone: 'error', text: e?.message || 'Could not load settings' }))
      .finally(() => setLoading(false));
  }, []);

  const save = async (key, value, okText) => {
    setBusy(true);
    setMessage(null);
    try {
      const saved = await crmSettingsService.save(key, value);
      setMessage({ tone: 'ok', text: okText });
      return saved;
    } catch (e) {
      setMessage({ tone: 'error', text: e?.message || 'Could not save' });
      return null;
    } finally {
      setBusy(false);
    }
  };

  const saveSources = async () => {
    const saved = await save(
      'lead_sources',
      { items: sources.map((label) => ({ label, value: sourceValues[label] })) },
      'Lead sources saved. They now show in every lead source dropdown.'
    );
    if (saved?.items) {
      setCustomSources(true);
      setSourceValues(Object.fromEntries(saved.items.map((o) => [o.label, o.value])));
    }
  };

  const resetSources = async () => {
    if (!window.confirm('Go back to the built-in lead source list? Leads keep the source they already have.')) return;
    const saved = await save('lead_sources', { items: null }, 'Lead sources reset to the built-in list.');
    if (saved) {
      setCustomSources(false);
      setSources(DEFAULT_LEAD_SOURCES.map((o) => o.label));
      setSourceValues(Object.fromEntries(DEFAULT_LEAD_SOURCES.map((o) => [o.label, o.value])));
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <CRMPageHeader
        title="Industries & lead sources"
        subtitle="The choices your team picks from on leads and client accounts"
        breadcrumb={[
          { label: 'Settings', href: '/settings' },
          { label: 'Industries & lead sources', href: '/settings/picklists' },
        ]}
      />
      {message ? <Banner tone={message.tone}>{message.text}</Banner> : null}
      {!canEdit ? <Banner tone="error">Only CRM admins can change these lists. You can view them.</Banner> : null}

      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="space-y-4 border border-gray-200 p-5">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Industries</h2>
              <p className="mt-1 text-sm text-gray-600">
                Added to the built-in industry list in every industry dropdown (leads and client accounts).
              </p>
            </div>
            <ListEditor items={industries} onChange={setIndustries} disabled={!canEdit} placeholder="e.g. Solar EPC" addLabel="New industry" />
            {canEdit ? (
              <div className="flex justify-end">
                <Button onClick={() => save('industries', { items: industries }, 'Industries saved.')} disabled={busy}>
                  Save industries
                </Button>
              </div>
            ) : null}
          </Card>

          <Card className="space-y-4 border border-gray-200 p-5">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Lead sources</h2>
              <p className="mt-1 text-sm text-gray-600">
                {customSources ? 'Your own list.' : 'Using the built-in list. Edit it to make it your own.'} Removing a source
                doesn&apos;t change leads that already have it.
              </p>
            </div>
            <ListEditor items={sources} onChange={setSources} disabled={!canEdit} placeholder="e.g. IndiaMART" addLabel="New lead source" />
            {canEdit ? (
              <div className="flex justify-end gap-2">
                {customSources ? (
                  <Button variant="outline" onClick={resetSources} disabled={busy}>
                    <RotateCcw className="mr-1 h-4 w-4" aria-hidden />
                    Use built-in list
                  </Button>
                ) : null}
                <Button onClick={saveSources} disabled={busy || !sources.length}>
                  Save lead sources
                </Button>
              </div>
            ) : null}
          </Card>
        </div>
      )}
    </div>
  );
}
