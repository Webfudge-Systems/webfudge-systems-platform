import { notFound } from 'next/navigation';
import { DocsArticle, DocsComponentEmbed, DocsProse } from '@webfudge/ui/doc-components';
import DocPageLayout from '../../../components/DocPageLayout';
import { COMPONENT_STORIES, getComponentStory } from '../../../lib/componentStories';

export function generateStaticParams() {
  return COMPONENT_STORIES.map((story) => ({ name: story.slug }));
}

export function generateMetadata({ params }) {
  const story = getComponentStory(params.name);
  return {
    title: story?.title || 'Component Not Found',
    description: story?.description || '',
  };
}

export default function ComponentStoryPage({ params }) {
  const story = getComponentStory(params.name);

  if (!story) notFound();

  return (
    <DocPageLayout
      crumbs={[
        { label: 'Docs', href: '/' },
        { label: 'Components', href: '/components' },
        { label: story.title },
      ]}
      feedbackPage={{ slug: `components/${story.slug}`, title: story.title }}
    >
      <DocsArticle
        category="Components"
        title={story.title}
        description={story.description}
      >
        <DocsProse>
          <p>
            Edit the underlying story in <code>packages/ui/stories</code>. Production docs load the static
            Storybook build from <code>apps/docs/public/storybook</code>.
          </p>
        </DocsProse>
        <DocsComponentEmbed storyId={story.storyId} title={story.title} className="mt-8" />
      </DocsArticle>
    </DocPageLayout>
  );
}
