'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Button, Card, IS_SAAS_PLATFORM } from '@webfudge/ui';
import cadenceService, { STEP_TYPE_LABELS, STOP_REASON_LABELS } from '../lib/api/cadenceService';

const STATUS_TEXT = {
  task_created: 'task created',
  unavailable: 'not available yet, task created',
  sent: 'sent',
  not_sent: 'not sent (mail not configured)',
  failed: 'failed',
  skipped: 'skipped',
};

/** G14: enrol the lead in a cadence, see its progress, mark that the lead replied. SaaS only. */
export default function LeadCadencePanel({ leadId, canEdit }) {
  const [enrollments, setEnrollments] = useState([]);
  const [cadences, setCadences] = useState([]);
  const [pick, setPick] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    if (!leadId) return;
    try {
      const [e, c] = await Promise.all([cadenceService.enrollments({ leadCompanyId: leadId }), cadenceService.list()]);
      setEnrollments(e?.data || []);
      setCadences((c?.data || []).filter((x) => x.status === 'active'));
    } catch {
      /* no access: panel stays empty */
    }
  }, [leadId]);

  useEffect(() => {
    load();
  }, [load]);

  if (!IS_SAAS_PLATFORM || !leadId) return null;
  const running = enrollments.filter((e) => e.status === 'active');

  async function act(fn, done) {
    setBusy(true);
    setMsg('');
    try {
      await fn();
      setMsg(done);
      await load();
    } catch (e) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card variant="elevated" className="rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Cadences</h3>
        <Link href="/sales/cadences" className="text-xs text-orange-600 hover:underline">Manage</Link>
      </div>
      {enrollments.length === 0 && <p className="text-xs text-gray-500">Not in any cadence.</p>}
      {enrollments.map((e) => (
        <div key={e.id} className="text-xs border-t border-gray-100 pt-2">
          <p className="font-medium text-gray-800">
            {e.cadence?.name || 'Cadence'} ·{' '}
            {e.status === 'active' ? 'running' : e.status === 'completed' ? 'completed' : STOP_REASON_LABELS[e.stopReason] || 'stopped'}
          </p>
          <ul className="mt-1 space-y-0.5 text-gray-600">
            {e.history.map((h, i) => (
              <li key={i}>Day {h.day} {STEP_TYPE_LABELS[h.type]}: {STATUS_TEXT[h.status] || h.status}</li>
            ))}
            {e.status === 'active' && e.nextRunAt && <li className="text-gray-400">Next step {new Date(e.nextRunAt).toLocaleString()}</li>}
          </ul>
        </div>
      ))}
      {canEdit && (
        <div className="space-y-2 border-t border-gray-100 pt-3">
          <div className="flex gap-2">
            <select value={pick} onChange={(e) => setPick(e.target.value)} className="flex-1 min-w-0 rounded-lg border border-gray-200 px-2 py-1.5 text-sm" aria-label="Cadence">
              <option value="">Enrol in cadence…</option>
              {cadences.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <Button size="sm" disabled={!pick || busy} onClick={() => act(() => cadenceService.enroll(pick, [leadId]), 'Enrolled. Day-1 steps ran.')}>Enrol</Button>
          </div>
          {running.length > 0 && (
            <Button size="sm" variant="outline" disabled={busy} onClick={() => act(() => cadenceService.markReplied(leadId), 'Marked as replied. Cadence stopped.')}>
              Lead replied — stop cadence
            </Button>
          )}
          {msg && <p className="text-xs text-gray-600">{msg}</p>}
        </div>
      )}
    </Card>
  );
}
