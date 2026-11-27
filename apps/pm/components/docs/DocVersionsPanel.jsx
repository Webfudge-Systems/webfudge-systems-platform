'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import { History, RotateCcw, Save, X } from 'lucide-react';
import { Button, LoadingSpinner, Modal } from '@webfudge/ui';
import docService from '../../lib/api/docService';
import { docExtensions } from './docExtensions';

const REASON = {
  auto: 'Autosaved',
  manual: 'Saved version',
  before_restore: 'Before restore',
};

function fmt(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function VersionPreview({ content }) {
  const extensions = useMemo(() => docExtensions(), []);
  const editor = useEditor({ extensions, content, editable: false, immediatelyRender: false }, [content]);
  return (
    <div className="wf-doc-editor max-h-[60vh] overflow-y-auto rounded-xl border border-gray-200 bg-white px-5 py-4">
      <EditorContent editor={editor} />
    </div>
  );
}

/**
 * Version history side panel: list snapshots, preview one, restore it, or save the current state.
 * Restore keeps the current state as a version first, so it can be undone.
 */
export default function DocVersionsPanel({ docId, canEdit, refreshKey, onClose, onRestored, onBeforeSaveVersion }) {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setVersions(await docService.versions(docId));
      setError('');
    } catch (e) {
      setError(e?.message || 'Could not load versions');
    } finally {
      setLoading(false);
    }
  }, [docId]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const openPreview = async (v) => {
    setBusy(true);
    try {
      setPreview(await docService.version(docId, v.id));
    } catch (e) {
      setError(e?.message || 'Could not load that version');
    } finally {
      setBusy(false);
    }
  };

  const restore = async () => {
    if (!preview) return;
    setBusy(true);
    try {
      const doc = await docService.restore(docId, preview.id);
      setPreview(null);
      await load();
      onRestored?.(doc);
    } catch (e) {
      setError(e?.message || 'Restore failed');
    } finally {
      setBusy(false);
    }
  };

  const saveVersion = async () => {
    const note = window.prompt('Name this version (optional)', '');
    if (note === null) return;
    setBusy(true);
    try {
      await onBeforeSaveVersion?.();
      await docService.saveVersion(docId, note.trim());
      await load();
    } catch (e) {
      setError(e?.message || 'Could not save the version');
    } finally {
      setBusy(false);
    }
  };

  return (
    <aside className="flex h-full flex-col rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <History className="h-4 w-4 text-orange-600" /> Version history
        </h2>
        <button type="button" onClick={onClose} className="rounded-lg p-1 text-gray-500 hover:bg-gray-100" aria-label="Close version history">
          <X className="h-4 w-4" />
        </button>
      </div>
      {canEdit ? (
        <div className="border-b border-gray-100 px-4 py-3">
          <Button size="sm" variant="outline" onClick={saveVersion} disabled={busy} className="w-full justify-center">
            <Save className="mr-1.5 h-4 w-4" /> Save current version
          </Button>
        </div>
      ) : null}
      {error ? <p className="px-4 py-2 text-xs text-red-600">{error}</p> : null}
      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="flex justify-center py-8"><LoadingSpinner /></div>
        ) : versions.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-gray-500">
            No versions yet. A version is kept automatically when someone else edits, or every 10 minutes while you write.
          </p>
        ) : (
          <ul className="space-y-1">
            {versions.map((v) => (
              <li key={v.id}>
                <button
                  type="button"
                  onClick={() => openPreview(v)}
                  className="w-full rounded-lg px-3 py-2 text-left hover:bg-gray-50"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-gray-900">v{v.versionNumber}{v.note ? ` · ${v.note}` : ''}</span>
                    <span className="shrink-0 text-[11px] text-gray-400">{fmt(v.createdAt)}</span>
                  </div>
                  <div className="mt-0.5 text-xs text-gray-500">
                    {REASON[v.reason] || 'Version'}{v.author?.name ? ` · ${v.author.name}` : ''}
                  </div>
                  {v.excerpt ? <div className="mt-1 line-clamp-2 text-xs text-gray-400">{v.excerpt}</div> : null}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Modal
        isOpen={Boolean(preview)}
        onClose={() => setPreview(null)}
        title={preview ? `Version ${preview.versionNumber}` : ''}
        subtitle={preview ? `${REASON[preview.reason] || 'Version'} · ${preview.author?.name || ''} · ${fmt(preview.createdAt)}` : ''}
        size="xl"
      >
        {preview ? (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">{preview.title}</h3>
            <VersionPreview content={preview.content || { type: 'doc', content: [] }} />
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setPreview(null)} disabled={busy}>Close</Button>
              {canEdit ? (
                <Button onClick={restore} disabled={busy}>
                  <RotateCcw className="mr-1.5 h-4 w-4" /> {busy ? 'Restoring…' : 'Restore this version'}
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}
      </Modal>
    </aside>
  );
}
