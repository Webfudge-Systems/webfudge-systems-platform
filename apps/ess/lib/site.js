const siteUrl = (process.env.NEXT_PUBLIC_ESS_APP_URL || 'http://localhost:3009').replace(/\/$/, '')



export const ESS_SITE = {

  brandName: 'Webfudge Systems',

  brandIconPath: '/logo/ws_logo_white.png',

  name: 'ESS',

  shortName: 'ESS',

  description:

    'Employee self-service portal — view attendance, apply leave, access payslips, and track your work.',

  loginTagline: 'Your personal HR workspace — attendance, leave, payroll, and more.',

  loginDetail:

    'Sign in to mark attendance, apply for leave, download payslips, and manage your work life.',

  loginFeatures: [

    { label: 'Attendance', value: 'Track' },

    { label: 'Leave', value: 'Apply' },

    { label: 'Payroll', value: 'View' },

  ],

  url: siteUrl,

  logoPath: '/logo/Vertical logo 1 bg removed.png',

  themeColor: '#F5630F',

}

