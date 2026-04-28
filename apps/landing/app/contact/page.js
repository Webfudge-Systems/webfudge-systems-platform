import { ContactSection } from '../../components/sections/home'
import Footer from '../../components/Footer'

export const metadata = {
  title: 'Contact',
  description: 'Contact Webfudge Systems for product demos, partnerships, and support.',
  alternates: {
    canonical: '/contact',
  },
  openGraph: {
    title: 'Contact Webfudge Systems',
    description: 'Reach Webfudge for product demos, partnerships, and support.',
    url: '/contact',
    type: 'website',
    images: ['/favicon/web-app-manifest-512x512.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Contact Webfudge Systems',
    description: 'Reach Webfudge for product demos, partnerships, and support.',
    images: ['/favicon/web-app-manifest-512x512.png'],
  },
};

export default function ContactPage() {
  return (
    <main className="min-h-screen">
      <div className="relative bg-white">
        <div className="relative z-10">
          <ContactSection />
        </div>
        <div className="sticky bottom-0 z-0">
          <Footer />
        </div>
      </div>
    </main>
  )
}
