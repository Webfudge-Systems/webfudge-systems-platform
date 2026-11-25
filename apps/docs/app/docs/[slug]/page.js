import { notFound } from 'next/navigation';
import { DocsArticle, DocsWalkthrough } from '@webfudge/ui/doc-components';
import DocPageLayout from '../../../components/DocPageLayout';
import MarkdownRenderer from '../../../components/MarkdownRenderer';
import BlockRenderer from '../../../components/BlockRenderer';
import { STRAPI_API_URL } from '../../../lib/strapiConfig';

export const revalidate = 60;

export async function generateMetadata({ params }) {
  const page = await _fetchPage(params.slug);
  if (!page) return { title: 'Not Found' };
  return {
    title: page.title,
    description: page.description || '',
  };
}

async function _fetchPage(slug) {
  try {
    const res = await fetch(`${STRAPI_API_URL}/api/documentation-pages/${slug}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data || null;
  } catch {
    return null;
  }
}

export default async function DocPage({ params }) {
  const page = await _fetchPage(params.slug);

  if (!page) notFound();

  const category = page.application?.name || page.category || '';
  const showRawHtmlButton = page.sourceType === 'html'
    && page.htmlSource
    && (page.category === 'Applications' || page.application?.name);
  const crumbs = [
    { label: 'Docs', href: '/' },
    ...(category ? [{ label: category }] : []),
    { label: page.title },
  ];

  return (
    <DocPageLayout crumbs={crumbs} feedbackPage={{ id: page.id, slug: page.slug, title: page.title }}>
      <DocsArticle
        category={category}
        title={page.title}
        description={page.description}
      >
        {showRawHtmlButton ? (
          <div className="mb-8">
            <a
              href={`/docs/html/${page.slug}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center rounded-xl bg-brand-primary px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-brand-primary/90"
            >
              View Documentation
            </a>
          </div>
        ) : null}
        <DocsWalkthrough steps={Array.isArray(page.walkthrough) ? page.walkthrough : []} />
        {Array.isArray(page.contentBlocks) && page.contentBlocks.length > 0 ? (
          <BlockRenderer blocks={page.contentBlocks} />
        ) : (
          <MarkdownRenderer html={page.content} />
        )}
      </DocsArticle>
    </DocPageLayout>
  );
}
