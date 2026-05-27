'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Instagram, Twitter, Linkedin, Youtube, Plus } from 'lucide-react'

const socialLinks = [
  { icon: Instagram, label: 'Instagram', href: '#' },
  { icon: Twitter, label: 'Twitter/X', href: '#' },
  { icon: Linkedin, label: 'LinkedIn', href: '#' },
  { icon: Youtube, label: 'YouTube', href: '#' },
]

const helpfulLinks = [
  { label: 'Privacy Policy', href: '#' },
  { label: 'About', href: '#about' },
  { label: 'Services', href: '#services' },
  { label: 'Work', href: '#solutions' },
  { label: 'Blog', href: '#' },
]

export default function Footer() {
  return (
    <footer className="bg-[#080808] text-white relative overflow-hidden" id="footer">
      {/* Top separator */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(245,99,15,0.35), transparent)',
        }}
      />

      {/* Subtle grid */}
      <div className="absolute inset-0 grid-pattern opacity-20 pointer-events-none" />

      {/* ── MAIN CONTENT ── */}
      <div className="relative z-10 mx-auto px-4 sm:px-6 lg:px-8 max-w-[1400px] pt-20 pb-10">
        {/* Top row: CTA left + info grid right */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-14 lg:gap-12">
          {/* LEFT — CTA */}
          <div className="shrink-0">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="font-bold leading-[1.06] tracking-tight text-white mb-8 whitespace-nowrap"
              style={{ fontSize: 'clamp(32px, 3.5vw, 52px)' }}
            >
              Have a Cool Idea?
              <br />
              Let&apos;s Collaborate<span style={{ color: '#F5630F' }}>.</span>
            </motion.h2>

            <motion.a
              href="#contact"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.15 }}
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center gap-2.5 px-6 py-3 rounded-full border border-white/20 hover:border-[#F5630F]/60 text-white text-sm font-semibold transition-all duration-300 hover:bg-[#F5630F]/8 group"
            >
              Get In Touch
              <span className="w-5 h-5 rounded-full border border-white/25 group-hover:border-[#F5630F]/70 flex items-center justify-center transition-colors">
                <Plus size={11} />
              </span>
            </motion.a>
          </div>

          {/* RIGHT — Info grid */}
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-10 lg:gap-8">
            {/* Location */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/35 mb-5">
                Location
              </p>
              <p className="text-base text-white/65 leading-relaxed">
                Bengaluru,
                <br />
                Karnataka, India
              </p>
            </div>

            {/* Social */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/35 mb-5">
                Social
              </p>
              <ul className="flex flex-col gap-3">
                {socialLinks.map((s) => (
                  <li key={s.label}>
                    <a
                      href={s.href}
                      className="inline-flex items-center gap-2.5 text-base text-white/55 hover:text-white transition-colors duration-200"
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ background: '#F5630F' }}
                      />
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/35 mb-5">
                Contact
              </p>
              <div className="flex flex-col gap-3">
                <a
                  href="tel:+919999999999"
                  className="text-base text-white/65 hover:text-white transition-colors duration-200"
                >
                  +91 99999 99999
                </a>
                <a
                  href="mailto:hello@webfudgesystems.in"
                  className="text-base text-white/65 hover:text-white transition-colors duration-200"
                >
                  hello@webfudgesystems.in
                </a>
              </div>
            </div>

            {/* Helpful Links */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/35 mb-5">
                Helpful Links
              </p>
              <ul className="flex flex-col gap-3">
                {helpfulLinks.map((l) => (
                  <li key={l.label}>
                    <a
                      href={l.href}
                      className="text-base text-white/55 hover:text-white transition-colors duration-200"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="mt-16 mb-6 h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />

        {/* Bottom bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-white/30">
          <span>©Webfudge {new Date().getFullYear()}</span>
          <span className="flex items-center gap-1.5">
            <span style={{ color: '#F5630F' }}>◆</span>
            Built with passion by Webfudge Systems
          </span>
          <span>Crafting digital excellence since 2022</span>
        </div>
      </div>

      {/* ── BIG WORDMARK ── */}
      <div className="relative overflow-hidden" style={{ height: 'clamp(120px, 20vw, 240px)' }}>
        {/* Dark gradient overlay that fades from footer bg into the wordmark area */}
        <div
          className="absolute inset-0 z-10 pointer-events-none"
          style={{
            background: 'linear-gradient(180deg, #080808 0%, rgba(8,8,8,0.0) 60%)',
          }}
        />

        {/* Gradient background for the wordmark row */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, #080808 0%, #1c0800 20%, #7a2800 45%, #F5630F 100%)',
          }}
        />

        {/* The big WEBFUDGE text */}
        <div
          className="absolute bottom-0 left-1/2 z-20 whitespace-nowrap font-bold select-none"
          style={{
            transform: 'translateX(-50%)',
            fontSize: '280px',
            lineHeight: 0.85,
            letterSpacing: '-0.02em',
            color: '#F5630F',
          }}
        >
          WEBFUDGE
        </div>
      </div>
    </footer>
  )
}
