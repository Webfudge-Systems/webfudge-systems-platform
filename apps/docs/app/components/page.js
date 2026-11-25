import Link from 'next/link';
import { DocsArticle, DocsAppCard, DocsProse } from '@webfudge/ui/doc-components';
import DocPageLayout from '../../components/DocPageLayout';
import { COMPONENT_STORIES } from '../../lib/componentStories';

export const metadata = { title: 'Component Catalog' };

export default function ComponentsCatalogPage() {
  const storyGroups = [
    { label: 'Core UI', match: ['buttons-badges', 'form-controls', 'data-table', 'modal-tabs'] },
    { label: 'Docs UI', match: ['docs-article-prose', 'docs-callouts-steps', 'docs-cards-search-feedback', 'docs-walkthrough'] },
  ];

  return (
    <DocPageLayout crumbs={[{ label: 'Docs', href: '/' }, { label: 'Components' }]} showToc={false}>
      <DocsArticle
        category="Components"
        title="Component Catalog"
        description="Interactive Storybook examples for @webfudge/ui and the documentation shell, grouped by product UI and docs UI patterns."
      >
        <DocsProse>
          <p>
            Storybook runs on <code>localhost:6010</code> in development and is built into the docs app for production.
          </p>
        </DocsProse>

        <div className="mt-8 flex flex-wrap gap-2">
          {storyGroups.map((group) => (
            <span
              key={group.label}
              className="rounded-full border border-brand-border bg-white/70 px-3 py-1 text-xs font-bold text-brand-text-light dark:border-white/10 dark:bg-white/5 dark:text-gray-300"
            >
              {group.label}
            </span>
          ))}
        </div>

        {storyGroups.map((group) => {
          const stories = COMPONENT_STORIES.filter((story) => group.match.includes(story.slug));
          return (
            <section key={group.label} className="mt-8">
              <h2 className="text-lg font-bold text-brand-dark dark:text-white">{group.label}</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {stories.map((story) => (
                  <DocsAppCard
                    key={story.slug}
                    badge="Story"
                    title={story.title}
                    description={story.description}
                    href={`/components/${story.slug}`}
                  />
                ))}
              </div>
            </section>
          );
        })}

        <p className="mt-6 text-sm text-brand-text-muted">
          Prefer the full catalog?{' '}
          <Link href="/storybook/index.html" className="font-medium text-brand-primary hover:underline">
            Open static Storybook
          </Link>
          .
        </p>
      </DocsArticle>
    </DocPageLayout>
  );
}
