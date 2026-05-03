'use client'

import Image from 'next/image'

const FEATURES = [
  {
    title: 'CRM',
    desc: 'Pipeline, lead management, sales insights',
    image: '/crm-demo.png',
  },
  {
    title: 'Project Management',
    desc: 'Tasks, milestones, team collaboration',
    image: '/hero-bottom-mashup.png',
  },
  {
    title: 'Books & Finance',
    desc: 'Invoices, reports, accounting workflows',
    image: '/images/crm.png',
  },
  {
    title: 'Automation',
    desc: 'No-code workflows and smart triggers',
    image: '/images/cubic_glass.png',
  },
]

export default function AppFeaturesSection() {
  return (
    <section id="products" className="bg-white px-6 py-20 md:px-10 md:py-24 lg:px-16 lg:py-28">
      <div className="mx-auto w-full max-w-[1320px]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="font-heading text-[clamp(34px,4vw,58px)] font-semibold leading-[1.04] tracking-[-0.02em] text-[#161616]">
            Everything You Need
            <span className="block italic font-normal">to Run Your Business</span>
          </h2>
          <a
            href="/products/crm"
            className="font-sans inline-flex items-center rounded-full bg-[#e84b18] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#cf4114]"
          >
            Discover the Apps
          </a>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
          {FEATURES.map((feature) => (
            <article
              key={feature.title}
              className="overflow-hidden rounded-[24px] border border-[#ece6e2] bg-[#faf7f4]"
            >
              <div className="relative h-[230px] w-full">
                <Image
                  src={feature.image}
                  alt={feature.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
              <div className="px-6 py-6 md:px-7">
                <h3 className="font-heading text-2xl font-semibold text-[#1f1f1f]">{feature.title}</h3>
                <p className="font-sans mt-2 text-[15px] leading-7 text-[#5d5d5d]">{feature.desc}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
