const siteUrl = (process.env.NEXT_PUBLIC_DOCS_APP_URL || 'http://localhost:3009').replace(/\/$/, '');

export const DOCS_SITE = {
  brandName: 'Webfudge Systems',
  name: 'Platform Docs',
  shortName: 'Docs',
  description:
    'Documentation for the Webfudge Platform — CRM, project management, accounts, and shared workspace apps.',
  version: 'v1.0 · June 2026',
  url: siteUrl,
  logoPath: '/favicon/favicon.svg',
  themeColor: '#F5630F',
};
