export const COMPONENT_STORIES = [
  {
    slug: 'buttons-badges',
    title: 'Buttons and Badges',
    description: 'Primary controls and status badges used across workspace apps.',
    storyId: 'core-ui-overview--buttons-and-badges',
  },
  {
    slug: 'form-controls',
    title: 'Form Controls',
    description: 'Inputs and selects with validation, labels, and workspace styling.',
    storyId: 'core-ui-overview--form-controls',
  },
  {
    slug: 'data-table',
    title: 'Data Table',
    description: 'Reusable table variants for CRM, PM, Accounts, and admin screens.',
    storyId: 'core-ui-overview--data-table',
  },
  {
    slug: 'modal-tabs',
    title: 'Modal and Tabs',
    description: 'Navigation and dialog patterns used for focused workflows.',
    storyId: 'core-ui-overview--modal-and-tabs',
  },
  {
    slug: 'docs-article-prose',
    title: 'Docs Article and Prose',
    description: 'The main reading surface for documentation pages.',
    storyId: 'docs-components-overview--article-and-prose',
  },
  {
    slug: 'docs-callouts-steps',
    title: 'Docs Callouts and Steps',
    description: 'Guidance blocks and ordered walkthrough patterns.',
    storyId: 'docs-components-overview--callouts-and-steps',
  },
  {
    slug: 'docs-cards-search-feedback',
    title: 'Docs Cards, Search, and Feedback',
    description: 'Interactive docs navigation and feedback elements.',
    storyId: 'docs-components-overview--cards-search-and-feedback',
  },
  {
    slug: 'docs-walkthrough',
    title: 'Docs Walkthrough',
    description: 'A guided tutorial surface that can render MCP-generated walkthrough steps.',
    storyId: 'docs-components-overview--walkthrough',
  },
];

export function getComponentStory(slug) {
  return COMPONENT_STORIES.find((story) => story.slug === slug);
}
