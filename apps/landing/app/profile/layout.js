const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://webfudgesystems.in';

export const metadata = {
  title: 'Profile',
  description: 'Manage your Webfudge account profile, organizations, and apps.',
  alternates: {
    canonical: '/profile',
  },
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: 'Profile | Webfudge Platform',
    description: 'Manage your Webfudge account profile, organizations, and apps.',
    url: `${siteUrl}/profile`,
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Profile | Webfudge Platform',
    description: 'Manage your Webfudge account profile, organizations, and apps.',
  },
};

export default function ProfileLayout({ children }) {
  return children;
}
