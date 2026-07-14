import './globals.css'
import { AuthProvider } from '@webfudge/auth'
import LayoutContent from '../components/LayoutContent'
import { HR_SITE } from '../lib/site'

export const viewport = {
  themeColor: HR_SITE.themeColor,
  width: 'device-width',
  initialScale: 1,
}

const siteUrl = (process.env.NEXT_PUBLIC_HR_APP_URL || 'http://localhost:3008').replace(/\/$/, '')
const shareDescription =
  'A modern HR workspace for employees, payroll, attendance, leave, and workforce analytics.'

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: HR_SITE.name,
    template: `%s | ${HR_SITE.name}`,
  },
  description: HR_SITE.description,
  applicationName: HR_SITE.name,
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: HR_SITE.name,
  },
  formatDetection: {
    telephone: false,
  },
  keywords: [
    'HRMS',
    'HR management',
    'payroll',
    'attendance',
    'leave management',
    'workforce',
    'Webfudge',
    'Fudge People',
  ],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: HR_SITE.name,
    description: shareDescription,
    url: siteUrl,
    siteName: HR_SITE.name,
    type: 'website',
    locale: 'en_IN',
    images: [
      {
        url: '/favicon/web-app-manifest-512x512.png',
        width: 512,
        height: 512,
        alt: HR_SITE.name,
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: HR_SITE.name,
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
