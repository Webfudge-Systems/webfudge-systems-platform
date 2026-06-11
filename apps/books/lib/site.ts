const siteUrl = (process.env.NEXT_PUBLIC_BOOKS_APP_URL || 'http://localhost:3008').replace(/\/$/, '')

export const BOOKS_SITE = {
  brandName: 'Webfudge Systems',
  brandIconPath: '/logo/ws_logo_white.png',
  name: 'Fudge Books',
  shortName: 'Books',
  description: 'Fudge Books is finance and accounting for service agencies and modern teams.',
  loginTagline: 'Finance and accounting for service agencies and modern teams.',
  loginDetail:
    'Sign in to manage receivables, payables, projects, time tracking, and documents.',
  loginFeatures: [
    { label: 'Invoices', value: 'Bill' },
    { label: 'Expenses', value: 'Track' },
    { label: 'Reports', value: 'Analyze' },
  ],
  url: siteUrl,
  logoPath: '/logo/Vertical logo 1 bg removed.png',
  themeColor: '#F5630F',
} as const
