import './globals.css'
import { ConditionalNavbar } from '../components/layout'
import { AuthProvider } from '@webfudge/auth'

export const metadata = {
  title: 'Webfudge Platform',
  description: 'Welcome to Webfudge Platform',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-brand-light">
        <AuthProvider>
          <ConditionalNavbar />
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
