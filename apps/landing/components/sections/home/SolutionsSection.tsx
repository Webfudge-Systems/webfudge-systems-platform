'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import Container from '../../ui/Container'

const cards = [
  {
    badge: 'CRM',
    title: 'Bold strategies that close more deals',
    description:
      'Fully custom CRM platforms built around your sales process — with pipelines, automation, and real-time insight.',
    theme: 'dark',
    visual: 'abstract-lines',
    offset: '0px',
    height: 440,
  },
  {
    badge: 'Enterprise',
    title: 'Driving measurable growth through scale',
    description:
      'End-to-end enterprise systems designed for complex workflows, multi-team coordination, and zero downtime.',
    theme: 'glow',
    visual: 'orange-blur',
    offset: '40px',
    height: 400,
  },
  {
    badge: 'Automation',
    title: 'Creative processes with rapid delivery',
    description:
      'AI-powered automation that eliminates repetitive work and turns complex operations into simple workflows.',
    theme: 'light',
    visual: 'dots',
    offset: '20px',
    height: 380,
  },
  {
    badge: 'SaaS',
    title: 'A dedicated team behind your success',
    description:
      'Launch your SaaS product with scalable architecture, billing integrations, and an experience your users love.',
    theme: 'white',
    visual: 'minimal',
    offset: '60px',
    height: 360,
  },
]

function CardVisual({ theme }: { theme: string }) {
  if (theme === 'dark') {
    return (
      <div className="absolute inset-0 overflow-hidden">
        {/* Abstract speed lines */}
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              height: 2,
              width: `${60 + i * 20}%`,
              top: `${30 + i * 12}%`,
              left: `-${i * 5}%`,
              background: `linear-gradient(90deg, transparent, rgba(245,99,15,${0.3 + i * 0.1}), rgba(255,140,66,${0.5 + i * 0.1}), transparent)`,
              filter: 'blur(1px)',
            }}
            animate={{
              x: ['-20%', '120%'],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 2.5 + i * 0.4,
              repeat: Infinity,
              delay: i * 0.6,
              ease: 'easeInOut',
            }}
          />
        ))}
        {/* Glow blob center */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(245,99,15,0.25) 0%, transparent 70%)',
            filter: 'blur(30px)',
          }}
        />
      </div>
    )
  }

  if (theme === 'glow') {
    return (
      <div className="absolute inset-0 overflow-hidden">
        {/* Orange motion blur abstract */}
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{
            width: 200,
            height: 100,
            background: 'linear-gradient(90deg, #F5630F, #ff8c42, #F5630F)',
            borderRadius: '50%',
            filter: 'blur(30px)',
          }}
          animate={{ scaleX: [1, 1.4, 0.8, 1.2, 1], scaleY: [1, 0.7, 1.3, 0.9, 1] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{
            width: 280,
            height: 60,
            background:
              'linear-gradient(90deg, transparent, rgba(245,99,15,0.6), rgba(255,255,255,0.3), rgba(245,99,15,0.6), transparent)',
            filter: 'blur(20px)',
          }}
          animate={{ scaleX: [0.8, 1.3, 0.9, 1], rotate: [-5, 5, -3, 0] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
        />
        {/* Bright streak */}
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{
            width: 180,
            height: 12,
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent)',
            borderRadius: 9999,
            filter: 'blur(4px)',
          }}
          animate={{ opacity: [0.4, 1, 0.4], scaleX: [0.8, 1.2, 0.8] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
    )
  }

  if (theme === 'light') {
    return (
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.06) 1.5px, transparent 1.5px)',
            backgroundSize: '22px 22px',
          }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(245,99,15,0.12) 0%, transparent 70%)',
          }}
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
      </div>
    )
  }

  // white / minimal
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />
    </div>
  )
}

