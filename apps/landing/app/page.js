'use client'

import {
  Navbar,
  HeroSection,
  SolutionsSection,
  ServicesSection,
  StatsSection,
  FeatureShowcase,
  IndustriesSection,
  TestimonialsSection,
  FAQSection,
  CTASection,
  ContactSection,
  Footer,
} from '../components/sections/home'

export default function Home() {
  return (
    <main className="min-h-screen bg-white overflow-x-clip">
      <Navbar />
      <HeroSection />
      <SolutionsSection />
      <ServicesSection />
      <StatsSection />
      <FeatureShowcase />
      <IndustriesSection />
      <TestimonialsSection />
      <FAQSection />
      <CTASection />
      <ContactSection />
      <Footer />
    </main>
  )
}
