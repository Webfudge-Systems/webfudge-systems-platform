'use client'

import { useAuth } from '@webfudge/auth'
import { HeroSection, AppUISection, QuoteSection, TrustedBySection, FAQSection } from '../components/sections'

export default function Home() {
  const { isAuthenticated } = useAuth()

  return (
    <main className="min-h-screen bg-brand-light">
      <HeroSection isAuthenticated={isAuthenticated} />
      <AppUISection />
      <QuoteSection />
      <TrustedBySection />
      <FAQSection />
    </main>
  )
}
