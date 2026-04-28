/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@webfudge/ui', '@webfudge/auth', '@webfudge/utils'],
  async redirects() {
    return [
      { source: '/communication', destination: '/workspace', permanent: false },
      { source: '/delivery', destination: '/clients/tasks', permanent: false },
      { source: '/delivery/tasks', destination: '/clients/tasks', permanent: false },
      { source: '/delivery/projects', destination: '/clients/projects', permanent: false },
      { source: '/delivery/projects/board', destination: '/clients/projects/board', permanent: false },
    ]
  },
}

module.exports = nextConfig
