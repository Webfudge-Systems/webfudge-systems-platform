'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { EditorContent, useEditor } from '@tiptap/react';
import { AlertTriangle, CheckCircle2, FolderKanban, History, ListTodo, Trash2 } from 'lucide-react';
import { Button, Card, LoadingSpinner, Modal } from '@webfudge/ui';
import PMPageHeader from '../../../components/PMPageHeader';
import DocToolbar from '../../../components/docs/DocToolbar';
import DocVersionsPanel from '../../../components/docs/DocVersionsPanel';
import { docExtensions } from '../../../components/docs/docExtensions';
import docService, { DOC_TYPES, docTypeLabel } from '../../../lib/api/docService';
import taskService from '../../../lib/api/taskService';
import { fetchChatMentionUsers } from '../../../lib/api/chatMentionUsers';

const AUTOSAVE_MS = 1200;
const EMPTY_DOC = { type: 'doc', content: [{ type: 'paragraph' }] };

const STATUS_CHIP = {
  COMPLETED: 'bg-emerald-50 text-emerald-700',
  IN_PROGRESS: 'bg-sky-50 text-sky-700',
  INTERNAL_REVIEW: 'bg-violet-50 text-violet-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
};
const statusLabel = (s) => String(s || '').replace(/_/g, ' ').toLowerCase();

/** Text blocks the "Line → task" action works on: the current line, or every line in the selection. */
function selectedTextBlocks(state) {
  const { from, to, empty, $from } = state.selection;
  const blocks = [];
  if (empty) {
    const depth = $from.depth;
    if ($from.parent.isTextblock) blocks.push({ node: $from.parent, pos: $from.before(depth) });
  } else {
    state.doc.nodesBetween(from, to, (node, pos) => {
      if (node.isTextblock) {
        blocks.push({ node, pos });
        return false;
      }
      return true;
    });
  }
  return blocks
    .map((b) => {
      let hasLink = false;
      let text = '';
      b.node.forEach((child) => {
        if (child.type.name === 'taskLink') hasLink = true;
        else if (child.isText) text += child.text;
        else if (child.type.name === 'mention') text += `@${child.attrs.label || ''}`;
      });
      return { ...b, hasLink, text: text.replace(/\s+/g, ' ').trim() };
    })
    .filter((b) => b.text && !b.hasLink);
}

