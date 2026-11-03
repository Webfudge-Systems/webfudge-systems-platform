'use client'

import { useEffect, useState } from 'react'
import AppWindow from '../mocks/AppWindow'

const SCREENS = [
  { label: 'CRM dashboard', variant: 'crm' },
  { label: 'Pipeline board', variant: 'board' },
  { label: 'Projects dashboard', variant: 'pm' },
]

const DEPTH = [
  'z-[3] opacity-100 [transform:translateY(0)_scale(1)]',
  'z-[2] opacity-[.85] brightness-[.8] [transform:translateY(-36px)_scale(.95)]',
  'z-[1] opacity-[.55] brightness-[.6] [transform:translateY(-72px)_scale(.9)]',
]

/** Three app screens stacked over an orange light beam; they shuffle every few seconds. */
export default function DashboardStack() {
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const t = setInterval(() => setActive((a) => (a + 1) % SCREENS.length), 3600)
    return () => clearInterval(t)
  }, [paused])

  return (
    <section id="demo" aria-label="Product preview" className="px-5 pt-6 sm:px-6">
      <div className="stage relative mx-auto max-w-site overflow-hidden rounded-[36px] px-4 pt-24 sm:px-6 sm:pt-28">
        <div className="beam" aria-hidden="true" />
        <div className="relative mx-auto h-[440px] max-w-[1040px] sm:h-[560px]">
          {SCREENS.map((s, i) => {
            const pos = (i - active + SCREENS.length) % SCREENS.length
            return (
              <div key={s.variant} aria-hidden={pos !== 0} className={`shot absolute inset-0 origin-top ${DEPTH[pos]}`}>
                <div className="h-full overflow-hidden rounded-t-[22px] border border-white/25 shadow-[0_-20px_60px_-20px_rgba(245,99,15,.45)]">
                  <AppWindow variant={s.variant} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
      <div role="tablist" aria-label="Preview" className="mx-auto mt-5 flex max-w-site flex-wrap justify-center gap-2">
        {SCREENS.map((s, i) => (
          <button
            key={s.variant}
            type="button"
            role="tab"
            aria-selected={i === active}
            onClick={() => {
              setActive(i)
              setPaused(true)
            }}
            className={`min-h-[44px] rounded-full border px-4 text-sm font-medium transition ${i === active ? 'border-ink bg-ink text-white' : 'border-[#D9D9D5] bg-white hover:bg-surface'}`}
          >
            {s.label}
          </button>
        ))}
      </div>
    </section>
  )
}
