import './globals.css'
import { AuthProvider } from '@webfudge/auth'
import LayoutContent from '../components/LayoutContent'
import { ESS_SITE } from '../lib/site'

export const viewport = {
  themeColor: ESS_SITE.themeColor,
  width: 'device-width',
  initialScale: 1,
}

const siteUrl = (process.env.NEXT_PUBLIC_ESS_APP_URL || 'http://localhost:3009').replace(/\/$/, '')
const shareDescription =
  'Employee self-service portal — attendance, leave, payroll, and your work history in one place.'

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: ESS_SITE.name,
    template: `%s | ${ESS_SITE.name}`,
  },
  description: ESS_SITE.description,
  applicationName: ESS_SITE.name,
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: ESS_SITE.name,
  },
  formatDetection: {
    telephone: false,
  },
  keywords: [
    'employee portal',
    'self-service',
    'employee desk',
    'attendance',
    'leave',
    'payroll',
    'Webfudge',
    'Fudge Desk',
  ],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: ESS_SITE.name,
    description: shareDescription,
    url: siteUrl,
    siteName: ESS_SITE.name,
    type: 'website',
    locale: 'en_IN',
    images: [
      {
        url: '/favicon/web-app-manifest-512x512.png',
        width: 512,
        height: 512,
        alt: ESS_SITE.name,
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: ESS_SITE.name,
    description: shareDescription,
    images: ['/favicon/web-app-manifest-512x512.png'],
  },
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
  icons: {
    icon: [
      { url: '/favicon/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
      { url: '/favicon.ico', sizes: 'any' },
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
