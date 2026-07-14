const siteUrl = (process.env.NEXT_PUBLIC_HR_APP_URL || 'http://localhost:3008').replace(/\/$/, '')

export const HR_SITE = {
  brandName: 'Webfudge Systems',
  brandIconPath: '/logo/ws_logo_white.png',
  name: 'Fudge People',
  shortName: 'People',
  description:
    'Fudge People is the HR workspace for employees, payroll, attendance, leave, and workforce analytics.',
  loginTagline: 'HRMS for your entire workforce — payroll, leave, attendance, and more.',
  loginDetail:
    'Sign in to manage your team, track attendance, process payroll, and keep your workforce organized.',
  loginFeatures: [
    { label: 'Employees', value: 'Manage' },
    { label: 'Payroll', value: 'Process' },
    { label: 'Leave', value: 'Track' },
  ],
  url: siteUrl,
  logoPath: '/logo/Vertical logo 1 bg removed.png',
  themeColor: '#F5630F',
  backgroundColor: '#FFFAF7',
}
