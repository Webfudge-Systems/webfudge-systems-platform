'use client'

import Link from 'next/link'

const SERVICES = [
  'Graphic & Creative Design',
  'Performance Marketing',
  'Pitch Deck & Corporate Decks',
  'Brand Identity Design',
  'Website & Landing Page Development',
  'E-commerce Development',
]

const QUICK_LINKS = ['Case Studies', 'Services', 'Blog', 'About', 'Contact Us']
const FOLLOW_LINKS = ['LinkedIn', 'Instagram', 'Pinterest', 'Dribbble', 'Behance']

export default function FooterSection() {
  return (
    <footer className="bg-[#f5f5f5] px-6 pb-8 pt-14 md:px-10 md:pt-16 lg:px-16">
      <div className="mx-auto w-full max-w-[1320px]">
        <div className="grid gap-12 border-b border-[#e4e4e4] pb-12 md:grid-cols-[1.15fr_1fr_0.9fr_0.9fr]">
          <div>
            <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-black text-xl text-white">
              ✶
            </div>
            <h3 className="font-heading text-[30px] font-semibold text-[#111]">Webfudge</h3>
            <p className="font-sans mt-3 max-w-[310px] text-[15px] leading-7 text-[#4e4e4e]">
              We design and build scalable digital products that support complex workflows and
              business-critical systems.
            </p>
            <button className="font-sans mt-6 inline-flex items-center gap-2 rounded-full bg-[#121212] px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.2)]">
              Company Deck
              <span className="grid h-5 w-5 place-items-center rounded-full bg-white text-black">↗</span>
            </button>
          </div>

          <div>
            <h4 className="font-heading text-[30px] font-semibold italic text-[#111]">Service</h4>
            <ul className="font-sans mt-4 space-y-3 text-[15px] text-[#2f2f2f]">
              {SERVICES.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-heading text-[30px] font-semibold italic text-[#111]">Quick Links</h4>
            <ul className="font-sans mt-4 space-y-3 text-[15px] text-[#2f2f2f]">
              {QUICK_LINKS.map((item) => (
                <li key={item}>
                  <Link href="/" className="hover:text-[#e84b18]">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-heading text-[30px] font-semibold italic text-[#111]">Follow Us</h4>
            <ul className="font-sans mt-4 space-y-3 text-[15px] text-[#2f2f2f]">
              {FOLLOW_LINKS.map((item) => (
                <li key={item}>
                  <Link href="/" className="hover:text-[#e84b18]">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="font-sans flex flex-wrap items-center justify-between gap-4 pt-5 text-sm text-[#7a7a7a]">
          <p>© 2026 Webfudge. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-[#111]">
              Privacy Policy
            </Link>
            <span>·</span>
            <Link href="/" className="hover:text-[#111]">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
