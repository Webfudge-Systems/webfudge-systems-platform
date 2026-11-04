const accountsUrl = (process.env.NEXT_PUBLIC_ACCOUNTS_APP_URL || 'http://localhost:3003').replace(/\/$/, '')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@webfudge/ui', '@webfudge/auth', '@webfudge/utils'],
  async redirects() {
    return [
      // Sign-in and sign-up live in Webfudge Accounts.
      { source: '/login', destination: `${accountsUrl}/login`, permanent: false },
      { source: '/signup', destination: `${accountsUrl}/signup`, permanent: false },
      { source: '/profile', destination: `${accountsUrl}/home`, permanent: false },
      // Old URLs from the previous website.
      { source: '/pm', destination: '/projects', permanent: true },
      { source: '/products/:slug*', destination: '/services', permanent: true },
      { source: '/privacy', destination: '/legal/privacy', permanent: true },
      { source: '/terms', destination: '/legal/terms', permanent: true },
      { source: '/refunds', destination: '/legal/refunds', permanent: true },
    ]
  },
}

module.exports = nextConfig
