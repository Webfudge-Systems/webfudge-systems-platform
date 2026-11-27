'use client';

/**
 * Approvals & proofing (W9) on a task in Work: upload v1 / v2 / …, review with pinned comments,
 * approve or request changes. The viewer itself is the shared @webfudge/ui ProofViewer.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { ThumbsUp, Undo2, Upload } from 'lucide-react';
import { ProofViewer } from '@webfudge/ui/components/ProofViewer';
import { PM_API_BASE } from '../lib/entityMedia';
import {
  addProofComment,
  decideProofVersion,
  listTaskProofs,
  resolveProofComment,
  uploadProofVersion,
} from '../lib/api/proofService';

const CLIENT_APPROVAL = {
  pending: 'Waiting for the client',
  approved: 'Client approved',
  changes_requested: 'Client asked for changes',
};

function UploadVersion({ taskId, nextLabel, onUploaded }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      await uploadProofVersion(taskId, { file, note });
      setFile(null);
      setNote('');
      if (inputRef.current) inputRef.current.value = '';
      await onUploaded();
    } catch (err) {
      setError(err?.message || 'Upload failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-2 rounded-2xl border border-dashed border-gray-300 bg-white p-4">
      <div className="min-w-[200px] flex-1">
        <label htmlFor="proof-file" className="block text-sm font-medium text-gray-800">Upload {nextLabel}</label>
        <input
          id="proof-file"
          ref={inputRef}
          type="file"
          accept="image/*,video/*,application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="mt-1 block w-full text-sm text-gray-700 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-gray-200"
        />
      </div>
      <div className="min-w-[200px] flex-1">
        <label htmlFor="proof-note" className="block text-sm font-medium text-gray-800">What changed (optional)</label>
        <input
          id="proof-note"
          value={note}
          maxLength={2000}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Bigger logo, new end card"
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-[#F5630F] focus:outline-none focus:ring-2 focus:ring-[#F5630F]/20"
        />
      </div>
      <button type="submit" disabled={!file || busy} className="inline-flex items-center gap-1.5 rounded-lg bg-[#F5630F] px-3 py-2 text-sm font-semibold text-white hover:bg-[#e0560a] disabled:opacity-50">
        <Upload className="h-4 w-4" /> {busy ? 'Uploading…' : `Upload ${nextLabel}`}
      </button>
      {error ? <p className="w-full text-sm text-rose-600">{error}</p> : null}
    </form>
  );
}

function DecisionControls({ version, onDecided }) {
  const [mode, setMode] = useState(null);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e?.preventDefault();
    setBusy(true);
    setError('');
    try {
      await decideProofVersion(version.id, { decision: mode, comment });
      setMode(null);
      setComment('');
      await onDecided();
    } catch (err) {
      setError(err?.message || 'Could not save the decision.');
    } finally {
      setBusy(false);
    }
  };

  if (!mode) {
    return (
      <div className="flex gap-1.5">
        <button type="button" onClick={() => setMode('approve')} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700">
          <ThumbsUp className="h-3.5 w-3.5" /> Approve
        </button>
        <button type="button" onClick={() => setMode('request_changes')} className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs font-semibold text-gray-800 hover:bg-gray-50">
          <Undo2 className="h-3.5 w-3.5" /> Request changes
        </button>
      </div>
    );
  }
  return (
    <form onSubmit={submit} className="flex flex-wrap items-center gap-1.5">
      <input
        autoFocus
        value={comment}
        required={mode === 'request_changes'}
        maxLength={5000}
        onChange={(e) => setComment(e.target.value)}
        placeholder={mode === 'approve' ? 'Note (optional)' : 'What should change?'}
        aria-label="Decision note"
        className="w-56 rounded-lg border border-gray-300 px-2.5 py-1 text-xs focus:border-[#F5630F] focus:outline-none"
      />
      <button type="submit" disabled={busy} className={`rounded-lg px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-60 ${mode === 'approve' ? 'bg-emerald-600' : 'bg-gray-900'}`}>
        {busy ? 'Saving…' : mode === 'approve' ? 'Approve' : 'Send back'}
      </button>
      <button type="button" onClick={() => setMode(null)} className="rounded-lg px-2 py-1 text-xs text-gray-600 hover:bg-gray-100">Cancel</button>
      {error ? <span className="text-xs text-rose-600">{error}</span> : null}
    </form>
  );
}

export default function TaskProofsPanel({ taskId, onCountChange }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await listTaskProofs(taskId);
      setData(res);
      onCountChange?.(res?.versions?.length || 0);
    } catch (err) {
      setError(err?.message || 'Could not load proofs.');
    }
  }, [taskId, onCountChange]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) return <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-rose-600">{error}</div>;
  if (!data) return <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500">Loading proofs…</div>;

  const nextLabel = `v${(data.versions[0]?.version || 0) + 1}`;
  const clientNote = data.taskType === 'deliverable' && data.clientVisible ? CLIENT_APPROVAL[data.clientApprovalStatus] : null;

  return (
    <div className="space-y-4">
      {clientNote ? (
        <p className="text-sm text-gray-600">
          Shared in the client portal · <span className="font-medium text-gray-900">{clientNote}</span>
          {data.versions.length ? '. Uploading a new version asks the client to review again.' : ''}
        </p>
      ) : null}
      {data.canEdit ? <UploadVersion taskId={taskId} nextLabel={nextLabel} onUploaded={load} /> : null}
      <ProofViewer
        versions={data.versions}
        apiBase={PM_API_BASE}
        allowInternal={data.clientVisible}
        onAddComment={async ({ versionId, ...payload }) => {
          await addProofComment(versionId, payload);
          await load();
        }}
        onResolveComment={
          data.canEdit
            ? async (comment, resolved) => {
                await resolveProofComment(comment.id, resolved);
                await load();
              }
            : undefined
        }
        renderActions={(version, { isLatest }) => (data.canEdit && isLatest ? <DecisionControls key={version.id} version={version} onDecided={load} /> : null)}
        emptyState={
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
            <p className="text-sm font-medium text-gray-900">No proofs yet</p>
            <p className="mt-1 text-sm text-gray-500">
              {data.canEdit ? 'Upload the first version (image, video or PDF) to start the review.' : 'The first version has not been uploaded yet.'}
            </p>
          </div>
        }
      />
    </div>
  );
}
