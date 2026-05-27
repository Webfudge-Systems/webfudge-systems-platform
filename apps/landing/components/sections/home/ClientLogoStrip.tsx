'use client'

import React from 'react'
import { motion } from 'framer-motion'

const logos = [
  {
    name: 'Google',
    icon: (
      <svg viewBox="0 0 100 100" className="h-6 w-auto" fill="none">
        <path
          d="M50 41.7v17.1h23.7c-1 5.6-4 10.3-8.5 13.5l13.7 10.6C87.1 74.9 91 63.5 91 50c0-3-.3-5.9-.8-8.6L50 41.7z"
          fill="#4285F4"
        />
        <path
          d="M22.3 60.3l-3.1 2.4L9 70.7C15.6 83.7 29.7 92.5 46 92.5c11.9 0 21.9-3.9 29.2-10.6L61.5 71.3c-4 2.7-9 4.3-15.5 4.3-11.9 0-22-8-25.7-18.7-.1-.2-.1-.4-.2-.6l.2.0z"
          fill="#34A853"
        />
        <path
          d="M9 29.3C6.1 35 4.5 41.3 4.5 48s1.6 13 4.5 18.7l13.3-10.3C21.3 53.2 21 51 21 48s.3-5.2 1.3-7.7L9 29.3z"
          fill="#FBBC05"
        />
        <path
          d="M46 19.5c6.7 0 12.7 2.3 17.5 6.8l13.1-13.1C68.7 6 58.7 1.5 46 1.5 29.7 1.5 15.6 10.3 9 23.3l13.3 10.3C25.8 27.5 35.9 19.5 46 19.5z"
          fill="#EA4335"
        />
      </svg>
    ),
  },
  {
    name: 'Slack',
    icon: (
      <svg viewBox="0 0 100 100" className="h-6 w-auto" fill="none">
        <rect x="10" y="10" width="80" height="80" rx="15" fill="#4A154B" />
        <path
          d="M35 55a5 5 0 010-10h10V35a5 5 0 0110 0v10h10a5 5 0 010 10H55v10a5 5 0 01-10 0V55H35z"
          fill="white"
          opacity=".9"
        />
      </svg>
    ),
  },
  {
    name: 'Shopify',
    icon: (
      <svg viewBox="0 0 100 100" className="h-7 w-auto" fill="none">
        <path
          d="M65.3 20.6c-.2-.1-.4-.1-.6-.1-.2 0-3.7.2-7 .5-.1-1.1-.5-2.2-1.1-3.1-1.5-2.3-3.7-3.5-6.3-3.5h-.3c-.1-.1-.1-.2-.2-.3-1.2-1.3-2.7-2-4.4-2-3.4 0-6.7 2.5-9.4 6.9-1.9 3-3.3 6.7-3.7 9.6l-6.4 2c-1.9.6-2 .6-2.2 2.4-.1 1.2-4.7 36.4-4.7 36.4l37.5 7 20.2-4.4S65.7 21.1 65.3 20.6zm-14 .2c-1.5.5-3.2 1-4.9 1.5.3-1.3.8-2.5 1.4-3.6.8-.4 1.6-.7 2.5-.9l1 3zm-6.6-2.8c.9 0 1.7.3 2.4.9l-1.1 3.6c-1.9.5-3.9 1.2-6 1.9.5-3 3.1-6.4 4.7-6.4zm-1.8 25.4l2.4 7.2s-2.1 1.1-5.2 1.1c-4.3 0-4.4-2.7-4.4-3.4 0-3.7 4.8-5 7.2-4.9z"
          fill="#95BF47"
        />
      </svg>
    ),
  },
  {
    name: 'Stripe',
    icon: (
      <svg viewBox="0 0 100 100" className="h-6 w-auto" fill="none">
        <rect width="100" height="100" rx="16" fill="#635BFF" />
        <path
          d="M45 42c0-2.8 2.3-3.9 6.1-3.9 5.5 0 12.4 1.7 17.9 4.7V28.3c-6-2.4-11.9-3.3-17.9-3.3-14.7 0-24.5 7.7-24.5 20.5 0 20 27.6 16.8 27.6 25.4 0 3.3-2.9 4.4-6.9 4.4-6 0-13.7-2.5-19.7-5.8V84c6.7 2.9 13.5 4.1 19.7 4.1 15 0 25.3-7.4 25.3-20.4C72.6 46.8 45 50.9 45 42z"
          fill="white"
        />
      </svg>
    ),
  },
  {
    name: 'Dropbox',
    icon: (
      <svg viewBox="0 0 100 100" className="h-6 w-auto" fill="none">
        <path d="M25 20L50 37 25 54 0 37z" fill="#0061FF" transform="translate(0, 0)" />
        <path d="M75 20L100 37 75 54 50 37z" fill="#0061FF" />
        <path d="M25 56L50 73l25-17 25 17-25 17-25-17-25 17L0 73z" fill="#0061FF" />
        <path d="M50 37l25-17 25 17L75 54z" fill="#0061FF" opacity=".7" />
      </svg>
    ),
  },
  {
    name: 'HubSpot',
    icon: (
      <svg viewBox="0 0 100 100" className="h-7 w-auto" fill="none">
        <circle cx="50" cy="50" r="45" fill="#FF7A59" />
        <path
          d="M60 35V25c0-2.8 2.2-5 5-5s5 2.2 5 5v10c2.8 0 5 2.2 5 5s-2.2 5-5 5H60c0 2.8-2.2 5-5 5v15c0 5.5 4.5 10 10 10s10-4.5 10-10V65h5v5c0 8.3-6.7 15-15 15s-15-6.7-15-15V50c-2.8 0-5-2.2-5-5v-5H35v-5h15c0-2.8 2.2-5 5-5s5 2.2 5 5z"
          fill="white"
        />
      </svg>
    ),
  },
  {
    name: 'Linear',
    icon: (
      <svg viewBox="0 0 100 100" className="h-6 w-auto" fill="none">
        <defs>
          <linearGradient id="linearGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#5E6AD2" />
            <stop offset="100%" stopColor="#8B5CF6" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="45" fill="url(#linearGrad)" />
        <path
          d="M20 20l60 60M20 20l30 60M20 20l60 30"
          stroke="white"
          strokeWidth="8"
          strokeLinecap="round"
          opacity=".8"
        />
      </svg>
    ),
  },
  {
    name: 'Notion',
    icon: (
      <svg viewBox="0 0 100 100" className="h-6 w-auto" fill="none">
        <rect width="100" height="100" rx="16" fill="#F7F6F3" />
        <path d="M20 20h60v60H20z" fill="none" />
        <text x="50" y="62" textAnchor="middle" fill="#37352F" fontSize="40" fontWeight="900">
          N
        </text>
      </svg>
    ),
  },
  {
    name: 'Figma',
    icon: (
      <svg viewBox="0 0 100 100" className="h-7 w-auto" fill="none">
        <rect x="20" y="10" width="25" height="40" rx="12.5" fill="#F24E1E" />
        <rect x="55" y="10" width="25" height="40" rx="12.5" fill="#FF7262" />
        <circle cx="67.5" cy="50" r="12.5" fill="#1ABCFE" />
        <rect x="20" y="50" width="25" height="40" rx="12.5" fill="#0ACF83" />
        <rect x="20" y="30" width="25" height="40" rx="0" fill="#A259FF" />
      </svg>
    ),
  },
]

