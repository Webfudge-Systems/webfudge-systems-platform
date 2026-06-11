const siteUrl = (process.env.NEXT_PUBLIC_ACCOUNTS_APP_URL || 'http://localhost:3003').replace(/\/$/, '')

export const ACCOUNTS_SITE = {
  brandName: 'Webfudge Systems',
  brandIconPath: '/logo/ws_logo_white.png',
  name: 'Fudge Base',
  shortName: 'Base',
  description:
    'Fudge Base is the organization administration workspace for users, roles, departments, teams, security, and audit logs.',
  loginTagline:
    'Account Management — users, roles, departments, and access in one workspace.',
  loginDetail: 'Sign in to manage your organization, control access, and keep your team secure.',
  loginFeatures: [
    { label: 'Users', value: 'Manage' },
    { label: 'Roles', value: 'Control' },
    { label: 'Departments', value: 'Organize' },
  ],
  url: siteUrl,
  logoPath: '/logo/Vertical logo 1 bg removed.png',
  themeColor: '#F5630F',
}
