'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, ArrowRight } from 'lucide-react'
import Container from '../../ui/Container'

/* ── SVG noise filter (inlined so no external asset needed) ── */
function NoiseSVG() {
  return (
    <svg width="0" height="0" className="absolute">
      <filter id="contact-noise">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.65"
          numOctaves="3"
          stitchTiles="stitch"
        />
        <feColorMatrix type="saturate" values="0" />
        <feBlend in="SourceGraphic" mode="multiply" result="blend" />
        <feComposite in="blend" in2="SourceGraphic" operator="in" />
      </filter>
    </svg>
  )
}

export default function ContactSection() {
  const [form, setForm] = useState({ name: '', company: '', email: '' })
  const [agreed, setAgreed] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [focused, setFocused] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!agreed) return
    setSubmitted(true)
  }

  const fields = [
    { key: 'name',    type: 'text',  placeholder: 'Full Name',   required: true  },
    { key: 'company', type: 'text',  placeholder: 'Company',     required: false },
    { key: 'email',   type: 'email', placeholder: 'Work Email',  required: true  },
  ] as const

  return (
    <section
      id="contact"
      className="relative py-28 md:py-36 overflow-hidden"
      style={{ background: '#E8E8E6' }}
    >
      {/* ── Noise layer ── */}
      <NoiseSVG />
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '200px 200px',
          opacity: 0.045,
          mixBlendMode: 'multiply',
        }}
      />

      {/* ── Top-left warm glow ── */}
      <div
        className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full pointer-events-none z-0"
        style={{
          background:
            'radial-gradient(circle, rgba(245,99,15,0.13) 0%, rgba(245,99,15,0.04) 50%, transparent 75%)',
          filter: 'blur(60px)',
        }}
      />

      {/* ── Bottom-right cool glow ── */}
      <div
        className="absolute -bottom-40 -right-40 w-[700px] h-[700px] rounded-full pointer-events-none z-0"
        style={{
          background:
            'radial-gradient(circle, rgba(17,17,17,0.09) 0%, rgba(17,17,17,0.03) 50%, transparent 75%)',
          filter: 'blur(80px)',
        }}
      />

      {/* ── Corner accent – top-right ── */}
      <div
        className="absolute top-0 right-0 w-72 h-72 pointer-events-none z-0"
        style={{
          background:
            'radial-gradient(ellipse at top right, rgba(245,99,15,0.10) 0%, transparent 65%)',
        }}
      />

      {/* ── Corner accent – bottom-left ── */}
      <div
        className="absolute bottom-0 left-0 w-64 h-64 pointer-events-none z-0"
        style={{
          background:
            'radial-gradient(ellipse at bottom left, rgba(245,99,15,0.07) 0%, transparent 65%)',
        }}
      />

      {/* ── Top edge line ── */}
      <div
        className="absolute top-0 left-0 right-0 h-px pointer-events-none z-0"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, rgba(245,99,15,0.25) 30%, rgba(245,99,15,0.45) 50%, rgba(245,99,15,0.25) 70%, transparent 100%)',
        }}
      />

      <Container className="relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1px_1fr] gap-0 items-center">

          {/* ── LEFT ── */}
          <div className="pr-0 lg:pr-16 pb-14 lg:pb-0">

            {/* Eyebrow */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="inline-flex items-center gap-2 mb-6"
            >
              <span
                className="px-4 py-1.5 rounded-full text-[11px] font-semibold tracking-[0.18em] uppercase"
                style={{
                  background: 'rgba(245,99,15,0.1)',
                  color: '#F5630F',
                  border: '1px solid rgba(245,99,15,0.2)',
                }}
              >
                Get in Touch
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h2
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="font-bold leading-[1.0] tracking-tight text-[#111111]"
              style={{ fontSize: 'clamp(52px, 7vw, 88px)' }}
            >
              Let&apos;s get
              <br />
              <span
                style={{
                  background: 'linear-gradient(135deg, #F5630F 0%, #ff8c42 55%, #F5630F 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                started
              </span>
              <span style={{ color: '#F5630F' }}>.</span>
            </motion.h2>

            {/* Sub-copy */}
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="mt-6 text-base text-[#555555] leading-relaxed max-w-xs"
            >
              Tell us about your project and we&apos;ll get back to you within 24 hours.
            </motion.p>

            {/* Email */}
            <motion.a
              href="mailto:hello@webfudgesystems.in"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="inline-flex items-center gap-2 mt-8 text-sm font-medium text-[#333333] hover:text-[#F5630F] transition-colors duration-300 group"
            >
              <span
                className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-colors duration-300"
                style={{ background: 'rgba(245,99,15,0.1)' }}
              >
                <ArrowRight size={13} className="text-[#F5630F]" />
              </span>
              hello@webfudgesystems.in
            </motion.a>
          </div>

          {/* ── DIVIDER ── */}
          <div
            className="hidden lg:block w-px self-stretch mx-0"
            style={{
              background:
                'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.1) 20%, rgba(0,0,0,0.13) 50%, rgba(0,0,0,0.1) 80%, transparent 100%)',
            }}
          />

          {/* ── RIGHT — Form ── */}
          <motion.div
            className="pl-0 lg:pl-16 pt-14 lg:pt-0"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            {submitted ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-start gap-5 py-10"
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{ background: 'rgba(245,99,15,0.12)', border: '1px solid rgba(245,99,15,0.25)' }}
                >
                  <Check size={22} style={{ color: '#F5630F' }} />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-[#111111]">We&apos;ll be in touch!</h3>
                  <p className="text-[#666666] text-sm leading-relaxed mt-2 max-w-xs">
                    Thanks for reaching out. Our team will review your request and respond within 24 hours.
                  </p>
                </div>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <p className="text-xs font-semibold tracking-[0.14em] uppercase text-[#888888] mb-3">
                  Learn how Webfudge can help your business
                </p>

                {fields.map(({ key, type, placeholder, required }, i) => (
                  <motion.div
                    key={key}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.45, delay: 0.1 + i * 0.07, ease: [0.22, 1, 0.36, 1] }}
                    className="relative"
                  >
                    <input
                      type={type}
                      required={required}
                      value={form[key]}
                      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                      onFocus={() => setFocused(key)}
                      onBlur={() => setFocused(null)}
                      placeholder={placeholder}
                      className="w-full px-5 py-4 rounded-2xl text-sm text-[#111111] placeholder:text-[#aaaaaa] outline-none transition-all duration-300"
                      style={{
                        background: focused === key ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.65)',
                        border: focused === key
                          ? '1.5px solid rgba(245,99,15,0.55)'
                          : '1.5px solid rgba(0,0,0,0.1)',
                        boxShadow: focused === key
                          ? '0 0 0 4px rgba(245,99,15,0.08), 0 2px 12px rgba(0,0,0,0.06)'
                          : '0 1px 4px rgba(0,0,0,0.04)',
                        backdropFilter: 'blur(8px)',
                      }}
                    />
                  </motion.div>
                ))}

                {/* CTA Button */}
                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.015, boxShadow: '0 12px 32px rgba(17,17,17,0.22)' }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full mt-2 py-4 rounded-2xl font-semibold text-sm text-white relative overflow-hidden group"
                  style={{
                    background: 'linear-gradient(135deg, #1a1a1a 0%, #111111 100%)',
                    boxShadow: '0 4px 20px rgba(17,17,17,0.15)',
                  }}
                >
                  {/* Subtle sheen on hover */}
                  <span
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                    style={{
                      background:
                        'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.07) 50%, transparent 60%)',
                    }}
                  />
                  <span className="relative flex items-center justify-center gap-2">
                    Request a Call
                    <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-0.5" />
                  </span>
                </motion.button>

                {/* Privacy checkbox */}
                <div className="flex items-center gap-2.5 mt-1 cursor-pointer select-none" onClick={() => setAgreed(!agreed)}>
                  <span
                    className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-all duration-200"
                    style={{
                      background: agreed ? '#111111' : 'rgba(255,255,255,0.8)',
                      border: agreed ? '1.5px solid #111111' : '1.5px solid rgba(0,0,0,0.18)',
                    }}
                  >
                    {agreed && <Check size={9} className="text-white" strokeWidth={3} />}
                  </span>
                  <span className="text-[11px] text-[#888888] leading-snug">
                    By clicking the button, I agree to the{' '}
                    <a
                      href="#"
                      onClick={(e) => e.stopPropagation()}
                      className="underline underline-offset-2 hover:text-[#F5630F] transition-colors"
                    >
                      privacy policy
                    </a>
                  </span>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      </Container>
    </section>
  )
}
