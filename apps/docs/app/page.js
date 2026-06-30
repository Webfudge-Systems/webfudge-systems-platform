import DocPageLayout from '../components/DocPageLayout';
import BlockRenderer from '../components/BlockRenderer';
import { getSiteContent } from '../lib/siteContent';
import HomeHeroClient from '../components/HomeHeroClient';

export const revalidate = 30;

import { STRAPI_API_URL } from '../lib/strapiConfig';

async function getApps() {
  try {
    const res = await fetch(`${STRAPI_API_URL}/api/documentation/apps`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    const json = await res.json();
    return json?.data || [];
  } catch {
    return [];
  }
}

export default async function IntroductionPage() {
  const content = await getSiteContent();
  const { home } = content;
  const apiApps = await getApps();
  const apps = apiApps.length > 0
    ? apiApps
    : Object.values(content.applications || {}).map((app) => ({
        name: app.name,
        slug: app.slug,
        description: app.tagline,
        color: app.color,
      }));

  return (
    <DocPageLayout crumbs={[{ label: 'Docs' }, { label: 'Introduction' }]} showToc={false}>
      {/* Premium Home Hero and 3D Cards Grid Component */}
      <HomeHeroClient apps={apps} />

      <div className="mt-8 border-t border-brand-border/40 dark:border-white/5 pt-8 max-w-4xl mx-auto">
        <BlockRenderer blocks={home.blocks} />
      </div>
    </DocPageLayout>
  );
}