export default function SolutionsSection() {
  return (
    <section
      id="solutions"
      className="py-24 md:py-32 overflow-hidden"
      style={{ background: '#ffffff' }}
    >
      <Container>
        {/* ── Statement heading ── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="mb-16 md:mb-20"
        >
          {/* Eyebrow */}
          <div className="flex items-center gap-2 mb-6">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#F5630F' }} />
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#888888]">
              About Studio
            </span>
          </div>

          {/* Large editorial heading with inline blobs */}
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-[1.05] tracking-tight text-[#111111] max-w-5xl">
            Webfudge Systems <span className="text-[#bbbbbb]">–</span> is a software studio that
            builds {/* Inline orange pill blob */}
            <span className="font-playfair italic">scalable</span> digital products for{' '}
            <span className="font-playfair italic text-[#111111]">ambitious</span> businesses with{' '}
            <span className="text-[#F5630F]">cutting-edge</span> technology.
          </h2>

          <p className="mt-6 text-[#666666] text-base md:text-lg max-w-2xl leading-relaxed">
            The Webfudge team brings unique creative and technical expertise to every project, with
            results that launch faster and scale without limits.
          </p>
        </motion.div>

        {/* ── 4-card staggered horizontal row ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 items-start">
          {cards.map((card, i) => {
            const isDark = card.theme === 'dark' || card.theme === 'glow'

            return (
              <motion.div
                key={card.badge}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.7, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -10, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } }}
                style={{ marginTop: card.offset }}
                className="group relative rounded-[28px] overflow-hidden cursor-default flex flex-col"
              >
                {/* Card outer shell */}
                <div
                  className="relative flex flex-col"
                  style={{
                    minHeight: card.height,
                    background:
                      card.theme === 'dark'
                        ? '#0a0a0a'
                        : card.theme === 'glow'
                          ? '#111111'
                          : card.theme === 'light'
                            ? '#f0f0f0'
                            : '#fafafa',
                    border: isDark
                      ? '1px solid rgba(255,255,255,0.07)'
                      : '1px solid rgba(0,0,0,0.08)',
                    boxShadow: isDark
                      ? '0 20px 60px rgba(0,0,0,0.4)'
                      : '0 4px 30px rgba(0,0,0,0.06)',
                    borderRadius: 28,
                  }}
                >
                  {/* Visual area (top ~55%) */}
                  <div className="relative flex-1" style={{ minHeight: card.height * 0.52 }}>
                    <CardVisual theme={card.theme} />

                    {/* Badge pill — top left */}
                    <div className="absolute top-5 left-5 z-10">
                      <span
                        className="px-3 py-1.5 rounded-full text-[11px] font-semibold tracking-wide"
                        style={{
                          background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)',
                          color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)',
                          backdropFilter: 'blur(8px)',
                          border: isDark
                            ? '1px solid rgba(255,255,255,0.1)'
                            : '1px solid rgba(0,0,0,0.08)',
                        }}
                      >
                        {card.badge}
                      </span>
                    </div>

                    {/* Arrow icon top-right (appears on hover) */}
                    <motion.div
                      className="absolute top-5 right-5 z-10 w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      style={{ background: 'linear-gradient(135deg, #F5630F, #ff8c42)' }}
                    >
                      <ArrowUpRight size={13} className="text-white" />
                    </motion.div>
                  </div>

                  {/* Content — bottom */}
                  <div className="p-6 pt-5">
                    {/* Orange dot + title */}
                    <div className="flex items-start gap-3 mb-3">
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
                        style={{ background: '#F5630F' }}
                      />
                      <h3
                        className={`text-base font-bold leading-snug ${
                          isDark ? 'text-white' : 'text-[#111111]'
                        }`}
                      >
                        {card.title}
                      </h3>
                    </div>

                    <p
                      className="text-xs leading-relaxed pl-5"
                      style={{ color: isDark ? 'rgba(255,255,255,0.45)' : '#888888' }}
                    >
                      {card.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Bottom link */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="mt-12 flex justify-end"
        >
          <motion.a
            href="#contact"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#F5630F] group"
            whileHover={{ x: 4 }}
          >
            Start a project
            <span
              className="w-7 h-7 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform"
              style={{ background: 'linear-gradient(135deg, #F5630F, #ff8c42)' }}
            >
              <ArrowUpRight size={13} className="text-white" />
            </span>
          </motion.a>
        </motion.div>
      </Container>
    </section>
  )
}
