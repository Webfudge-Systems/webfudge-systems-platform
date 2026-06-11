const siteUrl = (process.env.NEXT_PUBLIC_PM_APP_URL || 'http://localhost:3006').replace(/\/$/, '')

export const PM_SITE = {
  brandName: 'Webfudge Systems',
  brandIconPath: '/logo/ws_logo_white.png',
  name: 'Fudge Work',
  shortName: 'Work',
  description:
    'Fudge Work is the project management workspace for projects, tasks, teams, messages, and delivery.',
  loginTagline: 'Project Management — track projects, tasks, and your team in one place.',
  loginDetail: 'Sign in to access your dashboard, manage project delivery, and stay on top of every task.',
  loginFeatures: [
    { label: 'Projects', value: 'Track' },
    { label: 'Tasks', value: 'Manage' },
    { label: 'Team', value: 'Collaborate' },
  ],
  url: siteUrl,
  logoPath: '/logo/pm-vertical-logo.png',
  themeColor: '#F5630F',
}
