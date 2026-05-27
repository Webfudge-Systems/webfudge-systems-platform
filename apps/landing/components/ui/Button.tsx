'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'

interface ButtonProps {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'ghost' | 'dark'
  size?: 'sm' | 'md' | 'lg'
  arrow?: boolean
  href?: string
  onClick?: () => void
  className?: string
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  arrow = false,
  href,
  onClick,
  className = '',
  type = 'button',
  disabled = false,
}: ButtonProps) {
  const sizeClasses = {
    sm: 'px-4 py-2 text-sm gap-1.5',
    md: 'px-6 py-3 text-sm gap-2',
    lg: 'px-8 py-4 text-base gap-2.5',
  }

  const variantClasses = {
    primary: 'text-white font-semibold rounded-full',
    secondary: 'bg-white text-[#111111] font-semibold rounded-full border border-[rgba(0,0,0,0.12)]',
    ghost: 'text-[#111111] font-medium rounded-full hover:bg-[#f5f5f5]',
    dark: 'bg-white/10 text-white font-semibold rounded-full border border-white/20 backdrop-blur-sm',
  }

  const baseClasses = `inline-flex items-center justify-center transition-all duration-300 cursor-pointer select-none ${sizeClasses[size]} ${variantClasses[variant]} ${className}`

  const primaryStyle =
    variant === 'primary'
      ? {
          background: 'linear-gradient(135deg, #F5630F, #ff8c42)',
        }
      : {}

  const content = (
    <motion.span
      className={baseClasses}
      style={primaryStyle}
      whileHover={{
        y: -2,
        boxShadow:
          variant === 'primary'
            ? '0 12px 35px rgba(245,99,15,0.45)'
            : variant === 'secondary'
            ? '0 8px 30px rgba(0,0,0,0.1)'
            : 'none',
      }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
    >
      {children}
      {arrow && (
        <motion.span
          initial={{ x: 0 }}
          whileHover={{ x: 3 }}
          transition={{ duration: 0.2 }}
          className="inline-flex"
        >
          <ArrowRight size={size === 'sm' ? 14 : size === 'lg' ? 18 : 16} />
        </motion.span>
      )}
    </motion.span>
  )

  if (href) {
    return (
      <a href={href} className="inline-flex">
        {content}
      </a>
    )
  }

  return (
    <button type={type} disabled={disabled} className="inline-flex">
      {content}
    </button>
  )
}
