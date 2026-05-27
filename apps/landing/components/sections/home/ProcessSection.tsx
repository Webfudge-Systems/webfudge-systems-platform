'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Search, Map, Figma, Code2, Rocket } from 'lucide-react'
import SectionHeading from '../../ui/SectionHeading'
import Container from '../../ui/Container'

const steps = [
  {
    number: '01',
    title: 'Discovery',
    description: 'We dive deep into your business goals, challenges, and target audience to build a complete understanding of what needs to be created.',
    icon: Search,
    color: '#F5630F',
  },
  {
    number: '02',
    title: 'Planning',
    description: 'Our architects design the technical roadmap, define the scope, and create a detailed plan that keeps the project on track from day one.',
    icon: Map,
    color: '#8B5CF6',
  },
  {
    number: '03',
    title: 'Design',
    description: 'UX research meets pixel-perfect design. We create intuitive wireframes and high-fidelity prototypes before writing a single line of code.',
    icon: Figma,
    color: '#3B82F6',
  },
  {
    number: '04',
    title: 'Development',
    description: 'Agile sprints, clean code, and rigorous testing. We build your product with scalability and performance baked in from the start.',
    icon: Code2,
    color: '#22C55E',
  },
  {
    number: '05',
    title: 'Launch',
    description: 'We handle deployment, monitoring, and post-launch support — ensuring your product goes live smoothly and keeps running flawlessly.',
    icon: Rocket,
    color: '#F59E0B',
  },
]

export default function ProcessSection() {
  return (
    <section id="process" className="py-24 md:py-32 bg-[#fafafa] overflow-hidden">
      <Container>
        <div className="mb-16">
          <SectionHeading
            eyebrow="How We Work"
            title="A Process Designed for"
            accentTitle="Success"
            subtitle="Every great product starts with a proven process. Here's how we take your idea from concept to a polished, production-ready reality."
            align="center"
          />
        </div>

        {/* Process timeline */}
        <div className="relative">
          {/* Connecting line (desktop) */}
          <div className="hidden lg:block absolute top-10 left-0 right-0 h-px z-0">
            <motion.div
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.5, ease: 'easeInOut', delay: 0.5 }}
              className="absolute inset-0 origin-left"
              style={{
                background: 'linear-gradient(90deg, #F5630F 0%, #8B5CF6 25%, #3B82F6 50%, #22C55E 75%, #F59E0B 100%)',
              }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 lg:gap-4 relative z-10">
            {steps.map((step, index) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-20px' }}
                transition={{ duration: 0.6, delay: index * 0.12, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-col items-center text-center lg:items-center"
              >
                {/* Icon circle */}
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  className="relative w-20 h-20 rounded-full flex items-center justify-center mb-6 flex-shrink-0 border-4"
                  style={{
                    background: `${step.color}12`,
                    borderColor: `${step.color}25`,
                  }}
                >
                  {/* Step number */}
                  <div
                    className="absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold border-2 border-white"
                    style={{ background: step.color }}
                  >
                    {index + 1}
                  </div>
                  <step.icon size={28} style={{ color: step.color }} />
                </motion.div>

                <div className="bg-white rounded-[20px] p-6 border border-[rgba(0,0,0,0.07)] w-full shadow-[0_2px_16px_rgba(0,0,0,0.04)]">
                  <div
                    className="text-xs font-bold uppercase tracking-widest mb-2"
                    style={{ color: step.color }}
                  >
                    Step {step.number}
                  </div>
                  <h3 className="text-base font-bold text-[#111111] mb-3">{step.title}</h3>
                  <p className="text-xs text-[#666666] leading-relaxed">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  )
}
