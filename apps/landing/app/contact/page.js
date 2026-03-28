import { ContactSection } from '../../components/sections/home'
import Footer from '../../components/Footer'

export const metadata = {
  title: 'Contact — Webfudge Platform',
  description: 'Contact Webfudge Systems Platform',
}

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
