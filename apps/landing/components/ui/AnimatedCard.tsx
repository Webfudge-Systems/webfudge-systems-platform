'use client'

import React from 'react'
import { motion } from 'framer-motion'

interface AnimatedCardProps {
  children: React.ReactNode
  className?: string
  delay?: number
  hover?: boolean
}

export default function AnimatedCard({ children, className = '', delay = 0, hover = true }: AnimatedCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={hover ? { y: -8, transition: { duration: 0.3 } } : undefined}
      className={className}
    >
      {children}
    </motion.div>
  )
}
