'use client'

import React from 'react'
import { motion } from 'framer-motion'

// ─── Types ────────────────────────────────────────────────────────────────────

type Align = 'left' | 'center' | 'right'
type Size  = 'sm' | 'md' | 'lg' | 'xl'
type Theme = 'light' | 'dark'

/**
 * Inline accent options for words inside the heading.
 * - gradient  → brand orange gradient fill
 * - italic    → Playfair Display italic (editorial tone)
 * - underline → animated brand-orange underline
 */
type AccentStyle = 'gradient' | 'italic' | 'underline'

export interface SectionHeaderProps {
  /** Small badge above the heading */
  eyebrow?: string
  /** Custom icon/node shown before the eyebrow text */
  eyebrowIcon?: React.ReactNode
  /** Main heading text */
  title: string
  /**
   * Word(s) at the *end* of the title to render with accent styling.
   * The component appends these after `title` with a space.
   */
  accentText?: string
  /** How the accent is rendered */
  accentStyle?: AccentStyle
  /** Paragraph below the heading */
  description?: string
  /** Horizontal alignment */
  align?: Align
  /** Controls heading font-size scale */
  size?: Size
  /** Light (default) or dark background context */
  theme?: Theme
  /** Show a subtle decorative line below the eyebrow */
  decorativeLine?: boolean
  /** Extra class names forwarded to the root wrapper */
  className?: string
  /** Extra class names forwarded to the heading element */
  headingClassName?: string
  /** Cap the description width (default: true) */
  constrainDescription?: boolean
}

// ─── Style maps ───────────────────────────────────────────────────────────────

const alignClass: Record<Align, string> = {
  left:   'items-start text-left',
  center: 'items-center text-center',
  right:  'items-end text-right',
}

const headingSize: Record<Size, string> = {
  sm: 'text-2xl md:text-3xl',
  md: 'text-3xl md:text-4xl',
  lg: 'text-4xl md:text-5xl',
  xl: 'text-5xl md:text-6xl lg:text-7xl',
}

const descSize: Record<Size, string> = {
  sm: 'text-sm md:text-base',
  md: 'text-base md:text-lg',
  lg: 'text-base md:text-lg',
  xl: 'text-lg md:text-xl',
}

// ─── Animation variants ───────────────────────────────────────────────────────

const EASE = [0.22, 1, 0.36, 1] as const

const fadeUp = (delay = 0) => ({
  initial:    { opacity: 0, y: 24 },
  whileInView:{ opacity: 1, y: 0  },
  viewport:   { once: true, margin: '-60px' },
  transition: { duration: 0.7, delay, ease: EASE },
})

// ─── Sub-components ───────────────────────────────────────────────────────────

function EyebrowBadge({
  text,
  icon,
  theme,
}: {
  text: string
  icon?: React.ReactNode
  theme: Theme
}) {
  return (
    <motion.div {...fadeUp(0)} className="inline-flex">
      <span
        className={[
          'inline-flex items-center gap-2 px-4 py-1.5 rounded-full',
          'text-[11px] font-semibold tracking-[0.18em] uppercase',
          theme === 'dark'
            ? 'bg-white/[0.08] text-orange-400 border border-white/10'
            : 'bg-orange-50 text-[#F5630F] border border-orange-100',
        ].join(' ')}
      >
        {icon ?? <span className="w-1.5 h-1.5 rounded-full bg-brand flex-shrink-0" />}
        {text}
      </span>
    </motion.div>
  )
}

function DecorativeLine({ theme }: { theme: Theme }) {
  return (
    <motion.div
      className="flex items-center gap-3 w-full max-w-[160px]"
      initial={{ opacity: 0, scaleX: 0 }}
      whileInView={{ opacity: 1, scaleX: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: 0.15, ease: EASE }}
      style={{ transformOrigin: 'left' }}
    >
      <div
        className="h-px flex-1 rounded-full"
        style={{
          background: theme === 'dark'
            ? 'linear-gradient(90deg, rgba(245,99,15,0.7), transparent)'
            : 'linear-gradient(90deg, #F5630F, rgba(245,99,15,0.15))',
        }}
      />
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ background: '#F5630F' }}
      />
    </motion.div>
  )
}

function AccentSpan({
  text,
  accentStyle,
}: {
  text: string
  accentStyle: AccentStyle
}) {
  if (accentStyle === 'gradient') {
    return (
      <span
        style={{
          background: 'linear-gradient(135deg, #F5630F 0%, #ff8c42 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        {text}
      </span>
    )
  }

  if (accentStyle === 'italic') {
    return (
      <em
        className="font-instrument-serif not-italic"
        style={{
          fontFamily: '"Instrument Serif", "Playfair Display", Georgia, serif',
          fontStyle: 'italic',
        }}
      >
        {text}
      </em>
    )
  }

  // underline
  return (
    <span className="relative inline-block">
      {text}
      <motion.span
        className="absolute -bottom-1 left-0 h-[3px] rounded-full"
        style={{ background: 'linear-gradient(90deg, #F5630F, #ff8c42)' }}
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.5, ease: EASE }}
        aria-hidden
      />
    </span>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SectionHeader({
  eyebrow,
  eyebrowIcon,
  title,
  accentText,
  accentStyle = 'gradient',
  description,
  align = 'center',
  size = 'lg',
  theme = 'light',
  decorativeLine = false,
  className = '',
  headingClassName = '',
  constrainDescription = true,
}: SectionHeaderProps) {
  const titleColor = theme === 'dark' ? 'text-white' : 'text-[#111111]'
  const descColor  = theme === 'dark' ? 'text-white/55' : 'text-[#666666]'

  return (
    <div className={`flex flex-col gap-4 ${alignClass[align]} ${className}`}>

      {/* Eyebrow */}
      {eyebrow && (
        <EyebrowBadge text={eyebrow} icon={eyebrowIcon} theme={theme} />
      )}

      {/* Decorative line (optional, shown below eyebrow) */}
      {decorativeLine && (
        <DecorativeLine theme={theme} />
      )}

      {/* Heading */}
      <motion.h2
        {...fadeUp(eyebrow ? 0.1 : 0)}
        className={[
          headingSize[size],
          'font-bold tracking-tight leading-[1.08]',
          titleColor,
          headingClassName,
        ].join(' ')}
      >
        {title}
        {accentText && (
          <>
            {' '}
            <AccentSpan text={accentText} accentStyle={accentStyle} />
          </>
        )}
      </motion.h2>

      {/* Description */}
      {description && (
        <motion.p
          {...fadeUp(eyebrow ? 0.2 : 0.1)}
          className={[
            descSize[size],
            'leading-relaxed',
            constrainDescription ? 'max-w-2xl' : '',
            descColor,
          ].join(' ')}
        >
          {description}
        </motion.p>
      )}
    </div>
  )
}
