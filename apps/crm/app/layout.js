import './globals.css';
import { AuthProvider } from '@webfudge/auth';
import LayoutContent from '../components/LayoutContent';

export const metadata = {
  title: {
    default: 'Webfudge CRM',
    template: '%s | Webfudge CRM',
  },
  description: 'Webfudge CRM for lead management, deals, accounts, projects, invoices, and team collaboration.',
  applicationName: 'Webfudge CRM',
  keywords: ['CRM', 'sales CRM', 'lead management', 'deal pipeline', 'client accounts'],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Webfudge CRM',
    description:
      'A modern CRM workspace for leads, deals, client accounts, projects, and communication workflows.',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Webfudge CRM',
    description:
      'A modern CRM workspace for leads, deals, client accounts, projects, and communication workflows.',
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
    ],
    apple: [{ url: '/favicon/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
    shortcut: ['/favicon/favicon.svg'],
  },
  manifest: '/favicon/site.webmanifest',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-white">
        <AuthProvider>
          <LayoutContent>{children}</LayoutContent>
        </AuthProvider>
      </body>
    </html>
  );
}
