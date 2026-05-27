'use client'

import React from 'react'
import { motion } from 'framer-motion'
import Container from '../../ui/Container'
import SectionHeader from '../../ui/SectionHeader'

const services = [
  {
    number: '01',
    title: 'Custom Software Development',
    tags: ['Business Workflows', 'Internal Tools', 'Full-Stack'],
    description:
      'Tailored software solutions designed specifically around your business workflows and operational requirements. Built to scale and evolve as your business grows.',
    bg: '#ffffff',
    accentBg: 'rgba(245,99,15,0.05)',
  },
  {
    number: '02',
    title: 'CRM Software Development',
    tags: ['Lead Tracking', 'Sales Management', 'Customer Communication'],
    description:
      'Customer relationship management systems focused on lead tracking, sales management, customer communication, and business growth — built around your exact process.',
    bg: '#fafafa',
    accentBg: 'rgba(245,99,15,0.06)',
  },
  {
    number: '03',
    title: 'Project Management Software',
    tags: ['Task Management', 'Team Collaboration', 'Deadline Tracking'],
    description:
      'Smart project management platforms that help teams manage tasks, workflows, deadlines, and collaboration efficiently — so every project stays on track.',
    bg: '#f7f7f7',
    accentBg: 'rgba(245,99,15,0.05)',
  },
  {
    number: '04',
    title: 'Business Automation Systems',
    tags: ['Workflow Automation', 'ERP & Operations', 'Process Efficiency'],
    description:
      'Automate repetitive processes, improve operational efficiency, and streamline internal workflows with custom automation and ERP systems built for your business.',
    bg: '#f5f5f5',
    accentBg: 'rgba(245,99,15,0.06)',
  },
  {
    number: '05',
    title: 'Dashboard & Admin Panels',
    tags: ['Real-time Analytics', 'Business Controls', 'Modern UI'],
    description:
      'Modern dashboards and management systems with real-time insights, analytics, and business controls — giving you complete visibility across your operations.',
    bg: '#f3f3f3',
    accentBg: 'rgba(245,99,15,0.05)',
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
      className="lg:sticky"
      style={{
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
          minHeight: 280,
        }}
      >
        {/* Subtle radial accent behind number */}
        <div
          className="absolute top-0 left-0 w-72 h-full pointer-events-none"
          style={{ background: `radial-gradient(ellipse at left center, ${service.accentBg} 0%, transparent 70%)` }}
        />

        <div className="relative z-10 grid grid-cols-1 md:grid-cols-[220px_1fr_auto] gap-5 sm:gap-8 p-5 sm:p-8 md:p-10 lg:p-12 items-start md:items-center">

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
        <div className="pt-16 pb-10 sm:pt-24 sm:pb-16 md:pt-32 md:pb-20">
          <SectionHeader
            eyebrow="Our Services"
            title="Software solutions designed around your"
            accentText="business."
            accentStyle="gradient"
            align="left"
            size="xl"
            headingClassName="max-w-5xl"
            description="From CRM platforms to project management systems and custom business software — scalable, affordable, and easy-to-use solutions built for your requirements."
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
      <Container className="pb-16 sm:pb-24 lg:pb-40">
        <div className="flex flex-col gap-4 lg:gap-0">
          {services.map((service, index) => (
            <ServiceCard key={service.number} service={service} index={index} />
          ))}
        </div>
      </Container>
    </section>
  )
}
