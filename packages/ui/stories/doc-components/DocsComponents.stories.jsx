import {
  DocsAppCard,
  DocsArticle,
  DocsCallout,
  DocsFeedback,
  DocsProse,
  DocsSearchResults,
  DocsStepList,
  DocsWalkthrough,
} from '../../doc-components';

const meta = {
  title: 'Docs Components/Overview',
  parameters: {
    layout: 'padded',
  },
};

export default meta;

export function ArticleAndProse() {
  return (
    <div className="max-w-3xl">
      <DocsArticle
        category="Getting Started"
        title="Build immersive documentation"
        description="DocsArticle and DocsProse provide the main reading surface for Webfudge documentation pages."
      >
        <DocsProse>
          <h2>Readable defaults</h2>
          <p>
            Prose content receives consistent heading, paragraph, table, inline code, and code block styles.
          </p>
          <pre>
            <code>{'npm run dev:docs'}</code>
          </pre>
        </DocsProse>
      </DocsArticle>
    </div>
  );
}

export function CalloutsAndSteps() {
  return (
    <div className="max-w-2xl">
      <DocsCallout variant="tip" title="Tip">
        Use callouts for concise guidance that should stand out from the surrounding prose.
      </DocsCallout>
      <DocsStepList
        steps={[
          { title: 'Open the docs app', description: 'Run the app locally or open the deployed docs URL.' },
          { title: 'Search for a topic', description: 'Use the top bar search to find relevant docs quickly.' },
          { title: 'Send feedback', description: 'Mark whether a page was helpful after reading.' },
        ]}
      />
    </div>
  );
}

export function CardsSearchAndFeedback() {
  return (
    <div className="grid max-w-3xl gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <DocsAppCard
          badge="CRM"
          title="Fudge Grow"
          description="Sales pipeline, contacts, accounts, proposals, and revenue workflows."
          href="#"
        />
        <DocsAppCard
          badge="PM"
          title="Fudge Flow"
          description="Project delivery, tasks, inbox, calendar, and team collaboration."
          href="#"
        />
      </div>
      <div className="relative max-w-md">
        <DocsSearchResults
          query="crm"
          results={[
            {
              slug: 'crm',
              title: 'CRM overview',
              category: 'Applications',
              application: { name: 'Fudge Grow' },
              snippet: 'Learn how CRM teams manage leads, deals, and client accounts.',
            },
          ]}
          onClose={() => {}}
        />
      </div>
      <DocsFeedback onSubmit={() => Promise.resolve()} />
    </div>
  );
}

export function Walkthrough() {
  return (
    <div className="max-w-2xl">
      <DocsWalkthrough
        steps={[
          { title: 'Find the right app', description: 'Start from the application card that matches your workflow.' },
          { title: 'Read the setup guide', description: 'Follow the ordered steps and verify local URLs.' },
          { title: 'Try the component', description: 'Open the embedded Storybook story and adjust controls.' },
        ]}
      />
    </div>
  );
}
