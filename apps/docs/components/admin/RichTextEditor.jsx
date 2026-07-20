'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect } from 'react';

export default function RichTextEditor({ value = '', onChange, placeholder = 'Write content…' }) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value || '<p></p>',
    editorProps: {
      attributes: {
        class:
          'min-h-[110px] rounded-lg border border-brand-border bg-white px-3 py-2.5 text-sm text-brand-foreground focus:outline-none',
      },
    },
    onUpdate: ({ editor: instance }) => {
      onChange(instance.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;
    const incoming = value || '<p></p>';
    if (incoming !== editor.getHTML()) {
      editor.commands.setContent(incoming, false);
    }
  }, [value, editor]);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        <button type="button" onClick={() => editor?.chain().focus().toggleBold().run()} className="rounded border border-brand-border px-2 py-1 text-xs hover:bg-brand-hover">Bold</button>
        <button type="button" onClick={() => editor?.chain().focus().toggleItalic().run()} className="rounded border border-brand-border px-2 py-1 text-xs hover:bg-brand-hover">Italic</button>
        <button type="button" onClick={() => editor?.chain().focus().toggleBulletList().run()} className="rounded border border-brand-border px-2 py-1 text-xs hover:bg-brand-hover">Bullet</button>
        <button type="button" onClick={() => editor?.chain().focus().toggleOrderedList().run()} className="rounded border border-brand-border px-2 py-1 text-xs hover:bg-brand-hover">Numbered</button>
        <button type="button" onClick={() => editor?.chain().focus().toggleBlockquote().run()} className="rounded border border-brand-border px-2 py-1 text-xs hover:bg-brand-hover">Quote</button>
      </div>
      <EditorContent editor={editor} />
      {!value ? <p className="text-xs text-brand-text-muted">{placeholder}</p> : null}
    </div>
  );
}
