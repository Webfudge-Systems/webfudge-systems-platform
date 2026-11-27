'use strict';

/**
 * W8 project docs: pure helpers for the TipTap (ProseMirror JSON) content stored on a doc.
 * Kept free of Strapi so they can be unit-tested and reused (e.g. by Fudge AI later).
 *
 * Node types the PM editor writes that the backend cares about:
 *  - `mention`  { attrs: { id: <userId>, label } }   → @mention, notifies the user
 *  - `taskLink` { attrs: { id: <taskId>, label } }   → link to a Work task
 */

const MAX_CONTENT_BYTES = 1024 * 1024; // 1 MB of JSON per doc
/** A new automatic snapshot is taken at most this often per editor (ms). */
const SNAPSHOT_INTERVAL_MS = 10 * 60 * 1000;

const BLOCK_TYPES = new Set([
  'paragraph',
  'heading',
  'blockquote',
  'codeBlock',
  'listItem',
  'taskItem',
  'horizontalRule',
]);

function isDocJson(content) {
  return Boolean(content) && typeof content === 'object' && !Array.isArray(content) && content.type === 'doc';
}

function walk(node, visit) {
  if (!node || typeof node !== 'object') return;
  visit(node);
  if (Array.isArray(node.content)) node.content.forEach((child) => walk(child, visit));
}

/** Plain text of a doc: one line per block, mentions as `@Name`, task links as `#Name`. */
function docToPlainText(content) {
  if (!isDocJson(content)) return '';
  const lines = [];
  let line = '';
  const flush = () => {
    if (line.trim()) lines.push(line.trim());
    line = '';
  };
  const visit = (node) => {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'text') line += node.text || '';
    else if (node.type === 'mention') line += `@${node.attrs?.label || ''}`;
    else if (node.type === 'taskLink') line += `#${node.attrs?.label || ''}`;
    else if (node.type === 'hardBreak') line += ' ';
    const isBlock = BLOCK_TYPES.has(node.type);
    if (Array.isArray(node.content)) {
      // A list item holds paragraphs; flush only at the leaf blocks so items stay one line each.
      node.content.forEach(visit);
    }
    if (isBlock) flush();
  };
  visit(content);
  flush();
  return lines.join('\n');
}

function positiveIds(values) {
  const out = [];
  const seen = new Set();
  for (const raw of values) {
    const n = Number(raw);
    if (!Number.isInteger(n) || n < 1 || seen.has(n)) continue;
    seen.add(n);
    out.push(n);
  }
  return out;
}

function nodeIds(content, type) {
  if (!isDocJson(content)) return [];
  const ids = [];
  walk(content, (node) => {
    if (node.type === type) ids.push(node.attrs?.id);
  });
  return positiveIds(ids);
}

const mentionedUserIds = (content) => nodeIds(content, 'mention');
const linkedTaskIds = (content) => nodeIds(content, 'taskLink');

/** User ids mentioned now that were not mentioned before (these get a notification). */
function newMentionIds(previousIds, content) {
  const before = new Set(positiveIds(Array.isArray(previousIds) ? previousIds : []));
  return mentionedUserIds(content).filter((id) => !before.has(id));
}

/** Validate incoming content. Returns null when ok, else an error message. */
function contentError(content) {
  if (content == null) return null;
  if (!isDocJson(content)) return 'content must be a TipTap document ({ type: "doc", content: [...] })';
  let size = 0;
  try {
    size = Buffer.byteLength(JSON.stringify(content), 'utf8');
  } catch {
    return 'content is not valid JSON';
  }
  if (size > MAX_CONTENT_BYTES) return 'Document is too large (limit 1 MB)';
  return null;
}

/**
 * Should the state *before* this edit be kept as a version? Yes when the doc has content and either
 * there is no snapshot yet, the last one is older than SNAPSHOT_INTERVAL_MS, or someone else made
 * the last edit (so each person's work can be restored separately).
 */
function shouldSnapshotBeforeEdit(doc, editorUserId, now = Date.now()) {
  if (!doc) return false;
  const hasContent = Boolean(String(doc.contentText || '').trim()) || isDocJson(doc.content);
  if (!hasContent) return false;
  const lastEditor = doc.lastEditedBy && typeof doc.lastEditedBy === 'object' ? doc.lastEditedBy.id : doc.lastEditedBy;
  if (lastEditor != null && Number(lastEditor) !== Number(editorUserId)) return true;
  if (!doc.lastSnapshotAt) return true;
  return now - new Date(doc.lastSnapshotAt).getTime() >= SNAPSHOT_INTERVAL_MS;
}

function snippet(text, max = 160) {
  const s = String(text || '').replace(/\s+/g, ' ').trim();
  return s.length <= max ? s : `${s.slice(0, max)}…`;
}

module.exports = {
  MAX_CONTENT_BYTES,
  SNAPSHOT_INTERVAL_MS,
  isDocJson,
  docToPlainText,
  mentionedUserIds,
  linkedTaskIds,
  newMentionIds,
  contentError,
  shouldSnapshotBeforeEdit,
  snippet,
};
