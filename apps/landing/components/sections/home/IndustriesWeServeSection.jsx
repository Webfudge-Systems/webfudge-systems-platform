'use client'

import Image from 'next/image'
import { useMemo, useState } from 'react'

const INDUSTRIES = [
  { title: 'Gaming & Entertainment', image: '/hero-bottom-mashup.png' },
  { title: 'Real Estate & Prop Tech', image: '/images/cubic_glass.png' },
  { title: 'FinTech & Banking', image: '/images/crm.png' },
  { title: 'Healthcare & Life Sciences', image: '/crm-demo.png' },
]

const CARD_HEIGHT = 286
const CARD_GAP = 16
const VIEWPORT_HEIGHT = 540

function ArrowIcon({ direction = 'left' }) {
  const rotate = direction === 'right' ? 'rotate(180 7 7)' : undefined
  return (
    <svg viewBox="0 0 14 14" width="14" height="14" aria-hidden>
      <g transform={rotate}>
        <path d="M9.5 2.5L5 7l4.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      </g>
    </svg>
  )
}

export default function IndustriesWeServeSection() {
  const [activeIndex, setActiveIndex] = useState(1)

  const translateY = useMemo(() => {
    const step = CARD_HEIGHT + CARD_GAP
    return VIEWPORT_HEIGHT / 2 - (activeIndex * step + CARD_HEIGHT / 2)
  }, [activeIndex])

  const goPrev = () => {
    setActiveIndex((prev) => (prev <= 0 ? INDUSTRIES.length - 1 : prev - 1))
  }

  const goNext = () => {
    setActiveIndex((prev) => (prev >= INDUSTRIES.length - 1 ? 0 : prev + 1))
  }

  return (
    <section
      aria-labelledby="industries-heading"
      className="bg-[#e84b18] px-6 py-20 md:px-10 md:py-24 lg:px-16 lg:py-28"
    >
      <div className="mx-auto grid w-full max-w-[1320px] items-center gap-14 md:grid-cols-[1fr_360px]">
        <div className="max-w-[520px]">
          <h2
            id="industries-heading"
            className="font-heading text-[clamp(46px,7.2vw,78px)] font-medium leading-[0.96] tracking-[-0.03em] text-white"
          >
            Industries
            <br />
            <span className="italic font-normal">We Serve</span>
          </h2>
          <p className="mt-7 font-sans text-[clamp(17px,1.65vw,27px)] leading-[1.52] text-white/90">
            AI is reshaping industries worldwide, enabling businesses to optimize operations,
            enhance decision-making, and unlock new revenue streams.
          </p>

          <div className="mt-9 flex items-center gap-4">
            <button
              type="button"
              onClick={goPrev}
              aria-label="Previous industry"
              className="grid h-5 w-5 place-items-center rounded-[3px] bg-white/15 text-white transition hover:bg-white/25"
            >
              <ArrowIcon direction="left" />
            </button>
            <div className="flex items-center gap-2" aria-label="Industry slides">
              {INDUSTRIES.map((item, idx) => (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => setActiveIndex(idx)}
                  aria-label={`Go to ${item.title}`}
                  className={`rounded-full transition ${
                    idx === activeIndex ? 'h-1.5 w-1.5 bg-white' : 'h-1.5 w-1.5 bg-white/35'
                  }`}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={goNext}
              aria-label="Next industry"
              className="grid h-5 w-5 place-items-center rounded-[3px] bg-white/15 text-white transition hover:bg-white/25"
            >
              <ArrowIcon direction="right" />
            </button>
          </div>
        </div>

        <div className="relative ml-auto h-[540px] w-full max-w-[360px] overflow-hidden py-6">
          <div
            className="absolute left-1/2 top-0 flex flex-col transition-transform duration-500 ease-out"
            style={{
              transform: `translate(-50%, ${translateY}px)`,
              gap: `${CARD_GAP}px`,
            }}
          >
            {INDUSTRIES.map((item) => (
              <article
                key={item.title}
                className="h-[286px] w-[320px] overflow-hidden rounded-[18px] bg-white shadow-[0_10px_24px_rgba(0,0,0,0.22)]"
              >
                <div className="relative h-[198px] w-full overflow-hidden">
                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    className="object-cover"
                    sizes="320px"
                  />
                </div>
                <div className="flex h-[88px] items-center justify-center px-4">
                  <p className="font-sans text-center text-[15px] font-semibold leading-snug text-[#222] md:text-[16px]">
                    {item.title}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
