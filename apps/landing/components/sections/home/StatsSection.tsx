'use client'

import React, { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import Container from '../../ui/Container'
import { businessPillars } from '../../../data/site'

const statCards = businessPillars.slice(0, 3).map((pillar) => ({
  label: pillar.label,
  description: pillar.description,
}))

function StatCard({
  label,
  description,
  index,
}: {
  label: string
  description: string
  index: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-60px' })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 36 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay: index * 0.14, ease: [0.22, 1, 0.36, 1] }}
      className="relative rounded-2xl overflow-hidden p-6 flex flex-col justify-between group"
      style={{
        background: 'linear-gradient(145deg, #161616 0%, #0f0f0f 100%)',
        border: '1px solid rgba(255,255,255,0.07)',
        minHeight: 160,
      }}
    >
      {/* Animated orange glow — bottom-right corner */}
      <motion.div
        className="absolute bottom-0 right-0 w-40 h-40 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at bottom right, rgba(245,99,15,0.55) 0%, rgba(245,99,15,0.15) 45%, transparent 70%)',
          borderRadius: '0 0 16px 0',
        }}
        animate={{ opacity: [0.6, 1, 0.6], scale: [1, 1.08, 1] }}
        transition={{
          duration: 2.8 + index * 0.4,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: index * 0.6,
        }}
      />

      {/* Subtle top shimmer */}
      <motion.div
        className="absolute top-0 left-0 right-0 h-px pointer-events-none"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(245,99,15,0.4), transparent)',
        }}
        animate={{ opacity: [0.3, 0.8, 0.3] }}
        transition={{ duration: 3, repeat: Infinity, delay: index * 0.5 }}
      />

      <div
        className="text-xl md:text-2xl font-extrabold text-white leading-snug relative z-10"
      >
        {label}
      </div>

      <p className="text-white/55 text-xs sm:text-sm leading-relaxed mt-4 relative z-10">
        {description}
      </p>
    </motion.div>
  )
}

export default function StatsSection() {
  return (
    <section
      className="py-16 sm:py-24 md:py-32 relative overflow-hidden"
      style={{
        background: 'linear-gradient(160deg, #0c0a09 0%, #050505 50%, #0a0805 100%)',
      }}
    >
      {/* Grid pattern */}
      <div className="absolute inset-0 grid-pattern opacity-20" />

      {/* Ambient warm glow — right */}
      <div
        className="absolute top-1/2 right-0 -translate-y-1/2 w-[600px] h-[500px] pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at right center, rgba(245,99,15,0.08) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
      />

      {/* Top edge line */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(245,99,15,0.35), transparent)',
        }}
      />
      {/* Bottom edge line */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(245,99,15,0.35), transparent)',
        }}
      />

      <Container className="relative z-10">
        {/* Main 2-col layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.15fr] gap-10 sm:gap-14 lg:gap-20 items-center">
          {/* ── Left: text ── */}
          <motion.div
            initial={{ opacity: 0, x: -28 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white leading-[1.08] tracking-tight mb-6 sm:mb-8">
              Built for
              <br />
              <span
                style={{
                  background: 'linear-gradient(135deg, #F5630F 30%, #ff8c42)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                Every Business
              </span>
            </h2>

            <p className="text-white/50 text-base md:text-lg leading-relaxed mb-10 max-w-sm">
              SaaS and on-premise solutions that are scalable, secure, and reliable — tailored to
              how your business operates.
            </p>

            {/* Challenge block — card style */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="relative rounded-2xl overflow-hidden p-6 md:p-7"
              style={{
                background:
                  'linear-gradient(135deg, rgba(245,99,15,0.12) 0%, rgba(245,99,15,0.04) 100%)',
                border: '1px solid rgba(245,99,15,0.25)',
              }}
            >
              {/* Animated glow edge */}
              <motion.div
                className="absolute top-0 left-0 right-0 h-px pointer-events-none"
                style={{ background: 'linear-gradient(90deg, transparent, #F5630F, transparent)' }}
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 2.5, repeat: Infinity }}
              />

              <p className="text-[#F5630F] font-bold text-xs uppercase tracking-[0.25em] mb-3">
                Why Webfudge
              </p>
              <p className="text-white font-semibold text-xl md:text-2xl leading-snug">
                Let&apos;s automate &amp; scale your business with software built around your
                workflow.
              </p>
            </motion.div>
          </motion.div>

          {/* ── Right: 2×2 card grid ── */}
          <div className="grid grid-cols-1 min-[480px]:grid-cols-2 gap-3 md:gap-4">
            {statCards.map((stat, i) => (
              <StatCard
                key={stat.label}
                label={stat.label}
                description={stat.description}
                index={i}
              />
            ))}

            {/* Highlighted card — Secure */}
            {businessPillars.slice(3, 4).map((pillar, i) => (
              <motion.div
                key={pillar.label}
                initial={{ opacity: 0, y: 36 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.7, delay: 0.42 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                className="relative rounded-2xl overflow-hidden p-6 flex flex-col justify-end"
                style={{
                  background:
                    i === 0
                      ? 'linear-gradient(145deg, #b84008 0%, #E8570D 50%, #FF7E38 100%)'
                      : 'linear-gradient(145deg, #161616 0%, #0f0f0f 100%)',
                  border: i === 0 ? undefined : '1px solid rgba(255,255,255,0.07)',
                  minHeight: 190,
                }}
              >
                {i === 0 && (
                  <motion.div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background:
                        'linear-gradient(135deg, rgba(255,255,255,0.18) 0%, transparent 55%)',
                    }}
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                  />
                )}

                <p
                  className={`font-bold text-base md:text-lg leading-snug relative z-10 ${
                    i === 0 ? 'text-white' : 'text-white/90'
                  }`}
                >
                  {pillar.label}
                </p>
                <p
                  className={`text-sm leading-relaxed mt-2 relative z-10 ${
                    i === 0 ? 'text-white/80' : 'text-white/55'
                  }`}
                >
                  {pillar.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  )
}
