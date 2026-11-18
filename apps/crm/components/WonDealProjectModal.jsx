'use client';

import { useEffect, useState } from 'react';
import { Modal, Button } from '@webfudge/ui';
import strapiClient from '../lib/strapiClient';

/** Suggest a Work template from the deal name (G23). */
function suggestTemplate(name, templates) {
  const n = String(name || '').toLowerCase();
  const rules = [
    [/web|site|landing|portal|app\b|e-?commerce|shopify|wordpress/, 'website-build'],
    [/\bads?\b|campaign|ppc|meta|google|performance|marketing|lead gen/, 'ad-campaign'],
    [/video|film|shoot|reel|animation/, 'video-production'],
    [/retainer|onboard|monthly|social|seo|smm/, 'client-onboarding'],
  ];
  const hit = rules.find(([re]) => re.test(n));
  return hit && templates.some((t) => t.key === hit[1]) ? hit[1] : '';
}

const selectCls =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20';

/**
 * Won deal → delivery project (G23): optional Work template (phases + tasks), start date and draft invoice plan.
 * Calls onCreateProject({ templateKey, startDate, invoicePlan }).
 */
export default function WonDealProjectModal({ open, dealName, busy = false, onClose, onSkipProject, onCreateProject }) {
  const [templates, setTemplates] = useState(null);
  const [templateKey, setTemplateKey] = useState('');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [invoicePlan, setInvoicePlan] = useState('full');

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    strapiClient
      .get('/projects/templates')
      .then((res) => {
        if (cancelled) return;
        const list = Array.isArray(res?.data) ? res.data : [];
        setTemplates(list);
        setTemplateKey(suggestTemplate(dealName, list));
      })
      .catch(() => {
        // No Work access: still allow a blank project + invoice.
        if (!cancelled) setTemplates([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open, dealName]);

  const selected = (templates || []).find((t) => t.key === templateKey);

  return (
    <Modal
      isOpen={open}
      onClose={busy ? () => {} : onClose}
      title="Deal marked as won"
      showCloseButton={!busy}
      closeOnBackdrop={!busy}
    >
      <p className="text-sm text-gray-600">
        <span className="font-semibold text-gray-900">{dealName || 'This deal'}</span> is set to{' '}
        <span className="font-semibold text-emerald-800">Won</span>. Create its delivery project in Work? The client,
        deal value and any proposals (SOW) are carried over.
      </p>

      <div className="mt-5 space-y-4">
        {templates && templates.length ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="text-sm font-medium text-gray-700">Project template</span>
              <select className={selectCls} value={templateKey} onChange={(e) => setTemplateKey(e.target.value)} disabled={busy}>
                <option value="">Blank project</option>
                {templates.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.name} ({t.taskCount} tasks)
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium text-gray-700">Start date</span>
              <input
                type="date"
                className={selectCls}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={busy || !templateKey}
              />
            </label>
            {selected ? (
              <p className="text-xs text-gray-500 sm:col-span-2">
                {selected.phases.map((p) => p.name).join(' → ')} · about {selected.durationDays} days. You can assign
                people on each task later.
              </p>
            ) : null}
          </div>
        ) : null}

        <label className="block space-y-1">
          <span className="text-sm font-medium text-gray-700">Invoice</span>
          <select className={selectCls} value={invoicePlan} onChange={(e) => setInvoicePlan(e.target.value)} disabled={busy}>
            <option value="full">Draft invoice for the full deal value</option>
            <option value="split50">Two drafts: 50% advance now, 50% on delivery</option>
            <option value="none">No invoice</option>
          </select>
          <span className="block text-xs text-gray-500">Drafts are not sent. Review them under Clients → Invoices.</span>
        </label>
      </div>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
        <Button type="button" variant="outline" disabled={busy} onClick={onClose}>
          Cancel
        </Button>
        <Button type="button" variant="outline" disabled={busy} onClick={onSkipProject}>
          {busy ? 'Saving…' : 'Skip project'}
        </Button>
        <Button
          type="button"
          variant="primary"
          disabled={busy}
          onClick={() => onCreateProject({ templateKey: templateKey || undefined, startDate, invoicePlan })}
        >
          {busy ? 'Working…' : 'Create project'}
        </Button>
      </div>
    </Modal>
  );
}
