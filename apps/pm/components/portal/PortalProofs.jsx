'use client';

/**
 * Client portal (W9): the versions of a deliverable with pinned review comments.
 * Approve / request changes stays on the deliverable card (W10 approval flow), which also
 * stamps the latest version.
 */

import { useCallback, useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Layers } from 'lucide-react';
import { ProofViewer } from '@webfudge/ui/components/ProofViewer';
import { API_BASE_URL, portalRequest } from '../../lib/portalClient';

export default function PortalProofs({ projectId, taskId, refreshKey, defaultOpen = false }) {
  const [versions, setVersions] = useState(null);
  const [open, setOpen] = useState(defaultOpen);
  const [error, setError] = useState('');

  const base = `/projects/${projectId}/tasks/${taskId}/proofs`;
  const load = useCallback(async () => {
    try {
      const data = await portalRequest(base);
      setVersions(data?.versions || []);
    } catch (e) {
      setError(e.message);
    }
  }, [base]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  if (error) return <p className="mt-3 text-xs text-rose-600">{error}</p>;
  if (!versions || versions.length === 0) return null;

  const latest = versions[0];
  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-800 hover:bg-gray-50"
      >
        <Layers className="h-4 w-4 text-[#F5630F]" />
        {open ? 'Hide' : 'Review'} {latest.label}
        {versions.length > 1 ? <span className="text-xs font-normal text-gray-500">({versions.length} versions)</span> : null}
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {open ? (
        <ProofViewer
          className="mt-3"
          versions={versions}
          apiBase={API_BASE_URL}
          composerPlaceholder="Tell the team what to change here…"
          onAddComment={async ({ versionId, body, x, y, timestamp }) => {
            await portalRequest(`${base}/${versionId}/comments`, { method: 'POST', body: { body, x, y, timestamp } });
            await load();
          }}
        />
      ) : null}
    </div>
  );
}
