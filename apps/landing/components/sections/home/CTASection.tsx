'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Calendar, Check } from 'lucide-react'
import Container from '../../ui/Container'
import { ctaContent } from '../../../data/site'

const TRUST_ITEMS = [
  'Free Consultation',
  'Affordable Pricing',
  'Dedicated Project Manager',
  'Long-term Support',
]

export default function CTASection() {
  return (
    <section className="py-16 sm:py-24 md:py-32 bg-[#fafafa]">
      <Container>
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
          className="relative rounded-2xl sm:rounded-[28px] md:rounded-[36px] overflow-hidden px-5 py-14 sm:px-8 sm:py-20 md:px-20 md:py-28 text-center"
          style={{
            background: 'linear-gradient(135deg, #F5630F 0%, #e84e00 40%, #ff8c42 100%)',
          }}
        >
          {/* Subtle grid overlay */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.055) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.055) 1px, transparent 1px)',
              backgroundSize: '48px 48px',
            }}
          />

          {/* Ambient glows */}
          <div
            className="absolute -top-32 left-1/4 w-[500px] h-[500px] rounded-full pointer-events-none"
            style={{
              background: 'radial-gradient(circle, rgba(255,255,255,0.14) 0%, transparent 65%)',
              filter: 'blur(50px)',
            }}
          />
          <div
            className="absolute -bottom-32 right-1/4 w-[400px] h-[400px] rounded-full pointer-events-none"
            style={{
              background: 'radial-gradient(circle, rgba(0,0,0,0.12) 0%, transparent 65%)',
              filter: 'blur(50px)',
            }}
          />

          {/* Decorative rings — top-right corner */}
          <div className="absolute top-8 right-8 pointer-events-none opacity-20 hidden md:block">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="absolute rounded-full border border-white"
                style={{
                  width: 80 + i * 52,
                  height: 80 + i * 52,
                  top: -(i * 26),
                  right: -(i * 26),
                  opacity: 1 - i * 0.28,
                }}
              />
            ))}
          </div>

          {/* Decorative rings — bottom-left corner */}
          <div className="absolute bottom-8 left-8 pointer-events-none opacity-20 hidden md:block">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="absolute rounded-full border border-white"
                style={{
                  width: 64 + i * 44,
                  height: 64 + i * 44,
                  bottom: -(i * 22),
                  left: -(i * 22),
                  opacity: 1 - i * 0.28,
                }}
              />
            ))}
          </div>

          {/* Content */}
          <div className="relative z-10 flex flex-col items-center">

            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.15, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-full mb-9"
              style={{
                background: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.28)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              <span className="text-white text-[11px] font-semibold tracking-[0.18em] uppercase">
                Get Started Today
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h2
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.25, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="font-bold text-white leading-[1.05] tracking-tight mb-6 max-w-3xl"
              style={{ fontSize: 'clamp(1.75rem, 7vw, 4.5rem)' }}
            >
              {ctaContent.headline}
              <br />
              <span className="font-playfair italic opacity-90">{ctaContent.headlineAccent}</span>
            </motion.h2>

            {/* Sub-copy */}
            <motion.p
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.38, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="text-white/70 text-base md:text-lg max-w-lg mx-auto mb-12 leading-relaxed"
            >
              {ctaContent.subcopy}
            </motion.p>

            {/* CTA buttons */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 w-full max-w-md sm:max-w-none mx-auto"
            >
              {/* Primary */}
              <motion.a
                href="#contact"
                className="relative inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-full font-bold text-[#F5630F] text-sm overflow-hidden group w-full sm:w-auto"
                style={{
                  background: '#ffffff',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.9)',
                }}
                whileHover={{ scale: 1.04, y: -2, boxShadow: '0 20px 52px rgba(0,0,0,0.26), inset 0 1px 0 rgba(255,255,255,0.9)' }}
                whileTap={{ scale: 0.97 }}
              >
                {/* Shimmer */}
                <span
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{
                    background: 'linear-gradient(105deg, transparent 35%, rgba(245,99,15,0.08) 50%, transparent 65%)',
                  }}
                />
                <span className="relative">Get Started</span>
                <motion.span
                  className="relative"
                  animate={{ x: [0, 3, 0] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <ArrowRight size={15} />
                </motion.span>
              </motion.a>

              {/* Secondary */}
              <motion.a
                href="#contact"
                className="inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-full font-semibold text-white text-sm transition-all duration-300 w-full sm:w-auto"
                style={{
                  background: 'rgba(255,255,255,0.12)',
                  border: '1.5px solid rgba(255,255,255,0.32)',
                  backdropFilter: 'blur(8px)',
                }}
                whileHover={{
                  scale: 1.03,
                  y: -1,
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  borderColor: 'rgba(255,255,255,0.55)',
                }}
                whileTap={{ scale: 0.97 }}
              >
                <Calendar size={15} className="opacity-80" />
                Book a Consultation
              </motion.a>
            </motion.div>

            {/* Trust indicators */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.68, duration: 0.55 }}
              className="mt-14 flex flex-wrap items-center justify-center gap-x-8 gap-y-3"
            >
              {TRUST_ITEMS.map((item, i) => (
                <motion.div
                  key={item}
                  initial={{ opacity: 0, y: 6 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.7 + i * 0.07 }}
                  className="flex items-center gap-2 text-white/70 text-xs font-medium"
                >
                  <span
                    className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.3)' }}
                  >
                    <Check size={9} strokeWidth={3} className="text-white" />
                  </span>
                  {item}
                </motion.div>
              ))}
            </motion.div>

          </div>
        </motion.div>
      </Container>
    </section>
  )
}
