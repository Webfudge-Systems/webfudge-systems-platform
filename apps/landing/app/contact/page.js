import SimplePage from '../../components/site/SimplePage'
import ContactForm from '../../components/site/ContactForm'
import { siteContact } from '../../data/site'

export const metadata = {
  title: 'Contact',
  description: 'Book a demo of Webfudge CRM and Projects, ask about pricing, or tell us about custom software you need. We reply within one working day.',
  alternates: { canonical: '/contact' },
}

export default function ContactPage() {
  return (
    <SimplePage eyebrow="Contact" title="Let’s talk about" accent="your team." intro="Book a demo, ask about pricing or tell us what you’d like built. We reply within one working day.">
      <section className="px-5 pb-28 sm:px-6">
        <div className="mx-auto grid max-w-site gap-6 lg:grid-cols-[1fr_400px]">
          <div className="rounded-[28px] border border-line p-6 sm:p-9">
            <ContactForm />
          </div>
          <aside className="space-y-4">
            <div className="rounded-[28px] bg-ink p-8 text-white">
              <h2 className="text-xl font-semibold">Talk to us directly</h2>
              <ul className="mt-5 space-y-4 text-[15px]">
                <li>
                  <span className="block text-[13px] text-[#A3A3A3]">Email</span>
                  <a href={`mailto:${siteContact.email}`} className="font-medium hover:underline">{siteContact.email}</a>
                </li>
                <li>
                  <span className="block text-[13px] text-[#A3A3A3]">Phone</span>
                  <a href={siteContact.phoneHref} className="font-medium hover:underline">{siteContact.phone}</a>
                </li>
                <li>
                  <span className="block text-[13px] text-[#A3A3A3]">Office</span>
                  <span className="font-medium">{siteContact.location.display}</span>
                </li>
              </ul>
            </div>
            <div className="rounded-[28px] bg-surface p-8">
              <h2 className="text-xl font-semibold">Already a customer?</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-muted">Write to us from your work email and mention your organization name — we’ll pick it up straight away.</p>
            </div>
          </aside>
        </div>
      </section>
    </SimplePage>
  )
}
