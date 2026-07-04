'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X } from 'lucide-react'
import SectionHeader from '../../ui/SectionHeader'
import Container from '../../ui/Container'

const faqs = [
  {
    question: 'What services does Webfudge Systems offer?',
    answer: 'We offer CRM, ERP, HRMS, finance, lead generation extensions, invoice & billing, inventory management, and custom web applications. Solutions are available as SaaS or on-premise deployments — scalable, secure, and built for businesses of all sizes.',
  },
  {
    question: 'How long does a typical software project take?',
    answer: 'Project timelines depend on scope and complexity. A CRM or ERP module typically takes 6–12 weeks. A full custom platform ranges from 3–6 months. We provide a detailed timeline estimate during our discovery phase and keep you updated at every stage.',
  },
  {
    question: 'Do you build fully custom software from scratch?',
    answer: 'Absolutely. Custom software is our core specialty. We don\'t use generic templates or force your requirements into pre-built frameworks. Every system is designed specifically around your business goals, workflows, and operational requirements.',
  },
  {
    question: 'Can you build a CRM tailored specifically for our business?',
    answer: 'Yes. We build fully custom CRM systems designed around your sales process — with lead tracking, deal pipelines, customer communication tools, and automation built exactly the way your team works. No unnecessary features, no compromises.',
  },
  {
    question: 'What kind of post-launch support do you provide?',
    answer: 'We offer long-term support post-launch, including bug fixes, feature additions, performance improvements, and system updates. Our team ensures your software continues to run smoothly as your business grows and requirements evolve.',
  },
  {
    question: 'Are your software solutions affordable for small businesses?',
    answer: 'Yes. We build affordable, high-quality software solutions suitable for startups, small businesses, and growing companies. We offer flexible engagement models and phased development approaches so you get maximum value within your budget.',
  },
  {
    question: 'What is your development process like?',
    answer: 'We follow an agile development approach with regular client check-ins, milestone-based delivery, and full transparency throughout the project. You\'ll have direct access to your project manager and team, with clear visibility into progress at every stage.',
  },
  {
    question: 'Which industries do you work with?',
    answer: 'We work across a wide range of industries including startups, agencies, ecommerce, healthcare, education, logistics, real estate, and service businesses. Our software solutions are designed to be flexible and adaptable to different business models and workflows.',
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
        className="w-full flex items-start sm:items-center justify-between gap-3 sm:gap-5 px-4 sm:px-7 py-4 sm:py-6 text-left"
      >
        <span
          className={`text-sm sm:text-[15px] font-semibold leading-snug transition-colors pr-2 ${
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
            <div className="px-4 sm:px-7 pb-5 sm:pb-7">
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
    <section id="faq" className="py-16 sm:py-24 md:py-32 bg-white">
      <Container>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-10 sm:gap-16 lg:gap-20 items-start">

          {/* ── Left: sticky header ── */}
          <div className="lg:sticky lg:top-28">
            <SectionHeader
              eyebrow="FAQs"
              title="Frequently asked"
              accentText="questions"
              accentStyle="gradient"
              description="Everything you need to know about our software development services and process."
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
