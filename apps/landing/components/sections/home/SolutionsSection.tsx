'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import Container from '../../ui/Container'
import SolutionCardIllustration from './SolutionCardIllustration'

const STAGGER_OFFSETS = ['mt-0', 'lg:mt-10', 'lg:mt-5', 'lg:mt-[60px]'] as const

const cards = [
  {
    badge: 'CRM',
    title: 'Manage customers and close more deals',
    description:
      'Custom CRM platforms built around your sales process — with lead tracking, pipelines, automation, and real-time insights.',
    theme: 'dark' as const,
    illustration: 'crm' as const,
  },
  {
    badge: 'Project Management',
    title: 'Streamline teams and deliver on time',
    description:
      'Smart project management systems that help teams manage tasks, workflows, deadlines, and collaboration efficiently.',
    theme: 'glow' as const,
    illustration: 'pm' as const,
  },
  {
    badge: 'Accounts',
    title: 'Track finances with clarity and control',
    description:
      'Accounts software for billing, invoicing, ledgers, and financial reporting — so every transaction stays visible and accurate.',
    theme: 'light' as const,
    illustration: 'accounts' as const,
  },
  {
    badge: 'HR',
    title: 'Manage people, payroll, and performance',
    description:
      'HR platforms for employee records, leave management, org structure, and team operations — all in one place.',
    theme: 'white' as const,
    illustration: 'hr' as const,
  },
]

export default function SolutionsSection() {
  return (
    <section
      id="solutions"
      className="py-16 sm:py-24 md:py-32 overflow-hidden"
      style={{ background: '#ffffff' }}
    >
      <Container>
        {/* ── Statement heading ── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="mb-10 sm:mb-16 md:mb-20"
        >
          {/* Eyebrow */}
          <div className="flex items-center gap-2 mb-6">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#F5630F' }} />
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#888888]">
              About Us
            </span>
          </div>

          {/* Large editorial heading */}
          <h2 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.1] sm:leading-[1.05] tracking-tight text-[#111111] max-w-5xl">
            Webfudge Systems <span className="text-[#bbbbbb]">–</span> specializes in building{' '}
            <span className="font-playfair italic">custom software</span> solutions designed to{' '}
            <span className="font-playfair italic text-[#111111]">simplify</span> operations and{' '}
            <span className="text-[#F5630F]">accelerate</span> business growth.
          </h2>

          <p className="mt-6 text-[#666666] text-base md:text-lg max-w-2xl leading-relaxed">
            Our focus is on creating scalable, user-friendly, and performance-driven systems that
            help businesses automate processes, manage operations, and improve efficiency.
          </p>
        </motion.div>

        {/* ── 4-card staggered horizontal row ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 items-start">
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
                className={`group relative rounded-2xl sm:rounded-[28px] overflow-hidden cursor-default flex flex-col min-h-[300px] sm:min-h-[340px] lg:min-h-[380px] ${STAGGER_OFFSETS[i]}`}
              >
                {/* Card outer shell */}
                <div
                  className="relative flex flex-col flex-1 min-h-[inherit]"
                  style={{
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
                  <div className="relative flex-1 min-h-[140px] sm:min-h-[180px] lg:min-h-[200px] overflow-hidden">
                    <SolutionCardIllustration variant={card.illustration} dark={isDark} />

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
                  <div className="p-4 sm:p-6 pt-4 sm:pt-5">
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
          className="mt-8 sm:mt-12 flex justify-center sm:justify-end"
        >
          <motion.a
            href="#services"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#F5630F] group"
            whileHover={{ x: 4 }}
          >
            Explore Solutions
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
