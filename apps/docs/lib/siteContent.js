import fs from 'fs/promises';
import path from 'path';
import { DEFAULT_SITE_CONTENT } from './siteContentDefaults';

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'site-content.json');

export async function readSiteContentFile() {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function writeSiteContentFile(content) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(content, null, 2), 'utf-8');
}

export async function getSiteContent() {
  const stored = await readSiteContentFile();
  const merged = !stored
    ? structuredClone(DEFAULT_SITE_CONTENT)
    : deepMerge(structuredClone(DEFAULT_SITE_CONTENT), stored);
  return ensureApplicationsNavigation(merged);
}

export function getApplicationFromContent(content, slug) {
  return content?.applications?.[slug] || null;
}

function deepMerge(base, override) {
  if (!override || typeof override !== 'object') return base;
  for (const key of Object.keys(override)) {
    if (
      override[key] &&
      typeof override[key] === 'object' &&
      !Array.isArray(override[key]) &&
      base[key] &&
      typeof base[key] === 'object' &&
      !Array.isArray(base[key])
    ) {
      base[key] = deepMerge(base[key], override[key]);
    } else {
      base[key] = override[key];
    }
  }
  return base;
}

function ensureApplicationsNavigation(content) {
  const applications = content?.applications || {};
  if (!Array.isArray(content.navigation)) return content;

  const appsSection = content.navigation.find((section) => section.key === 'applications');
  if (!appsSection) return content;
  if (!Array.isArray(appsSection.items)) appsSection.items = [];

  for (const [slug, app] of Object.entries(applications)) {
    const appHref = `/applications/${slug}`;
    const appLabel = app?.name || slug;

    if (!appsSection.items.some((item) => item.href === appHref)) {
      appsSection.items.push({ label: appLabel, href: appHref });
    }
  }

  // Filter out any "— Official Documentation" items that were previously added
  appsSection.items = appsSection.items.filter((item) => !item.label.includes('— Official Documentation'));

  return content;
}
