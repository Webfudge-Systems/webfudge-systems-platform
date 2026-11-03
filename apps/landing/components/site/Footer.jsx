import Link from 'next/link'
import { company, footerColumns, siteContact } from '../../data/site'
import NewsletterForm from './NewsletterForm'

export default function Footer() {
  return (
    <footer className="border-t border-line pb-10 pt-16">
      <div className="container-site">
        <div className="flex flex-wrap justify-between gap-12">
          <div className="max-w-sm flex-[1_1_300px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/webfudge-horizontal-color.svg" alt="Webfudge Systems" className="h-11 w-auto" />
            <p className="mb-4 mt-5 text-lg font-medium leading-snug">Product news and guides, once a month.</p>
            <NewsletterForm />
          </div>
          {footerColumns.map((col) => (
            <nav key={col.title} aria-label={col.title} className="min-w-[140px]">
              <p className="mb-4 text-sm font-semibold">{col.title}</p>
              <ul className="space-y-3">
                {col.links.map(([label, href]) => (
                  <li key={href}>
                    <Link href={href} className="text-[15px] text-muted hover:text-ink">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
          <div className="min-w-[200px]">
            <p className="mb-4 text-sm font-semibold">Talk to us</p>
            <ul className="space-y-3 text-[15px] text-muted">
              <li><a href={`mailto:${siteContact.email}`} className="hover:text-ink">{siteContact.email}</a></li>
              <li><a href={siteContact.phoneHref} className="hover:text-ink">{siteContact.phone}</a></li>
              <li>{siteContact.location.display}</li>
            </ul>
          </div>
        </div>
        <div className="mt-14 flex flex-wrap justify-between gap-4 border-t border-line pt-6 text-sm text-muted">
          <p>© {new Date().getFullYear()} {company.name}. All rights reserved.</p>
          <p>
            {company.registeredAddress}
            {company.gstin ? ` · GSTIN ${company.gstin}` : ''}
          </p>
        </div>
      </div>
    </footer>
  )
}
