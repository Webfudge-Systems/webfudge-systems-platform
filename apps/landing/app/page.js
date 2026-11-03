import Header from '../components/site/Header'
import Footer from '../components/site/Footer'
import DashboardStack from '../components/home/DashboardStack'
import { About, AppsBento, CustomersShowcase, FinalCta, Hero, HowItWorks, Logos } from '../components/home/Sections'
import { Faq, PricingCards, Testimonials } from '../components/home/Interactive'
import { customers } from '../data/customers'
import { faqs } from '../data/site'
import { getPlans } from '../lib/pricing'

export default async function HomePage() {
  const plans = await getPlans()
  return (
    <>
      <Header />
      <main id="main">
        <Hero />
        <DashboardStack />
        <Logos />
        <About />
        <AppsBento />
        <HowItWorks />
        <CustomersShowcase />
        <Testimonials customers={customers} />

        <section id="pricing" className="px-5 py-28 sm:px-6">
          <div className="mx-auto max-w-site">
            <div className="mx-auto mb-9 max-w-3xl text-center">
              <p className="eyebrow mb-5">Pricing</p>
              <h2 className="h-section">
                Simple pricing, <span className="accent text-brand">per app.</span>
              </h2>
              <p className="mt-4 text-[17px] text-muted">Per user, per month. Every paid plan starts with a 14-day free trial.</p>
            </div>
            <PricingCards plans={plans.crm} />
          </div>
        </section>

        <section id="faq" className="px-5 pb-28 sm:px-6">
          <div className="mx-auto max-w-[880px]">
            <h2 className="h-section mb-10 text-center">
              Ask us <span className="accent text-brand">anything.</span>
            </h2>
            <Faq items={faqs} />
          </div>
        </section>

        <FinalCta />
      </main>
      <Footer />
    </>
  )
}
