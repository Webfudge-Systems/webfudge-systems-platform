const siteUrl = (process.env.NEXT_PUBLIC_INVEST_APP_URL || 'http://localhost:3008').replace(/\/$/, '')

export const INVEST_SITE = {
  brandName: 'Webfudge Systems',
  brandIconPath: '/logo/ws_logo_white.png',
  name: 'Fudge Invest',
  shortName: 'Invest',
  description: "Webfudge's internal investment manager for stocks, mutual funds and SIPs.",
  loginTagline: 'Investments — where we put our money, and where it stands today.',
  loginDetail: 'Internal to the Webfudge team. Sign in with your Webfudge account to see the company portfolio.',
  loginFeatures: [
    { label: 'Stocks', value: 'NSE · BSE' },
    { label: 'Mutual funds', value: 'AMFI NAV' },
    { label: 'Returns', value: 'XIRR' },
  ],
  url: siteUrl,
  logoPath: '/logo/webfudge-mark.png',
  themeColor: '#F5630F',
}

/** Deployment guard: this app is Internal-only and refuses to run as part of the SaaS. */
export const IS_SAAS_BUILD = String(process.env.NEXT_PUBLIC_PLATFORM_MODE || '').toLowerCase() === 'saas'
