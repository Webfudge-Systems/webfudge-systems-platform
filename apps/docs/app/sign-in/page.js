import { DocsArticle, DocsCallout, DocsProse, DocsStepList } from '@webfudge/ui/doc-components';
import DocPageLayout from '../../components/DocPageLayout';

export const metadata = {
  title: 'Sign In',
};

export default function SignInPage() {
  return (
    <DocPageLayout crumbs={[{ label: 'Docs', href: '/' }, { label: 'Sign In' }]}>
      <DocsArticle
        category="Getting Started"
        title="Sign In"
        description="How workspace users authenticate across CRM, PM, and Accounts apps."
      >
        <DocsProse>
        <h2>Standard User Login</h2>
        <p>For CRM, PM, and Accounts users.</p>
      </DocsProse>

      <DocsStepList
        steps={[
          {
            title: 'Open the workspace app',
            description: 'Navigate to CRM, PM, or Accounts — you are redirected to /login if not signed in.',
          },
          {
            title: 'Enter your email and password',
            description: 'Use the credentials provisioned by your organization admin.',
          },
          {
            title: 'Click Sign in',
            description: 'On success, your session is stored as a JWT for 7 days.',
          },
          {
            title: 'Organization context',
            description: 'If you belong to multiple organizations, the active org is selected automatically.',
          },
        ]}
      />

      <DocsCallout variant="warning" title="Self-registration is disabled">
        Users must be invited by an organization admin or created during organization provisioning.
      </DocsCallout>

      <DocsProse>
        <h2>Session Behavior</h2>
        <table>
          <thead>
            <tr>
              <th>Behavior</th>
              <th>Detail</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Session duration</td>
              <td>7 days (JWT expiry)</td>
            </tr>
            <tr>
              <td>Sign out</td>
              <td>Clears token, org context, and department selection</td>
            </tr>
            <tr>
              <td>Expired session</td>
              <td>Redirected to login page</td>
            </tr>
          </tbody>
        </table>
        </DocsProse>
      </DocsArticle>
    </DocPageLayout>
  );
}
