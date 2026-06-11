const siteUrl = (process.env.NEXT_PUBLIC_VLM_APP_URL || 'http://localhost:3010').replace(/\/$/, '')

export const VLM_SITE = {
  brandName: 'Webfudge Systems',
  brandIconPath: '/logo/ws_logo_white.png',
  name: 'Webfudge VLM',
  shortName: 'VLM',
  description: 'Vehicle Lifecycle Management for fleets, dealers, and service teams.',
  loginTagline: 'Vehicle Lifecycle Management for fleets, dealers, and service teams.',
  loginDetail: 'Sign in to manage inventory, service history, and fleet operations.',
  loginFeatures: [
    { label: 'Fleet', value: 'Track' },
    { label: 'Service', value: 'Schedule' },
    { label: 'Inventory', value: 'Manage' },
  ],
  url: siteUrl,
  logoPath: '/logo/Vertical logo 1 bg removed.png',
  themeColor: '#F5630F',
}
