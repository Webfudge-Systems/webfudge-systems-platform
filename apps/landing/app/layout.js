import './globals.css'
import { SITE_URL } from '../lib/links'
import { siteContact } from '../data/site'

const organizationName = 'Webfudge Systems'
const defaultDescription =
  'Webfudge CRM and Projects for growing businesses — try each app free for 14 days and pay per app, per user. We also build custom ERPs, client portals and browser extensions.'

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${organizationName} — CRM and project management for growing businesses`,
    template: `%s | ${organizationName}`,
  },
  description: defaultDescription,
  applicationName: organizationName,
  creator: organizationName,
  publisher: organizationName,
  category: 'technology',
  formatDetection: { email: false, address: false, telephone: false },
  keywords: ['CRM software India', 'project management software', 'sales pipeline', 'task management', 'ERP development', 'client portal', 'Webfudge Systems'],
  alternates: { canonical: '/' },
  openGraph: {
    title: organizationName,
    description: defaultDescription,
    url: '/',
    siteName: organizationName,
    type: 'website',
    locale: 'en_IN',
    images: [{ url: '/favicon/web-app-manifest-512x512.png', width: 512, height: 512, alt: organizationName }],
  },
  twitter: { card: 'summary_large_image', title: organizationName, description: defaultDescription, images: ['/favicon/web-app-manifest-512x512.png'] },
  robots: { index: true, follow: true },
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

export const viewport = { themeColor: '#F5630F' }

export default function RootLayout({ children }) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        name: organizationName,
        url: SITE_URL,
        logo: `${SITE_URL}/favicon/web-app-manifest-512x512.png`,
        description: defaultDescription,
        address: { '@type': 'PostalAddress', addressLocality: 'Pune', addressRegion: 'MH', addressCountry: 'IN' },
        email: siteContact.email,
        telephone: siteContact.phoneHref.replace('tel:', ''),
      },
      {
        '@type': 'SoftwareApplication',
        name: 'Webfudge CRM',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        offers: { '@type': 'Offer', price: '499', priceCurrency: 'INR' },
      },
      {
        '@type': 'SoftwareApplication',
        name: 'Webfudge Projects',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        offers: { '@type': 'Offer', price: '499', priceCurrency: 'INR' },
      },
    ],
  }

  return (
    <html lang="en-IN">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-white">
          Skip to content
        </a>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
        {children}
      </body>
    </html>
  )
}
