import { DocsArticle, DocsProse } from '@webfudge/ui/doc-components';
import DocPageLayout from '../../components/DocPageLayout';

export const metadata = { title: 'Glossary' };

export default function GlossaryPage() {
  return (
    <DocPageLayout crumbs={[{ label: 'Docs', href: '/' }, { label: 'Glossary' }]}>
      <DocsArticle
        category="Reference"
        title="Glossary"
        description="Terms used across the Webfudge Platform documentation."
      >
        <DocsProse>
        <table>
          <thead>
            <tr>
              <th>Term</th>
              <th>Definition</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>Workspace app</strong>
              </td>
              <td>A Next.js product in <code>apps/</code> (CRM, PM, Accounts, etc.)</td>
            </tr>
            <tr>
              <td>
                <strong>Monorepo</strong>
              </td>
              <td>Single repository with multiple apps and shared packages</td>
            </tr>
            <tr>
              <td>
                <strong>RBAC</strong>
              </td>
              <td>Role-based access control enforced via Strapi and client guards</td>
            </tr>
          </tbody>
        </table>
        </DocsProse>
      </DocsArticle>
    </DocPageLayout>
  );
}
