import './globals.css'
import { AuthProvider } from '@webfudge/auth'
import LayoutContent from '../components/LayoutContent'
import { INVEST_SITE } from '../lib/site'

export const viewport = {
  themeColor: '#F5630F',
  width: 'device-width',
  initialScale: 1,
}

export const metadata = {
  metadataBase: new URL(INVEST_SITE.url),
  title: { default: INVEST_SITE.name, template: `%s | ${INVEST_SITE.name}` },
  description: INVEST_SITE.description,
  applicationName: INVEST_SITE.name,
  // Internal tool: never indexed.
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false, noimageindex: true } },
  icons: {
    icon: [
      { url: '/favicon/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
    ],
    apple: [{ url: '/favicon/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  manifest: '/favicon/site.webmanifest',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-white">
        <AuthProvider>
          <LayoutContent>{children}</LayoutContent>
        </AuthProvider>
      </body>
    </html>
  )
}
