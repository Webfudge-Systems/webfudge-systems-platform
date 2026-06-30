import { DocsArticle, DocsProse } from '@webfudge/ui/doc-components';
import DocPageLayout from '../../components/DocPageLayout';

export const metadata = { title: 'User Types & Roles' };

export default function UserTypesPage() {
  return (
    <DocPageLayout crumbs={[{ label: 'Docs', href: '/' }, { label: 'User Types & Roles' }]}>
      <DocsArticle
        category="User Roles"
        title="User Types & Roles"
        description="Platform and organization-level roles that control access across workspace apps."
      >
        <DocsProse>
          <p>Content will be generated from app README files in a later phase. This page reserves the navigation slot.</p>
        </DocsProse>
      </DocsArticle>
    </DocPageLayout>
  );
}
