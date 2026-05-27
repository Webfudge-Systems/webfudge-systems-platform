'use client'

import React from 'react'
import { motion } from 'framer-motion'

interface FeatureCardProps {
  icon: React.ReactNode
  title: string
  description: string
  delay?: number
  className?: string
}

export default function FeatureCard({ icon, title, description, delay = 0, className = '' }: FeatureCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -6, transition: { duration: 0.3 } }}
      className={`group relative bg-white border border-[rgba(0,0,0,0.08)] rounded-[28px] p-8 transition-all duration-300 hover:border-orange-200 hover:shadow-[0_20px_60px_rgba(245,99,15,0.12)] cursor-default ${className}`}
    >
      {/* Subtle gradient on hover */}
      <div className="absolute inset-0 rounded-[28px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at top left, rgba(245,99,15,0.04) 0%, transparent 60%)' }}
      />

      <div className="relative z-10">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-all duration-300 group-hover:scale-110"
          style={{ background: 'linear-gradient(135deg, rgba(245,99,15,0.1), rgba(255,140,66,0.06))' }}
        >
          <div className="text-[#F5630F]">{icon}</div>
        </div>

        <h3 className="text-lg font-bold text-[#111111] mb-3 group-hover:text-[#F5630F] transition-colors duration-300">
          {title}
        </h3>
        <p className="text-[#666666] text-sm leading-relaxed">
          {description}
        </p>
      </div>

      {/* Arrow on hover */}
      <motion.div
        className="absolute bottom-6 right-6 w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300"
        style={{ background: 'linear-gradient(135deg, #F5630F, #ff8c42)' }}
        initial={false}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2.5 9.5L9.5 2.5M9.5 2.5H4M9.5 2.5V8" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </motion.div>
    </motion.div>
  )
}
