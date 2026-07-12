/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@webfudge/ui', '@webfudge/auth', '@webfudge/utils'],
  async redirects() {
    return [{ source: '/', destination: '/overview', permanent: false }]
  },
}

module.exports = nextConfig
