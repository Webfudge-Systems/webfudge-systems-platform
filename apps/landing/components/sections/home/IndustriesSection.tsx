'use client'

import React from 'react'
import { motion } from 'framer-motion'
import {
  Rocket,
  Building2,
  ShoppingBag,
  HeartPulse,
  GraduationCap,
  Truck,
  Home,
  Briefcase,
} from 'lucide-react'
import Container from '../../ui/Container'
import SectionHeader from '../../ui/SectionHeader'

const industries = [
  {
    name: 'Startups',
    icon: Rocket,
    description:
      'Build lean, scalable software foundations from day one — designed to grow as fast as your business.',
    accent: '#F5630F',
  },
  {
    name: 'Agencies',
    icon: Building2,
    description:
      'Streamline client delivery, project tracking, and team collaboration with agency-focused platforms.',
    accent: '#F5630F',
  },
  {
    name: 'Ecommerce',
    icon: ShoppingBag,
    description:
      'Custom order management, inventory systems, and customer portals built around your store workflow.',
    accent: '#F5630F',
  },
  {
    name: 'Healthcare',
    icon: HeartPulse,
    description:
      'Patient management, clinic scheduling, and operational software designed for modern healthcare teams.',
    accent: '#F5630F',
  },
  {
    name: 'Education',
    icon: GraduationCap,
    description:
      'Learning platforms, student management systems, and admin tools built for educational institutions.',
    accent: '#F5630F',
  },
  {
    name: 'Logistics',
    icon: Truck,
    description:
      'Track shipments, automate dispatch workflows, and gain full operational visibility across your supply chain.',
    accent: '#F5630F',
  },
  {
    name: 'Real Estate',
    icon: Home,
    description:
      'Property management, agent CRM, and lead tracking software tailored for real estate professionals.',
    accent: '#F5630F',
  },
  {
    name: 'Service Businesses',
    icon: Briefcase,
    description:
      'Scheduling, client management, and workflow automation for service-oriented businesses of all sizes.',
    accent: '#F5630F',
  },
]

export default function IndustriesSection() {
  return (
    <section
      id="industries"
      className="py-16 sm:py-24 md:py-32 overflow-hidden"
      style={{ background: '#f8f8f8' }}
    >
      <Container>
        {/* Header */}
        <div className="mb-16 md:mb-20">
          <SectionHeader
            eyebrow="Industries We Serve"
            title="Software built for"
            accentText="every industry."
            accentStyle="gradient"
            description="From startups to enterprises — we build custom software solutions tailored to the unique workflows and challenges of your industry."
            align="left"
            size="xl"
            headingClassName="max-w-4xl"
            constrainDescription={false}
          />
        </div>

        {/* 4×2 grid */}
        <div className="grid grid-cols-1 min-[400px]:grid-cols-2 lg:grid-cols-4 gap-4">
          {industries.map((industry, i) => {
            const Icon = industry.icon
            return (
              <motion.div
                key={industry.name}
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.6, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -6, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } }}
                className="group relative rounded-2xl p-5 sm:p-6 flex flex-col gap-4 sm:gap-5 cursor-default"
                style={{
                  background: '#ffffff',
                  border: '1px solid rgba(0,0,0,0.07)',
                  boxShadow: '0 2px 16px rgba(0,0,0,0.04)',
                }}
              >
                {/* Icon */}
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors duration-300 group-hover:bg-[#F5630F]"
                  style={{ background: 'rgba(245,99,15,0.1)' }}
                >
                  <Icon
                    size={20}
                    className="transition-colors duration-300 group-hover:text-white"
                    style={{ color: '#F5630F' }}
                  />
                </div>

                {/* Content */}
                <div>
                  <h3 className="font-bold text-[#111111] text-base mb-2 leading-tight">
                    {industry.name}
                  </h3>
                  <p className="text-xs leading-relaxed" style={{ color: '#888888' }}>
                    {industry.description}
                  </p>
                </div>

                {/* Hover accent line — bottom */}
                <div
                  className="absolute bottom-0 left-6 right-6 h-px rounded-full scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"
                  style={{ background: 'linear-gradient(90deg, #F5630F, #ff8c42)' }}
                />
              </motion.div>
            )
          })}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="mt-14 flex justify-center"
        >
          <motion.a
            href="#contact"
            whileHover={{ scale: 1.04, y: -2, boxShadow: '0 16px 40px rgba(245,99,15,0.25)' }}
            whileTap={{ scale: 0.97 }}
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, #F5630F, #ff8c42)' }}
          >
            Discuss Your Requirements
            <span className="text-white/80">→</span>
          </motion.a>
        </motion.div>
      </Container>
    </section>
  )
}
