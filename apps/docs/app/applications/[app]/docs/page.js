import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  DocsArticle,
  DocsWalkthrough,
  DocsCallout,
  DocsProse,
} from '@webfudge/ui/doc-components';
import DocPageLayout from '../../../../components/DocPageLayout';
import MarkdownRenderer from '../../../../components/MarkdownRenderer';
import { getApplication, getApplicationSlugs } from '../../../../lib/applications';
import { STRAPI_API_URL } from '../../../../lib/strapiConfig';
import CrmDocPage from '../../../../components/docs/CrmDocPage';
import PmDocPage from '../../../../components/docs/PmDocPage';
import AccountsDocPage from '../../../../components/docs/AccountsDocPage';

export const revalidate = 60;

async function getAppDocumentation(appSlug) {
  try {
    const res = await fetch(
      `${STRAPI_API_URL}/api/documentation-pages?filters[application][slug][$eq]=${appSlug}&filters[status][$eq]=published&sort[0]=order:asc`,
      { next: { revalidate: 60 } }
    );
    if (!res.ok) return [];
    const json = await res.json();
    return json?.data || [];
  } catch {
    return [];
  }
}

async function getAppLandingPage(appSlug) {
  try {
    const res = await fetch(
      `${STRAPI_API_URL}/api/documentation-pages/${appSlug}`,
      { next: { revalidate: 60 } }
    );
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data || null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }) {
  const app = await getApplication(params.app);
  if (!app) return { title: 'Not Found' };
  return {
    title: `${app.name} — Official Documentation`,
    description: `Comprehensive documentation for ${app.name}: ${app.tagline}`,
  };
}

// Map slugs to their unique custom doc page components
const CUSTOM_DOC_PAGES = {
  crm: CrmDocPage,
  pm: PmDocPage,
  accounts: AccountsDocPage,
};

export default async function AppDocumentationPage({ params }) {
  const app = await getApplication(params.app);

  if (!app) {
    notFound();
  }

  // Custom product docs are the primary experience for first-party apps.
  // Render them before CMS content so the animated CRM page is always active.
  const CustomDocPage = CUSTOM_DOC_PAGES[params.app];
  if (CustomDocPage) {
    return <CustomDocPage app={app} />;
  }

  // Fetch documentation pages for this app from Strapi
  const docPages = await getAppDocumentation(params.app);
  const landingPage = await getAppLandingPage(params.app);

  const crumbs = [
    { label: 'Docs', href: '/' },
    { label: 'Applications' },
    { label: app.name, href: `/applications/${params.app}` },
    { label: 'Documentation' },
  ];

  // If Strapi has a landing page, render it
  if (landingPage) {
    const category = landingPage.application?.name || landingPage.category || '';
    return (
      <DocPageLayout
        crumbs={crumbs}
        feedbackPage={{ id: landingPage.id, slug: landingPage.slug, title: landingPage.title }}
      >
        <DocsArticle
          category={category}
          title={landingPage.title}
          description={landingPage.description}
        >
          {Array.isArray(landingPage.walkthrough) && landingPage.walkthrough.length > 0 && (
            <DocsWalkthrough steps={landingPage.walkthrough} />
          )}
          <MarkdownRenderer html={landingPage.content} />

          {docPages.length > 1 && (
            <div className="mt-12 pt-8 border-t border-brand-border">
              <h3 className="text-lg font-semibold text-brand-dark mb-4">More Documentation</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {docPages
                  .filter((p) => p.id !== landingPage.id)
                  .map((page) => (
                    <Link
                      key={page.id}
                      href={`/docs/${page.slug}`}
                      className="glass-panel block rounded-xl p-4 transition-all hover:border-brand-primary/30 hover:bg-glass-200"
                    >
                      <h4 className="font-medium text-brand-dark dark:text-white">{page.title}</h4>
                      {page.description && (
                        <p className="text-sm text-brand-text-light dark:text-gray-400 mt-1 line-clamp-2">{page.description}</p>
                      )}
                    </Link>
                  ))}
              </div>
            </div>
          )}
        </DocsArticle>
      </DocPageLayout>
    );
  }

  // Generic fallback for other apps with Strapi pages
  return (
    <DocPageLayout crumbs={crumbs} showToc={false}>
      <DocsArticle
        category={app.name}
        title={`${app.name} — Official Documentation`}
        description={`Comprehensive documentation for ${app.tagline}`}
      >
        {docPages.length > 0 ? (
          <div className="space-y-6">
            <DocsProse>
              <p>Browse the available documentation for {app.name}:</p>
            </DocsProse>
            <div className="grid gap-4 sm:grid-cols-2">
              {docPages.map((page) => (
                <Link
                  key={page.id}
                  href={`/docs/${page.slug}`}
                  className="glass-panel block rounded-xl p-5 transition-all hover:border-brand-primary/30 hover:bg-glass-200"
                >
                  <h3 className="font-semibold text-brand-dark dark:text-white">{page.title}</h3>
                  {page.description && (
                    <p className="text-sm text-brand-text-light dark:text-gray-400 mt-2 line-clamp-2">{page.description}</p>
                  )}
                  <span className="inline-flex items-center gap-1 mt-3 text-sm text-brand-primary font-medium">
                    Read documentation →
                  </span>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <DocsCallout variant="info" title="Documentation coming soon">
            <p className="mb-4">
              Official documentation for {app.name} is being prepared. Check back soon for comprehensive guides, tutorials, and API references.
            </p>
            <Link
              href={`/applications/${params.app}`}
              className="inline-flex items-center gap-2 rounded-lg border border-brand-border px-4 py-2 text-sm font-medium text-brand-foreground dark:text-gray-200 hover:bg-brand-hover dark:hover:bg-white/5 transition-colors"
            >
              ← Back to {app.name} Overview
            </Link>
          </DocsCallout>
        )}
      </DocsArticle>
    </DocPageLayout>
  );
}

export async function generateStaticParams() {
  const slugs = await getApplicationSlugs();
  return slugs.map((app) => ({ app }));
}
