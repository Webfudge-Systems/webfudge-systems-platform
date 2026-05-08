import './globals.css';
import { AuthProvider } from '@webfudge/auth';
import LayoutContent from '../components/LayoutContent';

const siteUrl = (process.env.NEXT_PUBLIC_VLM_APP_URL || 'http://localhost:3003').replace(/\/$/, '');
const shareDescription =
  'Vehicle Lifecycle Management for fleets, dealers, and service history.';

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Webfudge VLM',
    template: '%s | Webfudge VLM',
  },
  description:
    'Webfudge Vehicle Lifecycle Management for vehicles, allocations, movement, service, and warranty tracking.',
  applicationName: 'Webfudge VLM',
  keywords: [
    'vehicle lifecycle management',
    'fleet',
    'allocations',
    'service history',
    'warranty',
    'Webfudge',
  ],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Webfudge VLM',
    description: shareDescription,
    type: 'website',
    images: [
      {
        url: '/favicon/web-app-manifest-512x512.png',
        width: 512,
        height: 512,
        alt: 'Webfudge VLM',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: 'Webfudge VLM',
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

