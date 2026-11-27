import StarterKit from '@tiptap/starter-kit';
import Mention from '@tiptap/extension-mention';
import { TaskList, TaskItem } from '@tiptap/extension-list';
import { Placeholder } from '@tiptap/extensions';
import { PluginKey } from '@tiptap/pm/state';
import { suggestionPopup } from './suggestionPopup';

const userLabel = (u) => u?.name || [u?.firstName, u?.lastName].filter(Boolean).join(' ') || u?.username || u?.email || `User ${u?.id}`;

/**
 * `#` task link: an inline atom node like a mention, stored as { type: 'taskLink', attrs: { id, label } }.
 * The backend reads these to show linked task statuses.
 */
const TaskLink = Mention.extend({
  name: 'taskLink',
  parseHTML() {
    return [{ tag: 'a[data-type="taskLink"]' }, { tag: 'span[data-type="taskLink"]' }];
  },
});

/**
 * TipTap extensions for project docs. The same list renders read-only version previews
 * (pass no lookups there).
 *
 * @param {object} opts
 * @param {() => Array} [opts.getUsers]  org members for @mentions
 * @param {(query: string) => Promise<Array>} [opts.searchTasks]  tasks for # links
 * @param {string} [opts.placeholder]
 */
export function docExtensions({ getUsers, searchTasks, placeholder } = {}) {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      link: { openOnClick: false, autolink: true, HTMLAttributes: { rel: 'noopener noreferrer nofollow', target: '_blank' } },
    }),
    TaskList,
    TaskItem.configure({ nested: true }),
    Placeholder.configure({ placeholder: placeholder || 'Write something… type @ to mention, # to link a task' }),
    Mention.configure({
      HTMLAttributes: { class: 'wf-doc-mention' },
      renderText: ({ node }) => `@${node.attrs.label ?? node.attrs.id}`,
      renderHTML: ({ options, node }) => ['span', { ...options.HTMLAttributes, 'data-user-id': node.attrs.id }, `@${node.attrs.label ?? node.attrs.id}`],
      suggestion: {
        char: '@',
        pluginKey: new PluginKey('docMention'),
        items: ({ query }) => {
          const q = String(query || '').toLowerCase();
          return (getUsers?.() || [])
            .filter((u) => !q || userLabel(u).toLowerCase().includes(q) || String(u.email || '').toLowerCase().includes(q))
            .slice(0, 8);
        },
        render: suggestionPopup(
          (u) => ({ primary: userLabel(u), secondary: u.email || '' }),
          (u) => ({ id: String(u.id), label: userLabel(u) })
        ),
      },
    }),
    TaskLink.configure({
      HTMLAttributes: { class: 'wf-doc-tasklink' },
      renderText: ({ node }) => `#${node.attrs.label ?? node.attrs.id}`,
      renderHTML: ({ options, node }) => [
        'a',
        { ...options.HTMLAttributes, href: `/tasks/${node.attrs.id}`, 'data-task-id': node.attrs.id },
        `#${node.attrs.label ?? node.attrs.id}`,
      ],
      suggestion: {
        char: '#',
        pluginKey: new PluginKey('docTaskLink'),
        items: async ({ query }) => {
          if (!searchTasks) return [];
          try {
            return await searchTasks(query);
          } catch {
            return [];
          }
        },
        render: suggestionPopup(
          (t) => ({ primary: t.name || `Task ${t.id}`, secondary: String(t.status || '').replace(/_/g, ' ').toLowerCase() }),
          (t) => ({ id: String(t.id), label: t.name || `Task ${t.id}` })
        ),
      },
    }),
  ];
}
