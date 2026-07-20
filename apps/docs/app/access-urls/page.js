import { DocsArticle, DocsProse } from '@webfudge/ui/doc-components';
import DocPageLayout from '../../components/DocPageLayout';

export const metadata = {
  title: 'Access URLs',
};

export default function AccessUrlsPage() {
  return (
    <DocPageLayout crumbs={[{ label: 'Docs', href: '/' }, { label: 'Access URLs' }]}>
      <DocsArticle
        category="Configuration"
        title="Access URLs"
        description="Default local development URLs for all platform applications and the API backend."
      >
        <DocsProse>
        <h2>Local Development</h2>
        <table>
          <thead>
            <tr>
              <th>App</th>
              <th>URL</th>
              <th>Start Command</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Landing</td>
              <td>
                <code>localhost:3000</code>
              </td>
              <td>
                <code>npm run dev --filter=@webfudge/landing</code>
              </td>
            </tr>
            <tr>
              <td>CRM</td>
              <td>
                <code>localhost:3007</code>
              </td>
              <td>
                <code>npm run dev:crm</code>
              </td>
            </tr>
            <tr>
              <td>PM</td>
              <td>
                <code>localhost:3006</code>
              </td>
              <td>
                <code>npm run dev:pm</code>
              </td>
            </tr>
            <tr>
              <td>Accounts</td>
              <td>
                <code>localhost:3003</code>
              </td>
              <td>
                <code>npm run dev --filter=@webfudge/accounts</code>
              </td>
            </tr>
            <tr>
              <td>Docs</td>
              <td>
                <code>localhost:3009</code>
              </td>
              <td>
                <code>npm run dev:docs</code>
              </td>
            </tr>
            <tr>
              <td>API</td>
              <td>
                <code>localhost:1337</code>
              </td>
              <td>
                <code>npm run dev:backend</code>
              </td>
            </tr>
          </tbody>
        </table>

        <p>
          Run the full workspace (excluding backend by default) with <code>npm run dev</code>.
        </p>
        </DocsProse>
      </DocsArticle>
    </DocPageLayout>
  );
}
