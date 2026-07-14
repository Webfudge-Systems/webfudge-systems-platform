const siteUrl = (process.env.NEXT_PUBLIC_RE_CRM_APP_URL || 'http://localhost:3010').replace(/\/$/, '')

export const RE_SITE = {
  brandName: 'Webfudge Systems',
  brandIconPath: '/logo/ws_logo_white.png',
  name: 'Fudge Estate',
  shortName: 'Estate',
  description:
    'Fudge Estate is the real-estate sales workspace for Meta-ads leads, qualification scoring, site visits, and project pipelines.',
  loginTagline: 'Real Estate CRM — scored leads, site visits, and project pipelines in one place.',
  loginDetail: 'Sign in to work your hottest leads first, book site visits, and close bookings faster.',
  loginFeatures: [
    { label: 'Leads', value: 'Score' },
    { label: 'Visits', value: 'Book' },
    { label: 'Deals', value: 'Close' },
  ],
  url: siteUrl,
  logoPath: '/logo/Vertical logo 1 bg removed.png',
  themeColor: '#F5630F',
}
