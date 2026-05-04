import './globals.css';
import { AuthProvider } from '@webfudge/auth';
import LayoutContent from '../components/LayoutContent';

const siteUrl = (process.env.NEXT_PUBLIC_PM_APP_URL || 'http://localhost:3002').replace(/\/$/, '');
const shareDescription =
  'A modern workspace for projects, tasks, team collaboration, and delivery.';

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Webfudge PM',
    template: '%s | Webfudge PM',
  },
  description:
    'Webfudge Project Management for tracking projects, tasks, teams, messages, and delivery.',
  applicationName: 'Webfudge PM',
  keywords: [
    'project management',
    'tasks',
    'team collaboration',
    'delivery',
    'productivity',
    'Webfudge',
  ],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Webfudge PM',
    description: shareDescription,
    type: 'website',
    images: [
      {
        url: '/favicon/web-app-manifest-512x512.png',
        width: 512,
        height: 512,
        alt: 'Webfudge PM',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: 'Webfudge PM',
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
