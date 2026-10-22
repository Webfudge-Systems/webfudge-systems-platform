import './globals.css';
import { AuthProvider } from '@webfudge/auth';
import DocsThemeProvider from '../components/DocsThemeProvider';
import DocsLayoutClient from '../components/DocsLayoutClient';
import { DOCS_SITE } from '../lib/site';

const siteUrl = DOCS_SITE.url;

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: DOCS_SITE.name,
    template: `%s | ${DOCS_SITE.name}`,
  },
  description: DOCS_SITE.description,
  applicationName: DOCS_SITE.name,
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [{ url: '/favicon/favicon.svg', type: 'image/svg+xml' }],
  },
};

export const viewport = {
  themeColor: DOCS_SITE.themeColor,
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Host+Grotesk:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,300;1,400;1,500;1,600;1,700;1,800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <DocsThemeProvider>
          <AuthProvider>
            <DocsLayoutClient>{children}</DocsLayoutClient>
          </AuthProvider>
        </DocsThemeProvider>
      </body>
    </html>
  );
}
