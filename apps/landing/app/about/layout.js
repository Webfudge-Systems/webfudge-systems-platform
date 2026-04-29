const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://webfudgesystems.in';

export const metadata = {
  title: 'About',
  description:
    'Learn about Webfudge Systems, our vision, and our mission to build a unified operating system for modern businesses.',
  alternates: {
    canonical: '/about',
  },
  openGraph: {
    title: 'About Webfudge Systems',
    description:
      'Discover Webfudge Systems, our mission, and the platform approach behind modern business operations.',
    url: `${siteUrl}/about`,
    type: 'website',
    images: ['/favicon/web-app-manifest-512x512.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'About Webfudge Systems',
    description:
      'Discover Webfudge Systems, our mission, and the platform approach behind modern business operations.',
    images: ['/favicon/web-app-manifest-512x512.png'],
  },
};

export default function AboutLayout({ children }) {
  return children;
}
