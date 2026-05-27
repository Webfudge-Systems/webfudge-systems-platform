'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X } from 'lucide-react'
import SectionHeader from '../../ui/SectionHeader'
import Container from '../../ui/Container'

const faqs = [
  {
    question: 'What services does Webfudge Systems offer?',
    answer: 'We offer end-to-end software development services including custom software development, CRM systems, SaaS product development, UI/UX design, AI automation, and performance marketing. We work with startups, SMEs, and enterprises across various industries.',
  },
  {
    question: 'How long does a typical development project take?',
    answer: 'Project timelines vary based on scope and complexity. A simple web application typically takes 4–8 weeks. A full-scale SaaS product or enterprise system ranges from 3–6 months. We provide a detailed timeline estimate during our discovery phase and keep you updated throughout.',
  },
  {
    question: 'Do you build fully custom software from scratch?',
    answer: 'Absolutely. Custom software is our specialty. We don\'t use cookie-cutter templates or force your requirements into pre-built frameworks. Every system is architected specifically for your business goals, workflows, and scale requirements.',
  },
  {
    question: 'Can you redesign and modernize our existing systems?',
    answer: 'Yes, we handle both greenfield development and legacy system modernization. We can migrate your existing platform to modern architecture, improve performance, add new features, or completely redesign the user experience — all while keeping your business running.',
  },
  {
    question: 'What kind of post-launch support do you provide?',
    answer: 'We offer multiple support tiers post-launch, including bug fixes, feature additions, security patches, and performance monitoring. Our dedicated support team ensures your product runs smoothly, and we provide SLA-based response times for critical issues.',
  },
  {
    question: 'How do you handle data security and privacy?',
    answer: 'Security is a first-class concern in everything we build. We implement industry best practices including data encryption at rest and in transit, RBAC, secure API design, regular security audits, and compliance-ready architectures (GDPR, SOC 2). Your data is always protected.',
  },
  {
    question: 'What is your development process like?',
    answer: 'We follow an agile development methodology with two-week sprints, daily standups, and weekly client demos. You\'ll have direct access to your project manager and development team throughout the engagement, with full transparency into progress via project management tools.',
  },
  {
    question: 'Do you work with startups or only established businesses?',
    answer: 'We work with both. We love helping startups turn their MVP ideas into production-ready products, and we equally enjoy solving complex technical challenges for established enterprises. Our flexible engagement models accommodate different budgets and timelines.',
  },
]

function FAQItem({ faq, index }: { faq: typeof faqs[0]; index: number }) {
  const [open, setOpen] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-10px' }}
      transition={{ duration: 0.45, delay: index * 0.055 }}
      className={`border rounded-2xl overflow-hidden transition-colors duration-300 ${
        open
          ? 'border-[rgba(245,99,15,0.3)] bg-orange-50/60'
          : 'border-[rgba(0,0,0,0.09)] bg-white hover:border-[rgba(245,99,15,0.2)] hover:bg-orange-50/20'
      }`}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-5 px-7 py-6 text-left"
      >
        <span
          className={`text-[15px] font-semibold leading-snug transition-colors ${
            open ? 'text-[#F5630F]' : 'text-[#111111]'
          }`}
        >
          {faq.question}
        </span>
        <span
          className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-colors duration-300 ${
            open ? 'bg-[#F5630F] text-white' : 'bg-[#f0f0f0] text-[#555555]'
          }`}
        >
          {open ? <X size={15} strokeWidth={2.5} /> : <Plus size={15} strokeWidth={2.5} />}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="px-7 pb-7">
              <div className="h-px bg-[rgba(245,99,15,0.12)] mb-5" />
              <p className="text-[14px] text-[#555555] leading-relaxed">{faq.answer}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function FAQSection() {
  return (
    <section className="py-24 md:py-32 bg-white">
      <Container>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-16 lg:gap-20 items-start">

          {/* ── Left: sticky header ── */}
          <div className="lg:sticky lg:top-28">
            <SectionHeader
              eyebrow="FAQs"
              title="Frequently asked"
              accentText="questions"
              accentStyle="gradient"
              description="Make smarter decisions and scale effortlessly with advanced analytics."
              align="left"
              size="xl"
              theme="light"
              constrainDescription={false}
            />

            <motion.a
              href="#contact"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.35, duration: 0.5 }}
              className="mt-10 inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold text-white"
              style={{ background: 'linear-gradient(135deg, #F5630F, #ff8c42)' }}
              whileHover={{ scale: 1.04, y: -2, boxShadow: '0 12px 35px rgba(245,99,15,0.35)' }}
              whileTap={{ scale: 0.97 }}
            >
              Talk to Our Team
            </motion.a>
          </div>

          {/* ── Right: accordion ── */}
          <div className="flex flex-col gap-4">
            {faqs.map((faq, index) => (
              <FAQItem key={faq.question} faq={faq} index={index} />
            ))}
          </div>

        </div>
      </Container>
    </section>
  )
}
