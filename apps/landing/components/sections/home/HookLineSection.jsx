'use client'

/**
 * Full-viewport hook band (ref-style): 50/50 split —
 * left: diagonal cream → brand orange + soft glows + diagonal sheen (no grid)
 * right: white panel, orange accent rule, headline + body
 */
export default function HookLineSection() {
  return (
    <section
      aria-labelledby="hook-heading"
      className="min-h-[100svh] w-full overflow-hidden bg-white"
    >
      <div className="grid min-h-[100svh] grid-cols-1 md:grid-cols-2">
        {/* Left — base gradient + atmospheric depth (no square grid) */}
        <div className="relative min-h-[42svh] md:min-h-0" aria-hidden>
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(135deg, #fff8f2 0%, #ffdccc 38%, #ff8a50 72%, #e84b18 100%)',
            }}
          />
          {/* Soft light blooms */}
          <div className="pointer-events-none absolute -left-16 top-[18%] h-56 w-56 rounded-full bg-white/35 blur-[56px] md:h-72 md:w-72" />
          <div className="pointer-events-none absolute left-[35%] top-8 h-40 w-40 rounded-full bg-amber-100/40 blur-[40px]" />
          <div className="pointer-events-none absolute -bottom-8 right-[-10%] h-80 w-80 rounded-full bg-orange-300/35 blur-[64px]" />
          {/* Very subtle diagonal bands (reads as light, not a grid) */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.35] mix-blend-soft-light"
            style={{
              backgroundImage:
                'repeating-linear-gradient(122deg, transparent 0px, transparent 56px, rgba(255,255,255,0.14) 56px, rgba(255,255,255,0.14) 57px)',
            }}
          />
        </div>

        {/* Right — content on solid white */}
        <div className="flex min-h-[58svh] flex-col justify-center bg-white px-8 py-14 sm:px-12 md:min-h-0 md:px-14 md:py-16 lg:px-20 lg:py-20">
          <div className="max-w-[540px] border-l border-[#e84b18] pl-6 md:pl-8">
            <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.28em] text-[#e84b18] md:text-[12px]">
              Crafted for attention
            </p>
            <h2
              id="hook-heading"
              className="font-heading mt-6 text-[clamp(28px,4.2vw,52px)] font-semibold leading-[1.08] tracking-[-0.03em] text-[#1A1A1A]"
            >
              <span className="block">UI/UX that makes</span>
              <span className="block">people stop scrolling</span>
              <span className="mt-1 block text-[#e84b18]">and start exploring.</span>
            </h2>
            <p className="mt-8 font-sans text-[clamp(15px,1.4vw,18px)] leading-[1.7] text-[#555555]">
              From first glance to final click, every pixel is shaped to feel premium, readable,
              and action-driven—so visitors understand value in seconds, not minutes.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
