import './globals.css'
import { Inter } from 'next/font/google'
import { ConditionalNavbar } from '../components/layout'
import { AuthProvider } from '@webfudge/auth'

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata = {
  title: 'Webfudge Platform',
  description: 'Welcome to Webfudge Platform',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-brand-light">
        <AuthProvider>
          <ConditionalNavbar />
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
