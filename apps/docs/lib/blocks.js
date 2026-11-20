/**
 * Content block utilities — serialize blocks ↔ markdown for docs pages.
 */

export const BLOCK_TYPES = [
  { id: 'heading', label: 'Heading' },
  { id: 'paragraph', label: 'Paragraph' },
  { id: 'callout', label: 'Callout' },
  { id: 'steps', label: 'Step List' },
  { id: 'features', label: 'Feature Grid' },
  { id: 'table', label: 'Table' },
  { id: 'image', label: 'Image' },
  { id: 'componentEmbed', label: 'Component Embed' },
  { id: 'mermaid', label: 'Flowchart (Mermaid)' },
  { id: 'walkthrough', label: 'Walkthrough' },
  { id: 'code', label: 'Code Block' },
  { id: 'appDiagram', label: 'App Diagram' },
  { id: 'divider', label: 'Divider' },
];

export const CALLOUT_VARIANTS = ['tip', 'info', 'warning', 'danger'];
export const TEXT_ALIGNS = ['left', 'center', 'right'];

export function createBlock(type) {
  const id = `block-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  switch (type) {
    case 'heading':
      return { id, type, level: 2, text: 'New heading', style: { align: 'left' } };
    case 'paragraph':
      return { id, type, text: '<p>New paragraph text…</p>', style: { align: 'left' } };
    case 'callout':
      return { id, type, variant: 'info', title: 'Note', body: '<p>Callout content…</p>' };
    case 'steps':
      return {
        id,
        type,
        steps: [{ title: 'Step one', description: 'Description' }],
      };
    case 'features':
      return {
        id,
        type,
        items: [{ title: 'Feature', description: 'Description' }],
      };
    case 'table':
      return {
        id,
        type,
        headers: ['Column A', 'Column B'],
        rows: [['Value 1', 'Value 2']],
      };
    case 'code':
      return { id, type, language: 'javascript', code: '// code here' };
    case 'image':
      return { id, type, src: '', alt: '', caption: '' };
    case 'componentEmbed':
      return { id, type, storyId: 'doc-components-overview--article-and-prose', title: 'Component Demo' };
    case 'mermaid':
      return { id, type, code: 'flowchart TD\n  start[Start] --> finish[Finish]' };
    case 'walkthrough':
      return {
        id,
        type,
        steps: [
          { title: 'Step 1', description: 'Describe this step.' },
          { title: 'Step 2', description: 'Describe the next step.' },
        ],
      };
    case 'appDiagram':
      return {
        id,
        type,
        apps: [
          { name: 'CRM', port: '3007' },
          { name: 'PM', port: '3006' },
          { name: 'Accounts', port: '3003' },
        ],
        backend: { name: 'Strapi API', subtitle: 'Auth · RBAC · Data', port: '1338' },
      };
    case 'divider':
      return { id, type };
    default:
      return { id, type: 'paragraph', text: '' };
  }
}

export function blocksToMarkdown(blocks = []) {
  return blocks
    .map((block) => {
      switch (block.type) {
        case 'heading': {
          const prefix = '#'.repeat(Math.min(6, Math.max(1, block.level || 2)));
          return `${prefix} ${block.text || ''}`;
        }
        case 'paragraph':
          return htmlToText(block.text || '');
        case 'callout': {
          const title = block.title ? `**${block.title}**` : '';
          const body = htmlToText(block.body || '').split('\n').map((line) => `> ${line}`).join('\n');
          return title ? `> ${title}\n${body}` : body;
        }
        case 'steps':
          return (block.steps || [])
            .map((step, i) => `### ${i + 1}. ${step.title}\n\n${step.description || ''}`)
            .join('\n\n');
        case 'features':
          return (block.items || [])
            .map((item) => `### ${item.title}\n\n${item.description || ''}`)
            .join('\n\n');
        case 'table': {
          const headers = block.headers || [];
          const rows = block.rows || [];
          const headerLine = `| ${headers.join(' | ')} |`;
          const sep = `| ${headers.map(() => '---').join(' | ')} |`;
          const body = rows.map((row) => `| ${row.join(' | ')} |`).join('\n');
          return [headerLine, sep, body].filter(Boolean).join('\n');
        }
        case 'code':
          return `\`\`\`${block.language || ''}\n${block.code || ''}\n\`\`\``;
        case 'image':
          return `![${block.alt || ''}](${block.src || ''})`;
        case 'componentEmbed':
          return `<!-- componentEmbed:${block.storyId || ''}:${block.title || ''} -->`;
        case 'mermaid':
          return `\`\`\`mermaid\n${block.code || ''}\n\`\`\``;
        case 'walkthrough':
          return (block.steps || [])
            .map((step, i) => `### ${i + 1}. ${step.title}\n\n${step.description || ''}`)
            .join('\n\n');
        case 'divider':
          return '---';
        default:
          return '';
      }
    })
    .filter(Boolean)
    .join('\n\n');
}

export function markdownToBlocks(markdown = '') {
  if (!markdown?.trim()) return [];

  const blocks = [];
  const sections = markdown.split(/\n\n+/);

  for (const section of sections) {
    const trimmed = section.trim();
    if (!trimmed) continue;

    if (/^---+$/.test(trimmed)) {
      blocks.push(createBlock('divider'));
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      blocks.push({
        ...createBlock('heading'),
        level: headingMatch[1].length,
        text: headingMatch[2],
      });
      continue;
    }

    const codeMatch = trimmed.match(/^```(\w*)\n([\s\S]*?)```$/);
    if (codeMatch) {
      if ((codeMatch[1] || '').toLowerCase() === 'mermaid') {
        blocks.push({
          ...createBlock('mermaid'),
          code: codeMatch[2],
        });
        continue;
      }
      blocks.push({
        ...createBlock('code'),
        language: codeMatch[1] || 'text',
        code: codeMatch[2],
      });
      continue;
    }

    const imageMatch = trimmed.match(/^!\[(.*?)\]\((.*?)\)$/);
    if (imageMatch) {
      blocks.push({
        ...createBlock('image'),
        alt: imageMatch[1],
        src: imageMatch[2],
      });
      continue;
    }

    if (trimmed.startsWith('>')) {
      const lines = trimmed.split('\n').map((l) => l.replace(/^>\s?/, ''));
      const titleMatch = lines[0]?.match(/^\*\*(.+)\*\*$/);
      blocks.push({
        ...createBlock('callout'),
        title: titleMatch ? titleMatch[1] : lines[0] || '',
        body: titleMatch ? lines.slice(1).join('\n') : lines.slice(1).join('\n'),
        variant: 'info',
      });
      continue;
    }

    if (trimmed.startsWith('|')) {
      const lines = trimmed.split('\n').filter((l) => l.trim());
      const headers = lines[0].split('|').map((c) => c.trim()).filter(Boolean);
      const rows = lines.slice(2).map((line) =>
        line.split('|').map((c) => c.trim()).filter(Boolean)
      );
      blocks.push({ ...createBlock('table'), headers, rows });
      continue;
    }

    blocks.push({ ...createBlock('paragraph'), text: `<p>${escapeHtml(trimmed)}</p>` });
  }

  return blocks;
}

function htmlToText(html = '') {
  return String(html)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
