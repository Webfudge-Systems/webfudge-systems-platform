import { DocsArticle, DocsProse } from '@webfudge/ui/doc-components';
import DocPageLayout from '../../components/DocPageLayout';

export const metadata = { title: 'Troubleshooting & FAQ' };

export default function TroubleshootingPage() {
  return (
    <DocPageLayout crumbs={[{ label: 'Docs', href: '/' }, { label: 'Troubleshooting & FAQ' }]}>
      <DocsArticle
        category="Reference"
        title="Troubleshooting & FAQ"
        description="Common setup issues and answers for local development."
      >
        <DocsProse>
        <h2>Docs app does not start</h2>
        <p>
          Run <code>npm install</code> from the monorepo root, then <code>npm run dev:docs</code>.
        </p>
        <h2>Styles look unstyled</h2>
        <p>
          Ensure <code>tailwind.config.js</code> includes <code>packages/ui/doc-components</code> in{' '}
          <code>content</code>.
        </p>
        </DocsProse>
      </DocsArticle>
    </DocPageLayout>
  );
}
