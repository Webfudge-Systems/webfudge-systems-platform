const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');

function toAbsolute(inputPath) {
  return path.isAbsolute(inputPath) ? inputPath : path.resolve(repoRoot, inputPath);
}

function listMarkdownFiles(root = repoRoot) {
  const files = [];
  const ignored = new Set(['node_modules', '.next', '.git', 'storybook-static']);

  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (ignored.has(entry.name)) continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(fullPath);
      if (entry.isFile() && /\.(md|mdx)$/i.test(entry.name)) files.push(fullPath);
    }
  }

  walk(root);
  return files;
}

function hashFile(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function draftReadmeFromSource({ paths = [] }) {
  const files = paths.map(toAbsolute).filter((filePath) => fs.existsSync(filePath));
  const sections = files.map((filePath) => {
    const rel = path.relative(repoRoot, filePath).replace(/\\/g, '/');
    const source = fs.readFileSync(filePath, 'utf8');
    const exported = Array.from(source.matchAll(/export function (\w+)|export const (\w+)|function (\w+)|class (\w+)/g))
      .map((match) => match[1] || match[2] || match[3] || match[4])
      .filter(Boolean)
      .slice(0, 12);

    return [
      `## ${rel}`,
      '',
      '### Purpose',
      `Describe how \`${rel}\` fits into the Webfudge platform.`,
      '',
      '### Public API',
      exported.length ? exported.map((name) => `- \`${name}\``).join('\n') : '- Document exported functions, components, and configuration.',
      '',
      '### Usage Notes',
      '- Add setup, environment variables, and common workflows.',
    ].join('\n');
  });

  return `# Documentation Draft\n\n${sections.join('\n\n')}\n`;
}

function refineReadme({ path: readmePath }) {
  const absolutePath = toAbsolute(readmePath);
  const markdown = fs.readFileSync(absolutePath, 'utf8');
  const hasUsage = /^##\s+Usage/im.test(markdown);
  const hasSetup = /^##\s+Setup/im.test(markdown);
  const hasTroubleshooting = /^##\s+Troubleshooting/im.test(markdown);

  const suggestions = [];
  if (!hasSetup) suggestions.push('Add a `## Setup` section with install commands and required environment variables.');
  if (!hasUsage) suggestions.push('Add a `## Usage` section with the common developer workflow.');
  if (!hasTroubleshooting) suggestions.push('Add a `## Troubleshooting` section for common local failures.');

  return {
    file: path.relative(repoRoot, absolutePath).replace(/\\/g, '/'),
    suggestions,
    summary: suggestions.length ? 'README can be made more complete.' : 'README already has the core structure.',
  };
}

function checkDocLinks({ root = 'docs' } = {}) {
  const targetRoot = toAbsolute(root);
  const files = fs.existsSync(targetRoot) ? listMarkdownFiles(targetRoot) : [];
  const broken = [];

  for (const filePath of files) {
    const markdown = fs.readFileSync(filePath, 'utf8');
    const links = Array.from(markdown.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)).map((match) => match[1]);

    for (const link of links) {
      if (/^[a-z][a-z0-9+.-]*:/i.test(link) || link.startsWith('#')) continue;
      const [linkPath] = link.split('#');
      if (!linkPath) continue;
      const resolved = path.resolve(path.dirname(filePath), linkPath);
      if (!fs.existsSync(resolved)) {
        broken.push({
          file: path.relative(repoRoot, filePath).replace(/\\/g, '/'),
          link,
        });
      }
    }
  }

  return { checkedFiles: files.length, broken };
}

function detectStaleDocs({ sourceRoot = '.', docsRoot = 'docs' } = {}) {
  const sourceFiles = listMarkdownFiles(toAbsolute(sourceRoot)).filter((filePath) => /README\.md$/i.test(filePath));
  const docsFiles = listMarkdownFiles(toAbsolute(docsRoot));
  const docsText = docsFiles.map((filePath) => fs.readFileSync(filePath, 'utf8')).join('\n');

  const stale = sourceFiles
    .map((filePath) => {
      const rel = path.relative(repoRoot, filePath).replace(/\\/g, '/');
      const hash = hashFile(filePath);
      return { file: rel, hash, referenced: docsText.includes(rel) || docsText.includes(hash) };
    })
    .filter((entry) => !entry.referenced);

  return { checkedReadmes: sourceFiles.length, stale };
}

function suggestTranslation({ markdown = '', targetLocale = 'es' }) {
  return [
    `<!-- Translation draft target: ${targetLocale}. Review before publishing. -->`,
    markdown || 'Provide markdown content to translate.',
  ].join('\n\n');
}

function extractAppMetadataFromReadme({ path: readmePath, markdown = '' } = {}) {
  let content = String(markdown || '');
  let filePath = '';

  if (!content && readmePath) {
    const absolutePath = toAbsolute(readmePath);
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`README not found: ${readmePath}`);
    }
    content = fs.readFileSync(absolutePath, 'utf8');
    filePath = path.relative(repoRoot, absolutePath).replace(/\\/g, '/');
  }

  if (!content.trim()) {
    throw new Error('Provide README content via `markdown` or `path`.');
  }

  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n?/);
  const frontmatter = parseSimpleFrontmatter(frontmatterMatch?.[1] || '');
  const body = frontmatterMatch ? content.slice(frontmatterMatch[0].length) : content;

  const heading = (body.match(/^#\s+(.+)$/m)?.[1] || '').trim();
  const title = frontmatter.title || heading || 'New Application';
  const slug = slugify(frontmatter.slug || frontmatter.app || title);
  const description =
    frontmatter.description ||
    firstParagraph(body) ||
    `${title} documentation`;
  const category = frontmatter.category || 'Applications';
  const tagline = frontmatter.tagline || description;

  const suggestedFeatures = extractBullets(body, /(##|###)\s+features?/i, 8);
  const suggestedGettingStarted = extractBullets(
    body,
    /(##|###)\s+(getting started|quick start|setup)/i,
    6
  );
  const color = frontmatter.color || '#F5630F';

  const warnings = [];
  if (!frontmatter.title && !heading) warnings.push('No clear title found; using fallback.');
  if (!suggestedFeatures.length) warnings.push('No feature bullets detected.');
  if (!suggestedGettingStarted.length) warnings.push('No getting-started steps detected.');

  return {
    sourcePath: filePath,
    title,
    slug,
    tagline,
    description,
    category,
    color,
    suggestedFeatures,
    suggestedGettingStarted,
    warnings,
  };
}

function parseSimpleFrontmatter(frontmatterText = '') {
  const obj = {};
  const lines = frontmatterText.split('\n');
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    value = value.replace(/^['"]|['"]$/g, '');
    obj[key] = value;
  }
  return obj;
}

function firstParagraph(markdown = '') {
  const cleaned = markdown
    .replace(/```[\s\S]*?```/g, '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  return cleaned.find((line) => !line.startsWith('#') && !line.startsWith('-') && !line.startsWith('*')) || '';
}

function extractBullets(markdown = '', headingRegex, limit = 6) {
  const lines = markdown.split('\n');
  const start = lines.findIndex((line) => headingRegex.test(line));
  if (start === -1) return [];

  const bullets = [];
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (/^##\s+/.test(line)) break;
    const match = line.match(/^[-*]\s+(.+)$/);
    if (!match) continue;
    bullets.push(match[1].trim());
    if (bullets.length >= limit) break;
  }
  return bullets;
}

function slugify(value = '') {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

module.exports = {
  checkDocLinks,
  detectStaleDocs,
  draftReadmeFromSource,
  extractAppMetadataFromReadme,
  refineReadme,
  suggestTranslation,
};
