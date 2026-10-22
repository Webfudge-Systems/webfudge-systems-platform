import { DocsArticle, DocsProse } from '@webfudge/ui/doc-components';
import DocPageLayout from '../../components/DocPageLayout';

export const metadata = { title: 'Permissions & Access' };

export default function PermissionsPage() {
  return (
    <DocPageLayout crumbs={[{ label: 'Docs', href: '/' }, { label: 'Permissions & Access' }]}>
      <DocsArticle
        category="User Roles"
        title="Permissions & Access"
        description="How RBAC scopes read and write access per module in CRM and PM."
      >
        <DocsProse>
          <p>Permission matrices and module gates will be documented here once README ingestion is implemented.</p>
        </DocsProse>
      </DocsArticle>
    </DocPageLayout>
  );
}
