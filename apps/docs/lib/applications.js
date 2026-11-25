import { getSiteContent, getApplicationFromContent } from './siteContent';
import { DEFAULT_SITE_CONTENT } from './siteContentDefaults';

export const APPLICATIONS = DEFAULT_SITE_CONTENT.applications;

export async function getApplication(slug) {
  const content = await getSiteContent();
  return getApplicationFromContent(content, slug) || DEFAULT_SITE_CONTENT.applications[slug] || null;
}

export async function getApplicationSlugs() {
  const content = await getSiteContent();
  return Object.keys(content?.applications || DEFAULT_SITE_CONTENT.applications || {});
}

export function getApplicationSync(slug) {
  return DEFAULT_SITE_CONTENT.applications[slug] || null;
}
