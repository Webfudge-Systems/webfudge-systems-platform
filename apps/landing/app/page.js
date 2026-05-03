'use client'

import {
  HeroSection,
  BasedOnDataSection,
  IndustriesWeServeSection,
  HookLineSection,
  WhyUsSection,
  AppFeaturesSection,
  FAQSection,
  FooterSection,
} from '../components/sections'

export default function Home() {
  return (
    <main className="min-h-screen bg-brand-light">
      <HeroSection />
      <BasedOnDataSection />
      <IndustriesWeServeSection />
      <HookLineSection />
      <WhyUsSection />
      <AppFeaturesSection />
      <FAQSection />
      <FooterSection />
    </main>
  )
}
