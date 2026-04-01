import './globals.css'
import { AuthProvider } from '@webfudge/auth'
import LayoutContent from '@/components/layout/LayoutContent'

export const metadata = {
  title: 'Books - Webfudge Platform',
  description: 'Zoho Books inspired accounting for agencies.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
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
