const siteUrl = (process.env.NEXT_PUBLIC_CRM_APP_URL || 'http://localhost:3007').replace(/\/$/, '')

export const CRM_SITE = {
  brandName: 'Webfudge Systems',
  brandIconPath: '/logo/ws_logo_white.png',
  name: 'Fudge Grow',
  shortName: 'Grow',
  description:
    'Fudge Grow is the sales workspace for leads, deals, contacts, client accounts, and pipeline management.',
  loginTagline: 'Sales CRM — manage leads, deals, contacts, and your pipeline in one place.',
  loginDetail: 'Sign in to access your pipeline, close deals faster, and grow your client base.',
  loginFeatures: [
    { label: 'Leads', value: 'Capture' },
    { label: 'Deals', value: 'Close' },
    { label: 'Clients', value: 'Retain' },
  ],
  url: siteUrl,
  logoPath: '/logo/Vertical logo 1 bg removed.png',
  themeColor: '#F5630F',
}
