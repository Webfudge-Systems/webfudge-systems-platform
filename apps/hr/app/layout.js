import './globals.css'
import { AuthProvider } from '@webfudge/auth'
import LayoutContent from '../components/LayoutContent'

export const viewport = {
  themeColor: '#F97316',
  width: 'device-width',
  initialScale: 1,
}

const siteUrl = (process.env.NEXT_PUBLIC_HR_APP_URL || 'http://localhost:3008').replace(/\/$/, '')

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: 'Fudge People', template: '%s | Fudge People' },
  description: 'Fudge People — employees, payroll, attendance, leave, and workforce analytics.',
  applicationName: 'Fudge People',
  robots: { index: false, follow: false },
  icons: {
    icon: [{ url: '/favicon/favicon.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/favicon/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
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
