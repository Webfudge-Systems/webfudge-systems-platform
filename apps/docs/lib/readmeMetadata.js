import { analyzeReadmeForBlocks } from './readmeAnalysis';

export function extractReadmeMetadata(markdown = '') {
  const content = String(markdown || '');
  if (!content.trim()) {
    throw new Error('README content is required.');
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
  const color = frontmatter.color || '#F5630F';

  const suggestedFeatures = extractBullets(body, /(##|###)\s+features?/i, 8);
  const suggestedGettingStarted = extractBullets(
    body,
    /(##|###)\s+(getting started|quick start|setup)/i,
    6
  );

  const warnings = [];
  if (!frontmatter.title && !heading) warnings.push('No clear title found; using fallback.');
  if (!suggestedFeatures.length) warnings.push('No feature bullets detected.');
  if (!suggestedGettingStarted.length) warnings.push('No getting-started steps detected.');

  const suggestedBlocks = analyzeReadmeForBlocks(body);

  return {
    title,
    slug,
    tagline,
    description,
    category,
    color,
    suggestedFeatures,
    suggestedGettingStarted,
    suggestedBlocks,
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
