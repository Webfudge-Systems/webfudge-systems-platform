'use client'

import React from 'react'
import { motion } from 'framer-motion'

interface SectionHeadingProps {
  eyebrow?: string
  title: string
  accentTitle?: string
  subtitle?: string
  align?: 'left' | 'center' | 'right'
  dark?: boolean
  className?: string
}

export default function SectionHeading({
  eyebrow,
  title,
  accentTitle,
  subtitle,
  align = 'center',
  dark = false,
  className = '',
}: SectionHeadingProps) {
  const alignClasses = {
    left: 'text-left items-start',
    center: 'text-center items-center',
    right: 'text-right items-end',
  }

  return (
    <motion.div
      className={`flex flex-col gap-4 ${alignClasses[align]} ${className}`}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
    >
      {eyebrow && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold tracking-widest uppercase
            ${dark
              ? 'bg-white/10 text-orange-400 border border-white/10'
              : 'bg-orange-50 text-[#F5630F] border border-orange-100'
            }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#F5630F] inline-block" />
          {eyebrow}
        </motion.div>
      )}

      <h2
        className={`text-4xl md:text-5xl font-bold tracking-tight leading-[1.1]
          ${dark ? 'text-white' : 'text-[#111111]'}`}
      >
        {title}
        {accentTitle && (
          <>
            {' '}
            <span
              style={{
                background: 'linear-gradient(135deg, #F5630F, #ff8c42)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {accentTitle}
            </span>
          </>
        )}
      </h2>

      {subtitle && (
        <p
          className={`text-base md:text-lg max-w-2xl leading-relaxed
            ${dark ? 'text-white/60' : 'text-[#666666]'}`}
        >
          {subtitle}
        </p>
      )}
    </motion.div>
  )
}
