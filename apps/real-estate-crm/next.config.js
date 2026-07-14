/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@webfudge/ui',
    '@webfudge/auth',
    '@webfudge/utils',
    '@webfudge/lead-scoring',
    '@webfudge/meta-ads',
  ],
}

module.exports = nextConfig
