'use client'

import { Accordion, Container, Section } from '@webfudge/ui'
import { SectionHeader } from '../../common'

const faqs = [
  {
    id: 'data-safety',
    question: 'Is my data Safe in Webfudge Systems?',
    answer:
      'Yes. We use industry-grade encryption, secure servers, and role-based access controls to protect your data at all times.',
  },
  {
    id: 'get-started',
    question: 'How do I get started?',
    answer:
      'Sign up for a free trial, choose your plan, and invite your team. You can start using CRM, projects, and accounts within minutes.',
  },
  {
    id: 'upgrade',
    question: 'Can I upgrade to new features later?',
    answer:
      'Absolutely. You can change your plan or add modules anytime. New features are rolled out regularly and available based on your subscription.',
  },
  {
    id: 'how-it-works',
    question: 'How does it Work?',
    answer:
      'Webfudge brings your sales, projects, and accounts into one platform. Use the apps you need, integrate with your tools, and scale as you grow.',
  },
]

const accordionItems = faqs.map((faq) => ({
  id: faq.id,
  label: faq.question,
  content: <p>{faq.answer}</p>,
}))

export default function FAQSection() {
  return (
    <Section id="faq" ariaLabel="Frequently asked questions">
      <Container>
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16 lg:items-start">
          <div>
            <SectionHeader
              tagText="FAQs"
              title="Frequently Asked Questions"
              subtitle="Get answers to common questions here."
            />
          </div>

          <Accordion items={accordionItems} defaultOpenId={faqs[0].id} variant="default" />
        </div>
      </Container>
    </Section>
  )
}
