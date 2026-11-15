import './globals.css'
import { AuthProvider } from '@webfudge/auth'
import LayoutContent from '../components/LayoutContent'
import { VENDOR_SITE } from '../lib/site'

export const viewport = {
  themeColor: VENDOR_SITE.themeColor,
  width: 'device-width',
  initialScale: 1,
}

export const metadata = {
  metadataBase: new URL(VENDOR_SITE.url),
  title: {
    default: VENDOR_SITE.name,
    template: `%s | ${VENDOR_SITE.name}`,
  },
  description: VENDOR_SITE.description,
  applicationName: VENDOR_SITE.name,
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
  icons: {
    icon: [
      { url: '/favicon/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
    ],
    apple: [{ url: '/favicon/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
    shortcut: ['/favicon/favicon.svg'],
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
