const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://webfudge.in';

export const metadata = {
  title: 'Sign Up',
  description: 'Create your Webfudge Platform account and start your trial.',
  alternates: {
    canonical: '/signup',
  },
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: 'Sign Up | Webfudge Platform',
    description: 'Create your Webfudge Platform account and start your trial.',
    url: `${siteUrl}/signup`,
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Sign Up | Webfudge Platform',
    description: 'Create your Webfudge Platform account and start your trial.',
  },
};

export default function SignupLayout({ children }) {
  return children;
}
