'use client';

import { useEffect, useState } from 'react';
import { Card } from '@webfudge/ui';
import strapiClient from '../lib/strapiClient';
import { canManageCRM } from '../lib/rbac';

/** Org setting for Fudge AI auto-capture (G10): read conversations automatically, and auto-apply or suggest. */
export default function AiCaptureSettings() {
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const canManage = canManageCRM('settings');

  useEffect(() => {
    strapiClient
      .get('/ai-capture/settings')
      .then((res) => setSettings(res?.data || null))
      .catch(() => setSettings(null));
  }, []);

  if (!settings) return null;

  const save = async (patch) => {
    setSaving(true);
    setError(null);
    try {
      const res = await strapiClient.put('/ai-capture/settings', patch);
      setSettings(res?.data || { ...settings, ...patch });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const Row = ({ k, title, help }) => (
    <label className="flex items-start justify-between gap-4 py-3">
      <span>
        <span className="block text-sm font-medium text-gray-900">{title}</span>
        <span className="block text-xs text-gray-500">{help}</span>
      </span>
      <input type="checkbox" className="mt-1 h-4 w-4 accent-orange-500" checked={Boolean(settings[k])} disabled={!canManage || saving} onChange={(e) => save({ [k]: e.target.checked })} />
    </label>
  );

  return (
    <Card variant="elevated" className="rounded-xl">
      <h2 className="text-sm font-semibold text-gray-900">AI auto-capture</h2>
      <p className="mt-1 text-xs text-gray-500">
        Fudge AI reads comments, call and meeting notes and emails on leads and deals (English, Hindi or Hinglish) and proposes budget, timeline, requirement, next step and stage.
      </p>
      <div className="mt-2 divide-y divide-gray-100">
        <Row k="autoRun" title="Read new conversations automatically" help="Runs a minute or two after a new comment or meeting note. Uses AI credits." />
        <Row k="autoApply" title="Apply suggestions automatically" help="Off: reps accept, edit or dismiss each suggestion. On: applied right away. Every change is logged and can be undone." />
      </div>
      {!canManage && <p className="mt-2 text-xs text-gray-400">Only people who manage CRM settings can change this.</p>}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </Card>
  );
}
