'use client'

import { Jura } from 'next/font/google'
import Link from 'next/link'
import Image from 'next/image'
import { useRef, useState, useEffect } from 'react'
import Footer from '../../components/Footer'
import { useScrolled } from '../../hooks/useScrolled'

const jura = Jura({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })

const gridBg = {
  backgroundColor: '#FFFBF9',
  backgroundImage:
    'linear-gradient(#e5e0dc 1px, transparent 1px), linear-gradient(90deg, #e5e0dc 1px, transparent 1px)',
  backgroundSize: '40px 40px',
}

export default function AboutPage() {
  const scrolled = useScrolled(50)
  const [activeSection, setActiveSection] = useState<'vision' | 'mission'>('vision')
  const visionRef = useRef<HTMLDivElement>(null)
  const missionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const visionEl = visionRef.current
    const missionEl = missionRef.current
    if (!visionEl || !missionEl) return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          if (entry.target === visionEl) setActiveSection('vision')
          if (entry.target === missionEl) setActiveSection('mission')
        }
      },
      { rootMargin: '-20% 0px -60% 0px', threshold: 0 }
    )
    observer.observe(visionEl)
    observer.observe(missionEl)
    return () => observer.disconnect()
  }, [])

  return (
    <main className={`${jura.className} min-h-full`}>
      {/* About page navbar: fixed so full page scrolls underneath */}
      <header
        className="fixed top-0 left-0 right-0 z-50 py-4 bg-transparent"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between px-8 md:px-16">
          <Link
            href="/"
            className="flex items-center gap-2 hover:opacity-90"
            aria-label="Webfudge Systems – Home"
          >
            <Image
              src="/ws_logo.png"
              alt=""
              width={140}
              height={140}
              className="h-9 w-auto md:h-10 md:w-auto"
            />
            <span className="text-gray-900 font-semibold text-lg">Webfudge Systems</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="bg-[#2a2a2a] text-white/80 text-xs px-5 py-3 rounded-[8px] flex items-center gap-1"
            >
              Webfudge Systems ↗
            </Link>
            {scrolled && (
              <Link
                href="/signup"
                className="bg-orange-500 text-white text-xs px-5 py-3 rounded-[8px]"
              >
                Join Us
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* SECTION 1 - Hero */}
      <section className="relative min-h-screen px-8 md:px-16 pt-8 pb-24" style={gridBg}>
        {/* Hero center */}
        <div className="flex flex-col items-center justify-center max-w-4xl mx-auto pt-16 md:pt-20">
          <h1 className="text-5xl md:text-5xl font-bold text-center text-gray-900 leading-tight tracking-tight">
            The Operating System for
            <br />
            Modern Businesses
          </h1>
          <p className="text-gray-500 text-center text-base mt-6">
            Reimagining How Businesses Operate
          </p>
          <div
            className="w-[980px] h-[400px] pr-4 mx-auto mt-12 rounded-2xl bg-gray-200 aspect-video"
            aria-hidden
          />
        </div>
      </section>

      {/* SECTION 2 - Mission Statement */}
      <section
        className="px-8 md:px-16 py-18"
        style={gridBg}
      >
        <div className="max-w-2xl mx-auto">
          <p className="text-xl md:text-2xl font-bold text-gray-900 text-center leading-relaxed">
            Modern businesses rely on too many disconnected tools. We built Webfudge
            Systems to change that—bringing everything into one modular platform that
            adapts to how teams actually work, not the other way around.
          </p>
          <p className="text-gray-500 text-lg font-bold text-center mt-9">
            One Platform. Total Control.
          </p>
        </div>
      </section>

      {/* SECTION 3 - Purpose with sticky scroll */}
      <section
        className="px-8 md:px-16 py-24 relative z-10 rounded-b-3xl"
        style={gridBg}
      >
        <h2 className="text-5xl font-bold text-center text-gray-900 mb-20">
          Purpose
        </h2>

        <div className="max-w-6xl ml-auto mr-0 grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-20">
          {/* Left column - sticky nav labels */}
          <div className="md:col-span-1">
            <div className="sticky top-32 bottom-0 flex flex-col pt-2">
              <button
                type="button"
                onClick={() => visionRef.current?.scrollIntoView({ behavior: 'smooth' })}
                className={`text-left text-lg transition-colors duration-300 ${
                  activeSection === 'vision'
                    ? 'text-gray-900 font-bold'
                    : 'text-gray-400 font-medium'
                }`}
              >
                Our Vision
              </button>
              <button
                type="button"
                onClick={() => missionRef.current?.scrollIntoView({ behavior: 'smooth' })}
                className={`text-left text-lg transition-colors duration-300 ${
                  activeSection === 'mission'
                    ? 'text-gray-900 font-bold'
                    : 'text-gray-400 font-medium'
                }`}
              >
                Our Mission
              </button>
            </div>
          </div>

          {/* Right column - scrollable content */}
          <div className="md:col-span-2 space-y-24">
            <div ref={visionRef}>
              <p className="text-black  font-bold leading-relaxed mb-8">
                We envision a future where businesses no longer rely on fragmented
                tools. Webfudge Systems aims to become the central platform where
                operations, data, and teams come together—creating a seamless and
                scalable way to run any organization.
              </p>
              <div
                className="w-full rounded-2xl bg-gray-200 aspect-video mb-24"
                aria-hidden
              />
            </div>

            <div ref={missionRef}>
              <p className="text-black  font-bold leading-relaxed mb-8">
                To build a flexible business operating system that empowers companies
                to manage their workflows, data, and teams through one integrated
                platform.
              </p>
              <div
                className="w-full rounded-2xl bg-gray-200 aspect-video mb-24"
                aria-hidden
              />
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
