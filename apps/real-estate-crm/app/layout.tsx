import './globals.css'
import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { AuthProvider } from '@webfudge/auth'
import LayoutContent from '../components/LayoutContent'
import { RE_SITE } from '../lib/site'

export const viewport: Viewport = {
  themeColor: '#F5630F',
  width: 'device-width',
  initialScale: 1,
}

const siteUrl = (process.env.NEXT_PUBLIC_RE_CRM_APP_URL || 'http://localhost:3009').replace(/\/$/, '')

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: RE_SITE.name,
    template: `%s | ${RE_SITE.name}`,
  },
  description: RE_SITE.description,
  applicationName: RE_SITE.name,
  keywords: ['real estate CRM', 'lead scoring', 'Meta ads leads', 'site visits', 'project pipeline'],
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
}

export default function RootLayout({ children }: { children: ReactNode }) {
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
