'use client'

import {
  Navbar,
  HeroSection,
  SolutionsSection,
  ServicesSection,
  StatsSection,
  FeatureShowcase,
  TestimonialsSection,
  FAQSection,
  CTASection,
  ContactSection,
  Footer,
} from '../components/sections/home'

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      <Navbar />
      <HeroSection />
      <SolutionsSection />
      <ServicesSection />
      <StatsSection />
      <FeatureShowcase />
      <TestimonialsSection />
      <FAQSection />
      <CTASection />
      <ContactSection />
      <Footer />
    </main>
  )
}
