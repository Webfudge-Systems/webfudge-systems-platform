'use client';

import { useEffect, useState } from 'react';
import { Button, Modal } from '@webfudge/ui';
import { useCrmSettings } from '../lib/api/crmSettingsService';

const FALLBACK = ['Price too high', 'Chose a competitor', 'No budget', 'No response / went cold', 'Timing — not now', 'Not a fit', 'Other'];

/** Ask why a deal was lost (G15 lost-reason analysis). Reasons come from Settings → Industries & lead sources. */
export default function LostReasonModal({ isOpen, dealName, busy = false, onSave, onSkip }) {
  const settings = useCrmSettings();
  const reasons = settings?.lost_reasons?.items?.length ? settings.lost_reasons.items : FALLBACK;
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (isOpen) setReason('');
  }, [isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onSkip} title="Why was this deal lost?" size="sm">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (reason) onSave(reason);
        }}
        className="space-y-4"
      >
        <p className="text-sm text-gray-600">
          {dealName ? <span className="font-medium text-gray-900">{dealName}</span> : 'This deal'} was marked lost. The reason feeds
          the lost-reason report in Analytics.
        </p>
        <fieldset className="space-y-2">
          <legend className="sr-only">Lost reason</legend>
          {reasons.map((r) => (
            <label key={r} className="flex items-center gap-2 text-sm text-gray-800">
              <input type="radio" name="lost-reason" value={r} checked={reason === r} onChange={() => setReason(r)} />
              {r}
            </label>
          ))}
        </fieldset>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onSkip} disabled={busy}>
            Skip
          </Button>
          <Button type="submit" disabled={!reason || busy}>
            Save reason
          </Button>
        </div>
      </form>
    </Modal>
  );
}
