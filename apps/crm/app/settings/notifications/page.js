'use client';

import { useEffect, useState } from 'react';
import { Button, Card, LoadingSpinner } from '@webfudge/ui';
import CRMPageHeader from '../../../components/CRMPageHeader';
import crmSettingsService from '../../../lib/api/crmSettingsService';
import { canManageCRM } from '../../../lib/rbac';

const CATEGORIES = [
  { key: 'leads', label: 'Leads', hint: 'New leads, lead updates and assignments' },
  { key: 'deals', label: 'Deals', hint: 'New deals and deal updates' },
  { key: 'contacts', label: 'Contacts', hint: 'Contact updates' },
  { key: 'accounts', label: 'Client accounts', hint: 'Client account updates' },
  { key: 'tasks', label: 'Tasks', hint: 'Task assignments and updates' },
  { key: 'projects', label: 'Projects', hint: 'Project updates' },
  { key: 'comments', label: 'Comments', hint: 'New comments on records you follow' },
  { key: 'mentions', label: '@mentions', hint: 'When someone mentions a teammate' },
  { key: 'sla', label: 'First-contact SLA alerts', hint: 'When a new lead isn’t contacted in time' },
];

export default function NotificationSettingsPage() {
  const canEdit = canManageCRM('settings');
  const [prefs, setPrefs] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    crmSettingsService
      .getAll({ force: true })
      .then((s) => setPrefs(s?.notification_prefs || {}))
      .catch((e) => {
        setPrefs({});
        setMessage({ tone: 'error', text: e?.message || 'Could not load settings' });
      });
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      setPrefs(await crmSettingsService.save('notification_prefs', prefs));
      setMessage({ tone: 'ok', text: 'Notification settings saved for everyone in your organization.' });
    } catch (err) {
      setMessage({ tone: 'error', text: err?.message || 'Could not save' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <CRMPageHeader
        title="Notifications"
        subtitle="Choose which in-app notifications your team gets"
        breadcrumb={[
          { label: 'Settings', href: '/settings' },
          { label: 'Notifications', href: '/settings/notifications' },
        ]}
      />
      {message ? (
        <p
          className={`rounded-lg border px-4 py-2.5 text-sm ${message.tone === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}
          role={message.tone === 'error' ? 'alert' : 'status'}
        >
          {message.text}
        </p>
      ) : null}
      {prefs === null ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : (
        <Card className="border border-gray-200 p-5">
          <form onSubmit={save} className="space-y-4">
            <p className="text-sm text-gray-600">
              Applies to everyone in your organization, in Grow and Work. Invitations and system messages are always sent.
            </p>
            <ul className="divide-y divide-gray-100">
              {CATEGORIES.map((c) => (
                <li key={c.key}>
                  <label className="flex items-center justify-between gap-4 py-3">
                    <span>
                      <span className="block text-sm font-medium text-gray-900">{c.label}</span>
                      <span className="block text-xs text-gray-500">{c.hint}</span>
                    </span>
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={prefs[c.key] !== false}
                      disabled={!canEdit}
                      onChange={(e) => setPrefs((p) => ({ ...p, [c.key]: e.target.checked }))}
                    />
                  </label>
                </li>
              ))}
            </ul>
            {canEdit ? (
              <div className="flex justify-end">
                <Button type="submit" disabled={busy}>
                  Save notification settings
                </Button>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Only CRM admins can change these.</p>
            )}
          </form>
        </Card>
      )}
    </div>
  );
}
