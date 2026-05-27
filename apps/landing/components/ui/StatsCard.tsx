'use client'

import React, { useEffect, useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'

interface StatsCardProps {
  value: number
  suffix?: string
  prefix?: string
  label: string
  delay?: number
  dark?: boolean
}

function useCountUp(target: number, duration: number = 2, isActive: boolean) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!isActive) return

    let startTime: number | null = null
    let frame: number

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.floor(eased * target))

      if (progress < 1) {
        frame = requestAnimationFrame(animate)
      }
    }

    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [target, duration, isActive])

  return count
}

export default function StatsCard({ value, suffix = '', prefix = '', label, delay = 0, dark = false }: StatsCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })
  const count = useCountUp(value, 2, isInView)

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={`text-center p-8 rounded-[28px] ${
        dark
          ? 'bg-white/5 border border-white/8'
          : 'bg-white border border-[rgba(0,0,0,0.08)] shadow-soft'
      }`}
    >
      <div className="flex items-end justify-center gap-1 mb-3">
        {prefix && (
          <span className={`text-3xl font-bold ${dark ? 'text-white/70' : 'text-[#444444]'}`}>
            {prefix}
          </span>
        )}
        <span
          className="text-5xl md:text-6xl font-bold leading-none"
          style={{
            background: 'linear-gradient(135deg, #F5630F, #ff8c42)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          {count}
        </span>
        {suffix && (
          <span
            className="text-4xl font-bold leading-none"
            style={{
              background: 'linear-gradient(135deg, #F5630F, #ff8c42)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            {suffix}
          </span>
        )}
      </div>
      <p className={`text-sm font-semibold tracking-wide uppercase ${dark ? 'text-white/50' : 'text-[#888888]'}`}>
        {label}
      </p>
    </motion.div>
  )
}