export default function DocPage() {
  const { id } = useParams();
  const router = useRouter();
  const [doc, setDoc] = useState(null);
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [title, setTitle] = useState('');
  const [saveState, setSaveState] = useState('idle'); // idle | dirty | saving | saved | error | conflict
  const [saveError, setSaveError] = useState('');
  const [conflict, setConflict] = useState(null);
  const [linkedTasks, setLinkedTasks] = useState([]);
  const [showVersions, setShowVersions] = useState(false);
  const [versionsKey, setVersionsKey] = useState(0);
  const [creatingTasks, setCreatingTasks] = useState(false);
  const [notice, setNotice] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);

  const usersRef = useRef([]);
  const docRef = useRef(null);
  const titleRef = useRef('');
  const baseRef = useRef(null);
  const timerRef = useRef(null);
  const savingRef = useRef(false);
  const dirtyRef = useRef(false);
  const pausedRef = useRef(false);
  const editorRef = useRef(null);

  const canEdit = Boolean(meta.canEdit);

  const extensions = useMemo(
    () =>
      docExtensions({
        getUsers: () => usersRef.current,
        searchTasks: (query) => docService.searchTasks({ query, projectId: docRef.current?.project?.id }),
      }),
    []
  );

  const save = useCallback(async ({ force = false } = {}) => {
    const editor = editorRef.current;
    if (!editor || !docRef.current) return;
    if (pausedRef.current && !force) return;
    if (savingRef.current) {
      dirtyRef.current = true;
      return;
    }
    clearTimeout(timerRef.current);
    savingRef.current = true;
    dirtyRef.current = false;
    setSaveState('saving');
    try {
      const updated = await docService.update(docRef.current.id, {
        title: titleRef.current,
        content: editor.getJSON(),
        ...(force ? {} : { baseUpdatedAt: baseRef.current }),
      });
      baseRef.current = updated.updatedAt;
      docRef.current = { ...docRef.current, ...updated };
      setDoc((d) => ({ ...d, ...updated, content: undefined }));
      setLinkedTasks(updated.linkedTasks || []);
      pausedRef.current = false;
      setConflict(null);
      setSaveError('');
      setSaveState(dirtyRef.current ? 'dirty' : 'saved');
      setVersionsKey((k) => k + 1);
    } catch (e) {
      if (e?.status === 409) {
        pausedRef.current = true;
        setConflict({ message: e.message, latest: e.details?.latest });
        setSaveState('conflict');
      } else {
        setSaveError(e?.message || 'Could not save');
        setSaveState('error');
      }
    } finally {
      savingRef.current = false;
      if (dirtyRef.current && !pausedRef.current) {
        timerRef.current = setTimeout(() => save(), AUTOSAVE_MS);
      }
    }
  }, []);

  const scheduleSave = useCallback(() => {
    dirtyRef.current = true;
    if (pausedRef.current) return;
    setSaveState('dirty');
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => save(), AUTOSAVE_MS);
  }, [save]);

  const editor = useEditor(
    {
      extensions,
      content: EMPTY_DOC,
      editable: false,
      immediatelyRender: false,
      shouldRerenderOnTransaction: true,
      editorProps: { attributes: { class: 'wf-doc-editor-content focus:outline-none', 'aria-label': 'Document body' } },
      onUpdate: ({ transaction }) => {
        if (transaction.getMeta('wfDocLoad')) return;
        scheduleSave();
      },
    },
    [extensions]
  );
  editorRef.current = editor;

  const applyDoc = useCallback(
    (d) => {
      docRef.current = d;
      baseRef.current = d.updatedAt;
      titleRef.current = d.title || '';
      setTitle(d.title || '');
      setDoc({ ...d, content: undefined });
      setLinkedTasks(d.linkedTasks || []);
      if (editorRef.current) {
        editorRef.current.chain().setMeta('wfDocLoad', true).setContent(d.content || EMPTY_DOC, { emitUpdate: false }).run();
      }
    },
    []
  );

  // Load the doc and the mention roster.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [{ doc: d, meta: m }, users] = await Promise.all([docService.get(id), fetchChatMentionUsers().catch(() => [])]);
        if (cancelled) return;
        if (!d) throw new Error('Doc not found');
        usersRef.current = Array.isArray(users) ? users : [];
        setMeta(m || {});
        applyDoc(d);
        setLoadError('');
      } catch (e) {
        if (!cancelled) setLoadError(e?.status === 404 ? 'This doc does not exist or you do not have access to it.' : e?.message || 'Could not load the doc');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, applyDoc]);

  // Push loaded content into the editor once both exist; enable editing for editors.
  useEffect(() => {
    if (!editor || !docRef.current) return;
    editor.chain().setMeta('wfDocLoad', true).setContent(docRef.current.content || EMPTY_DOC, { emitUpdate: false }).run();
    editor.setEditable(canEdit);
  }, [editor, canEdit, loading]);

  // Warn before leaving with unsaved changes; flush pending edits on unmount.
  useEffect(() => {
    const onBeforeUnload = (e) => {
      if (dirtyRef.current || savingRef.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      clearTimeout(timerRef.current);
      if (dirtyRef.current && !pausedRef.current) save();
    };
  }, [save]);

  const onTitleChange = (value) => {
    setTitle(value);
    titleRef.current = value;
    scheduleSave();
  };

  const createTasksFromLines = async () => {
    if (!editor || !docRef.current?.project?.id) return;
    const blocks = selectedTextBlocks(editor.state);
    if (!blocks.length) {
      setNotice('Put the cursor on a line with text (or select several lines) that is not already a task.');
      return;
    }
    if (blocks.length > 25) {
      setNotice('Select 25 lines or fewer at a time.');
      return;
    }
    setCreatingTasks(true);
    setNotice('');
    editor.setEditable(false);
    const created = [];
    const failed = [];
    try {
      for (const b of blocks) {
        try {
          const res = await taskService.createTask({
            name: b.text.slice(0, 250),
            projectId: docRef.current.project.id,
            description: `Created from the doc "${titleRef.current || 'Untitled doc'}"`,
          });
          const taskId = res?.data?.id ?? res?.id;
          if (taskId) created.push({ ...b, taskId, name: b.text.slice(0, 250) });
          else failed.push(b.text);
        } catch (e) {
          failed.push(b.text);
          if (e?.status === 403) break;
        }
      }
      // Insert links from the bottom up so earlier positions stay valid.
      const chain = editor.chain();
      [...created]
        .sort((a, b) => b.pos - a.pos)
        .forEach((b) => {
          const end = b.pos + b.node.nodeSize - 1;
          chain.insertContentAt(end, [
            { type: 'text', text: ' ' },
            { type: 'taskLink', attrs: { id: String(b.taskId), label: b.name } },
          ]);
        });
      chain.run();
      setLinkedTasks((list) => [...list, ...created.map((c) => ({ id: c.taskId, name: c.name, status: 'SCHEDULED' }))]);
      if (created.length) setNotice(`Created ${created.length} task${created.length === 1 ? '' : 's'} in ${docRef.current.project.name}.`);
      if (failed.length) setNotice((n) => `${n ? `${n} ` : ''}${failed.length} could not be created (check your task permissions).`);
    } finally {
      editor.setEditable(canEdit);
      setCreatingTasks(false);
    }
  };

  const onEditorClick = (e) => {
    const a = e.target.closest?.('a[data-task-id]');
    if (!a) return;
    e.preventDefault();
    const href = `/tasks/${a.getAttribute('data-task-id')}`;
    if (!canEdit || e.metaKey || e.ctrlKey) {
      if (e.metaKey || e.ctrlKey) window.open(href, '_blank', 'noopener');
      else router.push(href);
    }
  };

  const resolveConflict = async (keepMine) => {
    if (keepMine) {
      await save({ force: true });
      return;
    }
    const latest = conflict?.latest;
    pausedRef.current = false;
    dirtyRef.current = false;
    setConflict(null);
    if (latest) applyDoc({ ...latest, linkedTasks });
    setSaveState('saved');
  };

  const onRestored = (restored) => {
    pausedRef.current = false;
    dirtyRef.current = false;
    setConflict(null);
    applyDoc(restored);
    setSaveState('saved');
    setNotice('Version restored. The previous state was kept in the history.');
  };

  const deleteDoc = async () => {
    try {
      await docService.remove(docRef.current.id);
      dirtyRef.current = false;
      const project = docRef.current.project;
      router.push(project ? `/projects/${project.id}?tab=docs` : '/docs');
    } catch (e) {
      setNotice(e?.message || 'Could not delete the doc');
      setDeleteOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (loadError || !doc) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <PMPageHeader title="Doc" breadcrumb={[{ label: 'Dashboard', href: '/' }, { label: 'Docs', href: '/docs' }]} />
        <Card className="p-6 text-sm text-gray-700">{loadError || 'Doc not found'}</Card>
      </div>
    );
  }

  const saveLabel = {
    idle: '',
    dirty: 'Unsaved changes',
    saving: 'Saving…',
    saved: 'Saved',
    error: saveError || 'Save failed',
    conflict: 'Not saved',
  }[saveState];

  const createTasksHint = !doc.project
    ? 'Workspace docs have no project: open a project doc to create tasks'
    : !meta.canCreateTasks
      ? 'You need write access to tasks'
      : 'Create a task from the current line, or one task per selected line';

  return (
    <div className="space-y-4 p-4 md:p-6">
      <PMPageHeader
        title={doc.title || 'Untitled doc'}
        subtitle={`${docTypeLabel(doc.docType)}${doc.project ? ` · ${doc.project.name}` : doc.workspace ? ` · ${doc.workspace.name} workspace` : ''}`}
        breadcrumb={[
          { label: 'Dashboard', href: '/' },
          { label: 'Docs', href: '/docs' },
          ...(doc.project ? [{ label: doc.project.name, href: `/projects/${doc.project.id}?tab=docs` }] : []),
          { label: doc.title || 'Untitled doc', href: `/docs/${doc.id}` },
        ]}
      />

      {conflict ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="alert">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="flex-1">{conflict.message} Your edits are paused.</span>
          <Button size="sm" variant="outline" onClick={() => resolveConflict(false)}>Load their version</Button>
          <Button size="sm" onClick={() => resolveConflict(true)}>Keep mine</Button>
        </div>
      ) : null}
      {notice ? (
        <div className="flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-2.5 text-sm text-orange-900" role="status">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span className="flex-1">{notice}</span>
          <button type="button" className="text-xs font-medium underline" onClick={() => setNotice('')}>Dismiss</button>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <input
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              disabled={!canEdit}
              placeholder="Untitled doc"
              aria-label="Doc title"
              maxLength={200}
              className="min-w-0 flex-1 bg-transparent text-2xl font-bold text-gray-900 placeholder:text-gray-300 focus:outline-none disabled:text-gray-900"
            />
            <span className={`text-xs ${saveState === 'error' || saveState === 'conflict' ? 'text-red-600' : 'text-gray-400'}`} aria-live="polite">
              {saveLabel}
            </span>
            {canEdit ? (
              <select
                value={doc.docType}
                onChange={async (e) => {
                  const docType = e.target.value;
                  setDoc((d) => ({ ...d, docType }));
                  try {
                    await docService.update(doc.id, { docType });
                  } catch (err) {
                    setNotice(err?.message || 'Could not change the type');
                  }
                }}
                aria-label="Doc type"
                className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-700"
              >
                {DOC_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            ) : null}
            <Button size="sm" variant={showVersions ? 'secondary' : 'outline'} onClick={() => setShowVersions((v) => !v)}>
              <History className="mr-1.5 h-4 w-4" /> History{doc.versionCount ? ` (${doc.versionCount})` : ''}
            </Button>
            {meta.canDelete ? (
              <button type="button" onClick={() => setDeleteOpen(true)} className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600" aria-label="Delete doc" title="Delete doc">
                <Trash2 className="h-4 w-4" />
              </button>
            ) : null}
          </div>

          {canEdit ? (
            <div className="sticky top-0 z-10">
              <DocToolbar
                editor={editor}
                onCreateTasks={createTasksFromLines}
                canCreateTasks={Boolean(doc.project) && Boolean(meta.canCreateTasks)}
                creatingTasks={creatingTasks}
                createTasksHint={createTasksHint}
              />
            </div>
          ) : (
            <p className="text-xs text-gray-500">You can read this doc. Ask a project editor for write access to change it.</p>
          )}

          <div className="wf-doc-editor min-h-[60vh] rounded-xl border border-gray-200 bg-white px-6 py-5 shadow-sm md:px-10 md:py-8" onClick={onEditorClick}>
            <EditorContent editor={editor} />
          </div>
          {canEdit ? (
            <p className="text-xs text-gray-400">
              Type <kbd className="rounded bg-gray-100 px-1">@</kbd> to mention someone (they get notified), <kbd className="rounded bg-gray-100 px-1">#</kbd> to link a task.
              Ctrl/⌘-click a task link to open it.
            </p>
          ) : null}
        </div>

        <div className="space-y-4">
          {showVersions ? (
            <div className="h-[70vh]">
              <DocVersionsPanel
                docId={doc.id}
                canEdit={canEdit}
                refreshKey={versionsKey}
                onClose={() => setShowVersions(false)}
                onRestored={onRestored}
                onBeforeSaveVersion={async () => {
                  if (dirtyRef.current) await save();
                }}
              />
            </div>
          ) : null}
          <Card className="space-y-3 p-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <ListTodo className="h-4 w-4 text-orange-600" /> Linked tasks
            </h2>
            {linkedTasks.length === 0 ? (
              <p className="text-xs text-gray-500">
                {doc.project
                  ? 'Put the cursor on a line and press “Line → task”, or type # to link an existing task.'
                  : 'Type # to link an existing task.'}
              </p>
            ) : (
              <ul className="space-y-1.5">
                {linkedTasks.map((t) => (
                  <li key={t.id}>
                    <Link href={`/tasks/${t.id}`} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-gray-50">
                      <span className={`truncate ${t.status === 'COMPLETED' ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{t.name}</span>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${STATUS_CHIP[t.status] || 'bg-orange-50 text-orange-700'}`}>
                        {statusLabel(t.status)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card className="space-y-2 p-4 text-xs text-gray-600">
            {doc.project ? (
              <Link href={`/projects/${doc.project.id}?tab=docs`} className="flex items-center gap-2 font-medium text-gray-900 hover:text-orange-700">
                <FolderKanban className="h-4 w-4 text-orange-600" /> {doc.project.name}
              </Link>
            ) : doc.workspace ? (
              <p className="font-medium text-gray-900">{doc.workspace.name} workspace</p>
            ) : null}
            {doc.author?.name ? <p>Created by {doc.author.name}</p> : null}
            {doc.lastEditedBy?.name ? (
              <p>
                Last edited by {doc.lastEditedBy.name}
                {doc.updatedAt ? ` · ${new Date(doc.updatedAt).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}` : ''}
              </p>
            ) : null}
          </Card>
        </div>
      </div>

      <Modal isOpen={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete doc" size="sm">
        <div className="space-y-5">
          <p className="text-sm text-gray-700">
            Delete <span className="font-semibold text-gray-900">{doc.title || 'Untitled doc'}</span> and its version history? Tasks created from it stay.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="danger" onClick={deleteDoc}>Delete</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
