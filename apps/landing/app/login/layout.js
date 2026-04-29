const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://webfudgesystems.in';

export const metadata = {
  title: 'Login',
  description: 'Log in to your Webfudge Platform workspace.',
  alternates: {
    canonical: '/login',
  },
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: 'Login | Webfudge Platform',
    description: 'Access your Webfudge workspace securely.',
    url: `${siteUrl}/login`,
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Login | Webfudge Platform',
    description: 'Access your Webfudge workspace securely.',
  },
};

export default function LoginLayout({ children }) {
  return children;
}
