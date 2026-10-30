/**
 * Base URLs for every workspace app, for cross-app links and post-login redirects.
 * Override per environment with NEXT_PUBLIC_<APP>_APP_URL; defaults match each app's `next dev -p` port.
 * Env vars are referenced literally so Next.js can inline them at build time.
 */
const APP_URLS = {
  landing: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  accounts: process.env.NEXT_PUBLIC_ACCOUNTS_APP_URL || 'http://localhost:3003',
  vendor: process.env.NEXT_PUBLIC_VENDOR_APP_URL || 'http://localhost:3004',
  pm: process.env.NEXT_PUBLIC_PM_APP_URL || 'http://localhost:3006',
  crm: process.env.NEXT_PUBLIC_CRM_APP_URL || 'http://localhost:3007',
}

/** @param {'landing'|'accounts'|'vendor'|'pm'|'crm'} slug */
export function getAppUrl(slug) {
  return (APP_URLS[slug] || APP_URLS.landing).replace(/\/$/, '')
}
