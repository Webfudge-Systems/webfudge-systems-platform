import './globals.css'
import { AuthProvider } from '@webfudge/auth'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://webfudgesystems.in'
const organizationName = 'Webfudge Systems'
const defaultDescription =
  'Webfudge Systems engineers scalable software, CRM systems, SaaS platforms and digital experiences that help businesses grow faster.'

export const metadata = {
  title: {
    default: organizationName,
    template: `%s | ${organizationName}`,
  },
  metadataBase: new URL(siteUrl),
  description: defaultDescription,
  applicationName: organizationName,
  creator: organizationName,
  publisher: organizationName,
  category: 'technology',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  keywords: [
    'CRM software',
    'custom software development',
    'SaaS development',
    'enterprise software',
    'UI/UX design',
    'AI automation',
    'Webfudge Systems',
    'business solutions',
    'web development India',
  ],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: organizationName,
    description: defaultDescription,
    url: '/',
    siteName: organizationName,
    type: 'website',
    locale: 'en_US',
    images: [
      {
        url: '/favicon/web-app-manifest-512x512.png',
        width: 512,
        height: 512,
        alt: organizationName,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: organizationName,
    description: defaultDescription,
    images: ['/favicon/web-app-manifest-512x512.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
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
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        name: organizationName,
        url: siteUrl,
        logo: `${siteUrl}/favicon/web-app-manifest-512x512.png`,
        description: defaultDescription,
        sameAs: [],
      },
      {
        '@type': 'WebSite',
        name: organizationName,
        url: siteUrl,
        description: defaultDescription,
        publisher: {
          '@type': 'Organization',
          name: organizationName,
        },
      },
    ],
  }

  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="bg-white text-[#111111] antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
