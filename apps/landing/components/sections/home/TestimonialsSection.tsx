'use client'

import React from 'react'
import { Star } from 'lucide-react'
import SectionHeader from '../../ui/SectionHeader'
import Container from '../../ui/Container'

// ─── Data ─────────────────────────────────────────────────────────────────────

const testimonials = [
  {
    name: 'Arjun Sharma',
    role: 'CEO, NexaGrowth',
    avatar: 'AS',
    color: '#F5630F',
    rating: 5,
    feedback:
      'Webfudge transformed our operations. The custom CRM reduced our sales cycle by 40% and gave us real-time visibility we never had before.',
    metric: '40% faster sales cycle',
  },
  {
    name: 'Priya Nair',
    role: 'Founder, CloudStack SaaS',
    avatar: 'PN',
    color: '#8B5CF6',
    rating: 5,
    feedback:
      'They helped us architect the entire platform and launched our SaaS product in just 4 months. Quality that feels like a 50-person team.',
    metric: 'Launched in 4 months',
  },
  {
    name: 'Rahul Mehta',
    role: 'Head of Technology, TechForge',
    avatar: 'RM',
    color: '#3B82F6',
    rating: 5,
    feedback:
      "Webfudge rebuilt our legacy platform, automated half our manual processes, and improved performance by 10x. Best tech investment we've made.",
    metric: '10x performance boost',
  },
  {
    name: 'Sneha Kulkarni',
    role: 'Product Manager, RetailEdge',
    avatar: 'SK',
    color: '#22C55E',
    rating: 5,
    feedback:
      'Our customer portal saw a 65% increase in engagement within the first month. Design + engineering — a rare combination.',
    metric: '65% engagement increase',
  },
  {
    name: 'Vikram Singh',
    role: 'Operations Director, LogiTrack',
    avatar: 'VS',
    color: '#F59E0B',
    rating: 5,
    feedback:
      'Their automation platform processes 10,000+ logistics events per day. AI integrations have saved us 200+ hours of manual work per week.',
    metric: '200+ hours saved weekly',
  },
  {
    name: 'Aisha Patel',
    role: 'CTO, FinBridge Capital',
    avatar: 'AP',
    color: '#EC4899',
    rating: 5,
    feedback:
      'The fintech dashboard handles real-time data for thousands of users flawlessly. Exceptional attention to security, performance, and UX.',
    metric: '99.9% uptime achieved',
  },
  {
    name: 'Rohan Verma',
    role: 'Co-Founder, EdTech Nexus',
    avatar: 'RV',
    color: '#14B8A6',
    rating: 5,
    feedback:
      "From concept to launch in 90 days. The team's ability to move fast without sacrificing quality is remarkable. 50,000+ students served.",
    metric: '50K+ active students',
  },
  {
    name: 'Meera Joshi',
    role: 'VP Engineering, DataPulse AI',
    avatar: 'MJ',
    color: '#6366F1',
    rating: 5,
    feedback:
      'Webfudge integrated complex ML pipelines into our product seamlessly. They understood our technical requirements deeply.',
    metric: '3x model inference speed',
  },
]

// ─── Card ─────────────────────────────────────────────────────────────────────

function TestimonialCard({ t }: { t: (typeof testimonials)[number] }) {
  return (
    <div
      className="relative flex-shrink-0 w-[380px] h-[430px] rounded-[28px] mx-3 p-8 flex flex-col justify-between overflow-hidden"
      style={{
        background: '#141414',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Stars */}
      <div className="flex gap-1">
        {[...Array(t.rating)].map((_, i) => (
          <Star key={i} size={12} fill="#F5630F" className="text-brand" />
        ))}
      </div>

      {/* Quote */}
      <p className="text-[22px] text-white/95 leading-relaxed font-medium flex-1 pt-4 pb-5">
        &ldquo;{t.feedback}&rdquo;
      </p>

      {/* Author row */}
      <div className="flex items-center gap-3">
        {/* <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-[11px] flex-shrink-0"
          style={{
            background: `linear-gradient(135deg, ${t.color}cc, ${t.color}66)`,
          }}
        >
          {t.avatar}
        </div> */}
        <div>
          <div className="text-[13px] font-semibold text-white leading-tight">{t.name}</div>
          <div className="text-[11px] text-white/40 mt-0.5">{t.role}</div>
        </div>
        <div className="ml-auto text-[10px] font-semibold px-2.5 py-1 rounded-full flex-shrink-0 text-brand-light bg-brand-dark/30 ">
          {t.metric}
        </div>
      </div>
    </div>
  )
}

// ─── Marquee track ────────────────────────────────────────────────────────────

function MarqueeRow({ speed = 45 }: { speed?: number }) {
  const doubled = [...testimonials, ...testimonials]

  return (
    <div className="overflow-hidden">
      <div
        className="flex"
        style={{
          animation: `marquee-left ${speed}s linear infinite`,
          width: 'max-content',
        }}
        onMouseEnter={(e) => {
          ;(e.currentTarget as HTMLDivElement).style.animationPlayState = 'paused'
        }}
        onMouseLeave={(e) => {
          ;(e.currentTarget as HTMLDivElement).style.animationPlayState = 'running'
        }}
      >
        {doubled.map((t, i) => (
          <TestimonialCard key={`${t.name}-${i}`} t={t} />
        ))}
      </div>
    </div>
  )
}

// ─── Section ──────────────────────────────────────────────────────────────────

export default function TestimonialsSection() {
  return (
    <section className="relative py-28 md:py-36 overflow-hidden" style={{ background: '#080808' }}>
      {/* Noise texture overlay */}
      <div
        className="absolute inset-0 pointer-events-none z-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundSize: '200px 200px',
        }}
      />

      {/* Corner glow — top-left */}
      <div
        className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full pointer-events-none z-0"
        style={{
          background: 'radial-gradient(circle, rgba(245,99,15,0.18) 0%, transparent 65%)',
        }}
      />

      {/* Corner glow — bottom-right */}
      <div
        className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full pointer-events-none z-0"
        style={{
          background: 'radial-gradient(circle, rgba(245,99,15,0.12) 0%, transparent 65%)',
        }}
      />

      <div className="relative z-10">
        <Container>
          <div className="mb-20">
            <SectionHeader
              eyebrow="Client Stories"
              title="Trusted by"
              accentText="Ambitious Teams"
              accentStyle="gradient"
              description="Don't just take our word for it — here's what the businesses we've built for have to say."
              align="center"
              size="xl"
              theme="dark"
            />
          </div>
        </Container>

        {/* Full-bleed marquee */}
        <div className="relative">
          <div
            className="absolute inset-y-0 left-0 w-40 z-10 pointer-events-none"
            style={{ background: 'linear-gradient(90deg, #080808 0%, transparent 100%)' }}
          />
          <div
            className="absolute inset-y-0 right-0 w-40 z-10 pointer-events-none"
            style={{ background: 'linear-gradient(270deg, #080808 0%, transparent 100%)' }}
          />
          <MarqueeRow speed={50} />
        </div>
      </div>
    </section>
  )
}
