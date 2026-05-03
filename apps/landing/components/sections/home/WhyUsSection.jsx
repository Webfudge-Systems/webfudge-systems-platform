'use client'

const REASONS = [
  {
    title: 'No-Code Friendly',
    text: 'Launch internal workflows without waiting on a full engineering cycle.',
  },
  {
    title: 'Breakthrough Automation',
    text: 'Smart automations remove repetitive work and keep teams focused on growth.',
  },
  {
    title: 'Modular Stack',
    text: 'Choose only the apps you need today and expand anytime without rework.',
  },
  {
    title: 'Cross-Team Visibility',
    text: 'Sales, finance, and operations stay connected in one real-time system.',
  },
  {
    title: 'Reliable Performance',
    text: 'Built for business-critical workflows with predictable speed and uptime.',
  },
  {
    title: 'Enterprise-Ready Security',
    text: 'Role-based access, clean permissions, and clear audit trails out of the box.',
  },
]

export default function WhyUsSection() {
  return (
    <section className="bg-[#f4f0ed] px-6 py-20 md:px-10 md:py-24 lg:px-16 lg:py-28">
      <div className="mx-auto w-full max-w-[1320px]">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="font-sans text-xs font-semibold uppercase tracking-[0.2em] text-[#e84b18]">
              Why us
            </p>
            <h2 className="font-heading mt-4 text-[clamp(36px,4.5vw,64px)] font-semibold leading-[1.04] tracking-[-0.02em] text-[#161616]">
              Fast, flexible, efficient process automation for every team.
            </h2>
            <p className="mt-6 max-w-[430px] font-sans text-base leading-[1.7] text-[#4e4e4e]">
              We design implementation around outcomes. Every module is configured to reduce manual
              work, improve visibility, and help your team move faster with confidence.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-0 border border-[#e8dfd8] bg-white sm:grid-cols-2">
            {REASONS.map((item) => (
              <article key={item.title} className="border border-[#eee5dd] px-7 py-8 md:px-8 md:py-9">
                <div className="mb-7 h-8 w-full border-t border-[#f2d7c9]" />
                <h3 className="font-heading text-[29px] font-semibold leading-[1.2] text-[#1f1f1f] md:text-[30px]">
                  {item.title}
                </h3>
                <p className="mt-4 font-sans text-sm leading-[1.75] text-[#676767] md:text-[15px]">
                  {item.text}
                </p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
