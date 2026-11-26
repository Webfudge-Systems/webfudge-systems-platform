'use client';

import {
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  ListChecks,
  Quote,
  Code2,
  Link2,
  Undo2,
  Redo2,
  AtSign,
  Hash,
  ListPlus,
} from 'lucide-react';

function Btn({ onClick, active, disabled, title, children }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active || undefined}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`inline-flex h-8 min-w-8 items-center justify-center gap-1 rounded-lg px-1.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        active ? 'bg-orange-100 text-orange-800' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }`}
    >
      {children}
    </button>
  );
}

const Sep = () => <span className="mx-1 h-5 w-px bg-gray-200" aria-hidden />;

/**
 * Formatting toolbar for the doc editor.
 * `onCreateTasks` turns the current line (or every selected line) into Work tasks.
 */
export default function DocToolbar({ editor, onCreateTasks, canCreateTasks, creatingTasks, createTasksHint }) {
  if (!editor) return null;
  const c = () => editor.chain().focus();
  const is = (name, attrs) => editor.isActive(name, attrs);

  const setLink = () => {
    const prev = editor.getAttributes('link').href || '';
    const url = window.prompt('Link URL', prev);
    if (url === null) return;
    if (!url.trim()) c().extendMarkRange('link').unsetLink().run();
    else c().extendMarkRange('link').setLink({ href: /^https?:\/\//i.test(url) ? url.trim() : `https://${url.trim()}` }).run();
  };

  return (
    <div className="flex flex-wrap items-center gap-0.5 rounded-xl border border-gray-200 bg-white px-2 py-1.5 shadow-sm">
      <Btn title="Bold (Ctrl+B)" active={is('bold')} onClick={() => c().toggleBold().run()}><Bold className="h-4 w-4" /></Btn>
      <Btn title="Italic (Ctrl+I)" active={is('italic')} onClick={() => c().toggleItalic().run()}><Italic className="h-4 w-4" /></Btn>
      <Btn title="Strikethrough" active={is('strike')} onClick={() => c().toggleStrike().run()}><Strikethrough className="h-4 w-4" /></Btn>
      <Btn title="Link" active={is('link')} onClick={setLink}><Link2 className="h-4 w-4" /></Btn>
      <Sep />
      <Btn title="Heading 1" active={is('heading', { level: 1 })} onClick={() => c().toggleHeading({ level: 1 }).run()}><Heading1 className="h-4 w-4" /></Btn>
      <Btn title="Heading 2" active={is('heading', { level: 2 })} onClick={() => c().toggleHeading({ level: 2 }).run()}><Heading2 className="h-4 w-4" /></Btn>
      <Btn title="Heading 3" active={is('heading', { level: 3 })} onClick={() => c().toggleHeading({ level: 3 }).run()}><Heading3 className="h-4 w-4" /></Btn>
      <Sep />
      <Btn title="Bulleted list" active={is('bulletList')} onClick={() => c().toggleBulletList().run()}><List className="h-4 w-4" /></Btn>
      <Btn title="Numbered list" active={is('orderedList')} onClick={() => c().toggleOrderedList().run()}><ListOrdered className="h-4 w-4" /></Btn>
      <Btn title="Checklist" active={is('taskList')} onClick={() => c().toggleTaskList().run()}><ListChecks className="h-4 w-4" /></Btn>
      <Btn title="Quote" active={is('blockquote')} onClick={() => c().toggleBlockquote().run()}><Quote className="h-4 w-4" /></Btn>
      <Btn title="Code block" active={is('codeBlock')} onClick={() => c().toggleCodeBlock().run()}><Code2 className="h-4 w-4" /></Btn>
      <Sep />
      <Btn title="Mention someone (@)" onClick={() => c().insertContent('@').run()}><AtSign className="h-4 w-4" /></Btn>
      <Btn title="Link a task (#)" onClick={() => c().insertContent('#').run()}><Hash className="h-4 w-4" /></Btn>
      <Sep />
      <Btn title="Undo" disabled={!editor.can().undo()} onClick={() => c().undo().run()}><Undo2 className="h-4 w-4" /></Btn>
      <Btn title="Redo" disabled={!editor.can().redo()} onClick={() => c().redo().run()}><Redo2 className="h-4 w-4" /></Btn>
      <span className="ml-auto" />
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={onCreateTasks}
        disabled={!canCreateTasks || creatingTasks}
        title={createTasksHint || 'Create a task from the current line, or one task per selected line'}
        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50 px-2.5 text-xs font-semibold text-orange-800 transition-colors hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <ListPlus className="h-4 w-4" />
        {creatingTasks ? 'Creating…' : 'Line → task'}
      </button>
    </div>
  );
}