interface ClientLogoStripProps {
  dark?: boolean
}

export default function ClientLogoStrip({ dark = false }: ClientLogoStripProps) {
  const bg = dark ? 'transparent' : 'white'
  const fadeBg = dark ? '#0a0a0a' : 'white'
  const labelColor = dark ? 'rgba(255,255,255,0.35)' : '#888888'
  const nameColor = dark ? 'rgba(255,255,255,0.7)' : '#333'

  return (
    <section
      className={`overflow-hidden ${dark ? 'py-10 sm:py-14' : 'py-12 sm:py-16 border-y border-[rgba(0,0,0,0.06)]'}`}
      style={{ background: bg }}
    >
      <div className="mx-auto px-4 sm:px-6 lg:px-8 max-w-[1400px] mb-10">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center text-xs font-semibold uppercase tracking-[0.2em]"
          style={{ color: labelColor }}
        >
          Trusted by teams at the world&apos;s best companies
        </motion.p>
      </div>

      {/* Marquee track */}
      <div className="relative overflow-hidden">
        {/* Fade edges */}
        <div
          className="absolute left-0 top-0 bottom-0 w-12 sm:w-24 md:w-32 z-10 pointer-events-none"
          style={{ background: `linear-gradient(90deg, ${fadeBg}, transparent)` }}
        />
        <div
          className="absolute right-0 top-0 bottom-0 w-12 sm:w-24 md:w-32 z-10 pointer-events-none"
          style={{ background: `linear-gradient(270deg, ${fadeBg}, transparent)` }}
        />

        <div
          className="flex items-center"
          style={{
            animation: 'marquee-left 35s linear infinite',
            width: 'max-content',
          }}
        >
          {[...logos, ...logos].map((logo, i) => (
            <div
              key={`${logo.name}-${i}`}
              className={`flex items-center justify-center mx-6 sm:mx-12 md:mx-16 transition-opacity duration-300 ${dark ? 'opacity-80 hover:opacity-100' : 'opacity-80 hover:opacity-100 grayscale hover:grayscale-0'}`}
              style={dark ? { filter: 'brightness(0) invert(1)' } : {}}
            >
              <div className="flex items-center gap-2.5">
                <div className={dark ? '[&_svg]:h-8 [&_svg]:w-auto' : '[&_svg]:h-6 [&_svg]:w-auto'}>
                  {logo.icon}
                </div>
                <span
                  className="text-base font-semibold hidden sm:block"
                  style={{ color: nameColor }}
                >
                  {logo.name}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
