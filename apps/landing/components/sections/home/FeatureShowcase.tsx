'use client'

import React, { useRef, useState } from 'react'
import { motion, useScroll, useTransform, useMotionValueEvent, MotionValue } from 'framer-motion'

type Feature = {
  eyebrow: string
  title: string
  color: string
  bg: string
  text: string
  sub: string
  number: string
  dark: boolean
}

const features: Feature[] = [
  {
    eyebrow: 'Architecture',
    title: 'Scalable Architecture\nBuilt for Growth',
    color: '#F5630F',
    bg: '#FFFFFF',
    text: '#111111',
    sub: 'rgba(0,0,0,0.3)',
    number: '01',
    dark: false,
  },
  {
    eyebrow: 'Performance',
    title: 'Lightning Fast,\nEvery Time',
    color: '#FFFFFF',
    bg: '#F5630F',
    text: '#FFFFFF',
    sub: 'rgba(255,255,255,0.5)',
    number: '02',
    dark: true,
  },
  {
    eyebrow: 'AI Integration',
    title: 'Powered by\nIntelligent Automation',
    color: '#F5630F',
    bg: '#FFFFFF',
    text: '#111111',
    sub: 'rgba(0,0,0,0.3)',
    number: '03',
    dark: false,
  },
  {
    eyebrow: 'Security',
    title: 'Enterprise-Grade\nSecurity',
    color: '#FFFFFF',
    bg: '#F5630F',
    text: '#FFFFFF',
    sub: 'rgba(255,255,255,0.5)',
    number: '04',
    dark: true,
  },
]

function FeatureCard({
  feature,
  index,
  total,
  scrollProgress,
}: {
  feature: Feature
  index: number
  total: number
  scrollProgress: MotionValue<number>
}) {
  // Segment layout:
  //   Segment 0 [0, 1/n]      → dwell on card 0
  //   Segment i [i/n,(i+1)/n] → card i slides up and covers card i-1  (i >= 1)
  const slideStart = index / total
  const slideEnd = (index + 1) / total

  const yRange = index === 0 ? [0, 1] : [slideStart, slideEnd]
  const yValues = index === 0 ? ['0%', '0%'] : ['100%', '0%']
  const y = useTransform(scrollProgress, yRange, yValues)

  const isStacking = index > 0

  return (
    <motion.div
      style={{
        y,
        zIndex: (index + 1) * 10,
        borderRadius: isStacking ? '2rem 2rem 0 0' : 0,
        boxShadow: isStacking
          ? feature.dark
            ? '0 -16px 60px rgba(0,0,0,0.18)'
            : '0 -16px 60px rgba(0,0,0,0.1)'
          : 'none',
      }}
      className="absolute inset-0 flex flex-col justify-end overflow-hidden"
    >
      {/* Solid background */}
      <div className="absolute inset-0" style={{ background: feature.bg }} />

      {/* Subtle noise/grain texture overlay for depth */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          backgroundSize: '200px 200px',
        }}
      />

      {/* Accent glow — bottom-left corner */}
      <div
        className="absolute bottom-0 left-0 w-[40vw] h-[40vh] pointer-events-none"
        style={{
          background: feature.dark
            ? 'radial-gradient(ellipse at 0% 100%, rgba(255,255,255,0.12) 0%, transparent 65%)'
            : 'radial-gradient(ellipse at 0% 100%, rgba(245,99,15,0.08) 0%, transparent 65%)',
        }}
      />

      {/* Content — bottom left */}
      <div className="relative z-10 px-12 pb-16 md:px-20 md:pb-20 max-w-[680px]">
        {/* Eyebrow */}
        <div
          className="flex items-center gap-2.5 mb-5 text-[11px] font-bold uppercase tracking-[0.22em]"
          style={{ color: feature.color }}
        >
          <span
            className="inline-block w-5 h-px flex-shrink-0"
            style={{ background: feature.color }}
          />
          {feature.eyebrow}
        </div>

        {/* Title */}
        <h2
          className="font-bold tracking-tight leading-[1.06]"
          style={{
            color: feature.text,
            fontSize: 'clamp(2.6rem, 5.5vw, 5rem)',
            whiteSpace: 'pre-line',
          }}
        >
          {feature.title}
        </h2>
      </div>

      {/* Feature number — bottom right */}
      <div
        className="absolute bottom-16 right-12 md:bottom-20 md:right-20 z-10 tabular-nums font-bold leading-none select-none"
        style={{
          color: feature.color,
          fontSize: 'clamp(5rem, 12vw, 11rem)',
          opacity: 0.12,
          letterSpacing: '-0.04em',
          lineHeight: 1,
        }}
      >
        {feature.number}
      </div>
    </motion.div>
  )
}

export default function FeatureShowcase() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const n = features.length

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end end'],
  })

  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    setActiveIndex(Math.min(Math.floor(v * n), n - 1))
  })

  const active = features[activeIndex]

  return (
    <section ref={sectionRef} id="about" className="relative" style={{ height: `${n * 100}vh` }}>
      <div className="sticky top-0 h-screen overflow-hidden">
        {/* Stacking cards */}
        {features.map((feature, i) => (
          <FeatureCard
            key={feature.title}
            feature={feature}
            index={i}
            total={n}
            scrollProgress={scrollYProgress}
          />
        ))}

        {/* Counter — top right, adapts to card brightness */}
        <div className="absolute top-8 right-10 md:right-12 z-50">
          <span
            className="text-[11px] font-bold tracking-widest tabular-nums transition-colors duration-500"
            style={{ color: active.sub }}
          >
            {active.number}&nbsp;/&nbsp;{String(n).padStart(2, '0')}
          </span>
        </div>

        {/* Progress dots — bottom right, adapts to card brightness */}
        <div className="absolute bottom-10 right-10 md:right-12 z-50 flex items-center gap-2">
          {features.map((feat, i) => (
            <div
              key={i}
              className="rounded-full transition-all duration-500 ease-out"
              style={{
                width: activeIndex === i ? 28 : 7,
                height: 5,
                background:
                  activeIndex === i
                    ? feat.color
                    : active.dark
                      ? 'rgba(255,255,255,0.2)'
                      : 'rgba(0,0,0,0.12)',
              }}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
