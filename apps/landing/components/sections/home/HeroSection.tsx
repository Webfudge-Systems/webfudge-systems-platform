'use client'

import React, { useEffect, useRef } from 'react'
import { motion, useMotionValue, useTransform } from 'framer-motion'
import { ArrowRight, Play } from 'lucide-react'
import Image from 'next/image'
import ClientLogoStrip from './ClientLogoStrip'
import { heroContent } from '../../../data/site'

/* ─── Animated blobs — tuned for the orange brand background ── */
function AnimatedBlobs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Faint ember glow — top center */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 600,
          height: 600,
          top: '-10%',
          left: '30%',
          background: 'radial-gradient(circle, rgba(245,99,15,0.08) 0%, transparent 65%)',
          filter: 'blur(60px)',
        }}
        animate={{ x: [0, 50, -40, 0], y: [0, -30, 50, 0], scale: [1, 1.08, 0.94, 1] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Brand orange bloom — bottom */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 900,
          height: 500,
          bottom: '-10%',
          left: '50%',
          transform: 'translateX(-50%)',
          background:
            'radial-gradient(ellipse, rgba(245,99,15,0.55) 0%, rgba(245,99,15,0.2) 40%, transparent 70%)',
          filter: 'blur(60px)',
        }}
        animate={{ scaleX: [1, 1.12, 0.92, 1], opacity: [0.8, 1, 0.8] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Deep red mid accent */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 400,
          height: 400,
          top: '40%',
          right: '10%',
          background: 'radial-gradient(circle, rgba(200,50,0,0.18) 0%, transparent 65%)',
          filter: 'blur(40px)',
        }}
        animate={{ x: [0, -60, 50, 0], y: [0, -50, 40, 0], scale: [1, 1.1, 0.9, 1] }}
        transition={{ duration: 24, repeat: Infinity, ease: 'easeInOut', delay: 5 }}
      />
    </div>
  )
}

export default function HeroSection() {
  const containerRef = useRef<HTMLDivElement>(null)
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const spotlightX = useTransform(mouseX, (v) => `${v}px`)
  const spotlightY = useTransform(mouseY, (v) => `${v}px`)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      mouseX.set(e.clientX - rect.left)
      mouseY.set(e.clientY - rect.top)
    }
    const el = containerRef.current
    el?.addEventListener('mousemove', handleMouseMove)
    return () => el?.removeEventListener('mousemove', handleMouseMove)
  }, [mouseX, mouseY])

  return (
    <section
      id="home"
      ref={containerRef}
      className="relative flex flex-col overflow-hidden"
      style={{
        background:
          'linear-gradient(180deg, #0a0a0a 0%, #0f0805 35%, #2a1000 60%, #7a2e00 82%, #F5630F 100%)',
      }}
    >
      {/* Animated blobs */}
      <AnimatedBlobs />

      {/* Subtle grid */}
      <div className="absolute inset-0 grid-pattern opacity-40" />

      {/* Mouse spotlight — subtle warm brighten */}
      <motion.div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          background: `radial-gradient(400px circle at ${spotlightX} ${spotlightY}, rgba(245,99,15,0.07), transparent 55%)`,
        }}
      />

      {/* Navbar spacer */}
      <div className="h-20 md:h-24 flex-shrink-0" />

      {/* ── Main content — centered ── */}
      <div className="relative z-10 mx-auto px-4 sm:px-6 lg:px-8 max-w-[1400px] w-full flex flex-col items-center text-center">
        {/* ── HEADLINE — single line, center ── */}
        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="font-extrabold leading-[1.05] sm:leading-tight tracking-tight text-white mb-4 sm:mb-5 px-1"
          style={{ fontSize: 'clamp(1.75rem, 7vw, 6.5rem)' }}
        >
          {heroContent.headline}
          <br />
          <span
            style={{
              background: 'linear-gradient(135deg, #ffffff 0%, #ffd4b0 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            {heroContent.headlineAccent}
          </span>
        </motion.h1>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.38 }}
          className="text-white/65 text-sm sm:text-base leading-relaxed max-w-xl mb-7 sm:mb-9 px-2"
        >
          {heroContent.description}
        </motion.p>

        {/* CTAs — centered */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-center gap-3 sm:gap-4 mb-10 sm:mb-14 md:mb-16 w-full max-w-sm sm:max-w-none px-2"
        >
          <motion.a
            href="#contact"
            className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full text-sm font-semibold bg-white text-[#F5630F] w-full sm:w-auto"
            whileHover={{ scale: 1.04, y: -2, boxShadow: '0 16px 40px rgba(0,0,0,0.25)' }}
            whileTap={{ scale: 0.97 }}
          >
            Get Started
            <motion.span
              animate={{ x: [0, 3, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <ArrowRight size={15} />
            </motion.span>
          </motion.a>

          <motion.a
            href="#contact"
            className="inline-flex items-center justify-center gap-2 text-sm font-medium text-white/70 hover:text-white transition-colors w-full sm:w-auto py-2"
            whileHover={{ x: 3 }}
          >
            <Play size={12} fill="currentColor" />
            Book a Consultation
          </motion.a>
        </motion.div>

        {/* ── APP SCREENSHOT — full width, flush bottom ── */}
        <motion.div
          initial={{ opacity: 0, y: 70 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.1, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full"
        >
          {/* Ambient glow behind screenshot */}
          <div
            className="absolute inset-x-1/4 -top-6 h-16 pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse at center, rgba(255,200,120,0.4) 0%, transparent 70%)',
              filter: 'blur(30px)',
            }}
          />

          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          >
            <div
              className="relative rounded-t-2xl overflow-hidden"
              style={{
                boxShadow: '0 -20px 80px rgba(255,180,80,0.2), 0 0 0 1px rgba(255,200,120,0.2)',
              }}
            >
              {/* Top edge glow line */}
              <div
                className="absolute top-0 left-0 right-0 h-px z-20"
                style={{
                  background:
                    'linear-gradient(90deg, transparent 5%, rgba(255,200,120,0.6) 25%, rgba(255,255,255,0.9) 50%, rgba(255,200,120,0.6) 75%, transparent 95%)',
                }}
              />

              {/* Inner top glow */}
              <div
                className="absolute top-0 left-0 right-0 h-20 z-20 pointer-events-none"
                style={{
                  background: 'linear-gradient(180deg, rgba(255,150,60,0.12) 0%, transparent 100%)',
                }}
              />

              <Image
                src="/images/ws-pm.png"
                alt="Webfudge PM Dashboard"
                width={1400}
                height={875}
                className="w-full h-auto block"
                priority
              />
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* ── CLIENT LOGO STRIP — dark variant at bottom ── */}
      {/* <div className="relative z-10 w-full border-t border-white/[0.08]">
        <ClientLogoStrip dark />
      </div> */}
    </section>
  )
}
