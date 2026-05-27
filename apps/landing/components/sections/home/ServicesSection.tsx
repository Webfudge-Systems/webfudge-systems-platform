'use client'

import React from 'react'
import { motion } from 'framer-motion'
import Container from '../../ui/Container'
import SectionHeader from '../../ui/SectionHeader'

const services = [
  {
    number: '01',
    title: 'Custom Software Development',
    tags: ['Enterprise Solutions', 'Internal Tools', 'Full-Stack'],
    description:
      'Bespoke software solutions engineered precisely to your business requirements. From complex enterprise applications to lightweight internal tools — built to scale and evolve with you.',
    bg: '#ffffff',
    accentBg: 'rgba(245,99,15,0.05)',
  },
  {
    number: '02',
    title: 'CRM Development',
    tags: ['Sales Pipelines', 'Automation', 'Real-time Analytics'],
    description:
      'Tailored CRM systems that fit your exact sales process — with custom pipelines, automation, integrations, and real-time analytics that give your team a genuine edge.',
    bg: '#fafafa',
    accentBg: 'rgba(245,99,15,0.06)',
  },
  {
    number: '03',
    title: 'SaaS Development',
    tags: ['Multi-tenancy', 'Subscription Billing', 'Scalable Infra'],
    description:
      'End-to-end SaaS product development with scalable architecture, multi-tenancy, subscription billing, and growth-ready infrastructure — built for the long haul.',
    bg: '#f7f7f7',
    accentBg: 'rgba(245,99,15,0.05)',
  },
  {
    number: '04',
    title: 'UI/UX Design',
    tags: ['User Research', 'Conversion Focused', 'Design Systems'],
    description:
      'Premium interface design that balances aesthetics with usability. We craft experiences that convert visitors into loyal customers and keep them coming back.',
    bg: '#f5f5f5',
    accentBg: 'rgba(245,99,15,0.06)',
  },
  {
    number: '05',
    title: 'AI Automation',
    tags: ['LLM Integration', 'Workflow Automation', 'Smart Pipelines'],
    description:
      'Intelligent automation powered by the latest AI models. Automate workflows, generate insights, and make smarter decisions at scale — without added headcount.',
    bg: '#f3f3f3',
    accentBg: 'rgba(245,99,15,0.05)',
  },
  {
    number: '06',
    title: 'Performance Marketing',
    tags: ['SEO & Content', 'Paid Campaigns', 'Growth Strategy'],
    description:
      'Data-driven digital marketing strategies that maximise ROI — from SEO and content to paid campaigns and conversion optimisation that compound over time.',
    bg: '#f0f0f0',
    accentBg: 'rgba(245,99,15,0.06)',
  },
]

/* ─── top offset per card: 80px base + 36px per index ─── */
const STICKY_BASE = 80
const STICKY_STEP = 36

function ServiceCard({
  service,
  index,
}: {
  service: (typeof services)[0]
  index: number
}) {
  return (
    <div
      style={{
        position: 'sticky',
        top: STICKY_BASE + index * STICKY_STEP,
        zIndex: index + 1,
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 60 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.7, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
        className="w-full rounded-2xl overflow-hidden relative"
        style={{
          background: service.bg,
          border: '1px solid rgba(0,0,0,0.07)',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.08)',
          minHeight: 320,
        }}
      >
        {/* Subtle radial accent behind number */}
        <div
          className="absolute top-0 left-0 w-72 h-full pointer-events-none"
          style={{ background: `radial-gradient(ellipse at left center, ${service.accentBg} 0%, transparent 70%)` }}
        />

        <div className="relative z-10 grid grid-cols-1 md:grid-cols-[220px_1fr_auto] gap-8 p-8 md:p-10 lg:p-12 items-center">

          {/* Number */}
          <div className="flex items-center gap-5">
            <span
              className="font-bold leading-none select-none"
              style={{
                fontSize: 'clamp(4rem, 8vw, 6.5rem)',
                color: '#F5630F',
                opacity: 0.9,
                letterSpacing: '-0.03em',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {service.number}
            </span>
            {/* Vertical divider */}
            <div className="hidden md:block self-stretch w-px bg-black/8" />
          </div>

          {/* Centre — title + description */}
          <div>
            <h3
              className="font-bold text-[#111111] leading-tight mb-3"
              style={{ fontSize: 'clamp(1.4rem, 2.5vw, 2rem)', letterSpacing: '-0.02em' }}
            >
              {service.title}
            </h3>
            <p className="text-sm md:text-base leading-relaxed" style={{ color: '#888888', maxWidth: 540 }}>
              {service.description}
            </p>
          </div>

          {/* Right — tags */}
          <div className="flex flex-wrap md:flex-col gap-2 md:gap-2 md:items-end">
            {service.tags.map((tag) => (
              <span
                key={tag}
                className="text-[11px] font-semibold px-3 py-1.5 rounded-full whitespace-nowrap"
                style={{
                  border: '1px solid rgba(245,99,15,0.3)',
                  color: '#F5630F',
                  background: 'rgba(245,99,15,0.07)',
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default function ServicesSection() {
  return (
    <section id="services" style={{ background: '#f8f8f8' }}>
      {/* ── Header ── */}
      <Container>
        <div className="pt-24 pb-16 md:pt-32 md:pb-20">
          <SectionHeader
            eyebrow="Our Services"
            title="We build the software that moves your business"
            accentText="forward."
            accentStyle="gradient"
            align="left"
            size="xl"
            headingClassName="max-w-5xl"
            description="From strategy to deployment — end-to-end engineering and digital solutions that deliver measurable results at every stage."
            constrainDescription={false}
          />
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="mt-8"
          >
            <motion.a
              href="#contact"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold text-[#111111] border border-black/15 hover:border-[#F5630F]/60 hover:text-[#F5630F] transition-all duration-300"
            >
              Start a project
              <span className="text-[#F5630F]">→</span>
            </motion.a>
          </motion.div>
        </div>
      </Container>

      {/* ── Stacked service cards ── */}
      <Container className="pb-40">
        <div className="flex flex-col gap-0">
          {services.map((service, index) => (
            <ServiceCard key={service.number} service={service} index={index} />
          ))}
        </div>
      </Container>
    </section>
  )
}
