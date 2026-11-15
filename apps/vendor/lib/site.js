const siteUrl = (process.env.NEXT_PUBLIC_VENDOR_APP_URL || 'http://localhost:3004').replace(/\/$/, '')

export const VENDOR_SITE = {
  brandName: 'Webfudge Systems',
  brandIconPath: '/logo/ws_logo_white.png',
  name: 'Fudge Vendor',
  shortName: 'Vendor',
  description:
    'Fudge Vendor is the Webfudge staff portal for every organization, subscription, payment and user on the platform.',
  loginTagline: 'Vendor Portal — every customer, subscription and rupee in one place.',
  loginDetail: 'Sign in with your Webfudge staff account to see organizations, trials, billing and reports.',
  loginFeatures: [
    { label: 'Organizations', value: 'Track' },
    { label: 'Revenue', value: 'Measure' },
    { label: 'Trials', value: 'Convert' },
  ],
  url: siteUrl,
  logoPath: '/logo/vendor-vertical-logo.png',
  themeColor: '#F5630F',
}
