'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, Phone } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

const navItems = [
  { label: 'Home', href: '#home' },
  { label: 'Services', href: '#services' },
  { label: 'Solutions', href: '#solutions' },
  { label: 'Projects', href: '#projects' },
  { label: 'About', href: '#about' },
  { label: 'Process', href: '#process' },
  { label: 'Contact', href: '#contact' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [activeItem, setActiveItem] = useState('')

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 60)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <>
      <motion.nav
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? 'py-3 bg-white/90 backdrop-blur-xl shadow-[0_1px_0_rgba(0,0,0,0.08)] border-b border-[rgba(0,0,0,0.06)]'
            : 'py-5'
        }`}
      >
        <div className="mx-auto px-4 sm:px-6 lg:px-8 max-w-[1400px]">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="relative flex items-center group h-10">
              {/* White logo — shown on the orange hero (before scroll) */}
              <Image
                src="/logo/ws_logo_white.png"
                alt="Webfudge Systems"
                width={140}
                height={40}
                priority
                className={`h-9 w-auto md:h-10 transition-all duration-500 group-hover:scale-105 ${scrolled ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
              />
              {/* Dark logo — shown after scroll on white navbar */}
              <Image
                src="/ws_logo.png"
                alt="Webfudge Systems"
                width={140}
                height={40}
                priority
                className={`h-9 w-auto md:h-10 transition-all duration-500 group-hover:scale-105 absolute inset-0 ${scrolled ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
                style={{ mixBlendMode: 'multiply' }}
              />
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={() => setActiveItem(item.label)}
                  className={`relative px-4 py-2 text-sm font-medium transition-colors duration-300 group ${
                    scrolled ? 'text-[#444444] hover:text-[#111111]' : 'text-white/80 hover:text-white'
                  }`}
                >
                  {item.label}
                  <span className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"
                    style={{ background: 'linear-gradient(135deg, #F5630F, #ff8c42)' }}
                  />
                </a>
              ))}
            </div>

            {/* CTA */}
            <div className="hidden md:flex items-center gap-3">
              <motion.a
                href="#contact"
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${
                  scrolled
                    ? 'bg-[#F5630F] text-white'
                    : 'bg-white text-[#111111]'
                }`}
                whileHover={{ scale: 1.03, y: -1 }}
                whileTap={{ scale: 0.97 }}
                style={scrolled ? { background: 'linear-gradient(135deg, #F5630F, #ff8c42)' } : {}}
              >
                <Phone size={14} />
                Book a Call
              </motion.a>
            </div>

            {/* Mobile toggle */}
            <button
              className={`md:hidden p-2 rounded-xl transition-colors ${
                scrolled ? 'text-[#111111] hover:bg-[#f5f5f5]' : 'text-white hover:bg-white/10'
              }`}
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-x-0 top-[60px] z-40 bg-white/95 backdrop-blur-xl border-b border-[rgba(0,0,0,0.08)] shadow-large md:hidden"
          >
            <div className="px-4 py-6 flex flex-col gap-1">
              {navItems.map((item, i) => (
                <motion.a
                  key={item.label}
                  href={item.href}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => setMobileOpen(false)}
                  className="px-4 py-3 rounded-xl text-[#444444] hover:text-[#F5630F] hover:bg-orange-50 font-medium transition-all duration-200 text-sm"
                >
                  {item.label}
                </motion.a>
              ))}
              <div className="mt-4 pt-4 border-t border-[rgba(0,0,0,0.08)]">
                <a
                  href="#contact"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-full text-sm font-semibold text-white"
                  style={{ background: 'linear-gradient(135deg, #F5630F, #ff8c42)' }}
                >
                  <Phone size={14} />
                  Book a Call
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
