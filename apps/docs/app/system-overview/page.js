import { DocsArticle } from '@webfudge/ui/doc-components';
import DocPageLayout from '../../components/DocPageLayout';
import BlockRenderer from '../../components/BlockRenderer';
import { getSiteContent } from '../../lib/siteContent';

export const revalidate = 30;

export async function generateMetadata() {
  const content = await getSiteContent();
  return { title: content.systemOverview?.title || 'System Overview' };
}

export default async function SystemOverviewPage() {
  const content = await getSiteContent();
  const page = content.systemOverview;

  return (
    <DocPageLayout crumbs={[{ label: 'Docs', href: '/' }, { label: 'System Overview' }]}>
      <DocsArticle
        category={page.category}
        title={page.title}
        description={page.description}
      >
        <BlockRenderer blocks={page.blocks} />
      </DocsArticle>
    </DocPageLayout>
  );
}
