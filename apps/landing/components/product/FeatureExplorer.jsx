'use client'

import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'

function Preview({ f, accent }) {
  if (f.kind === 'table') {
    return (
      <div className="overflow-x-auto">
        <div className="min-w-[480px]">
          <div className="grid grid-cols-[2fr_1.4fr_1fr_1fr] gap-2 border-b border-[#F1F1EE] px-2 pb-2 text-xs font-semibold text-[#8A8A8A]">
            {f.head.map((h) => <span key={h}>{h}</span>)}
          </div>
          {f.rows.map((r) => (
            <div key={r.a} className="grid grid-cols-[2fr_1.4fr_1fr_1fr] items-center gap-2 border-b border-[#F1F1EE] px-2 py-2.5 text-[13px]">
              <span className="flex items-center gap-2 font-semibold">
                <span className="flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-lg text-[10px] text-white" style={{ background: r.bg }}>{r.i}</span>
                {r.a}
              </span>
              <span className="text-muted">{r.b}</span>
              <span>{r.c}</span>
              <span><span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${r.chipClass}`}>{r.chip}</span></span>
            </div>
          ))}
        </div>
      </div>
    )
  }
  if (f.kind === 'board') {
    return (
      <div className="grid grid-cols-3 gap-2.5">
        {f.cols.map(([name, cards]) => (
          <div key={name} className="rounded-xl bg-surface p-2.5">
            <p className="mb-2 text-xs font-semibold text-muted">{name}</p>
            {cards.map(([a, b]) => (
              <div key={a} className="mb-2 rounded-[10px] bg-white p-2.5 text-[13px] font-semibold">
                {a}
                <span className="mt-0.5 block text-xs font-normal text-muted">{b}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    )
  }
  if (f.kind === 'doc') {
    return (
      <div className="rounded-2xl border border-line p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-lg font-semibold">{f.docTitle}</p>
            <p className="mt-1 text-[13px] text-muted">{f.docSub}</p>
          </div>
          <span className="rounded-full bg-[#E6F4EA] px-2.5 py-1 text-xs font-semibold text-[#1E6B34]">{f.docStatus}</span>
        </div>
        {f.lines.map(([a, b]) => (
          <div key={a} className="flex justify-between border-b border-[#F1F1EE] py-2.5 text-sm"><span>{a}</span><span className="font-semibold">{b}</span></div>
        ))}
        <div className="flex justify-between pt-3 font-bold"><span>Total</span><span>{f.total}</span></div>
      </div>
    )
  }
  if (f.kind === 'cal') {
    return (
      <div className="relative grid h-[260px] grid-cols-5 gap-2">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((d) => (
          <div key={d}>
            <p className="mb-1.5 text-center text-xs font-semibold text-[#8A8A8A]">{d}</p>
            <div className="h-[230px] rounded-xl bg-[#F7F7F5]" />
          </div>
        ))}
        {f.events.map(([col, top, h, label, bg]) => (
          <div key={label} className="absolute rounded-[10px] p-2 text-xs font-semibold text-white" style={{ left: `calc(${(col - 1) * 20}% + 4px)`, width: 'calc(20% - 12px)', top: top + 24, height: h, background: bg }}>
            {label}
          </div>
        ))}
      </div>
    )
  }
  if (f.kind === 'chat') {
    return (
      <div className="space-y-2.5">
        {f.msgs.map(([who, text, mine], i) => (
          <div key={i} className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-snug ${mine ? 'ml-auto bg-ink text-white' : 'bg-surface'}`}>
            <span className="mb-0.5 block text-xs font-bold">{who}</span>
            {text}
          </div>
        ))}
      </div>
    )
  }
  if (f.kind === 'chart') {
    return (
      <div>
        <div className="mb-3.5 grid grid-cols-3 gap-2.5">
          {f.kpis.map(([a, b]) => (
            <div key={a} className="rounded-xl bg-[#F7F7F5] p-3">
              <p className="text-xs text-muted">{a}</p>
              <p className="mt-1 text-[22px] font-semibold">{b}</p>
            </div>
          ))}
        </div>
        <div className="flex h-[180px] items-end gap-2.5">
          {f.bars.map((b, i) => <span key={i} className="flex-1 rounded-t-lg opacity-90" style={{ height: `${b}%`, background: accent }} />)}
        </div>
      </div>
    )
  }
  return (
    <div>
      {f.items.map(([c, a, b, t]) => (
        <div key={b} className="flex gap-3 py-2">
          <span className="mt-1 h-3 w-3 flex-shrink-0 rounded-full shadow-[0_0_0_4px_#F4F4F2]" style={{ background: c }} />
          <span className="flex-1 text-sm"><strong className="font-semibold">{a}</strong> {b}</span>
          <span className="text-xs text-[#8A8A8A]">{t}</span>
        </div>
      ))}
    </div>
  )
}

/** Tabbed tour of an app's features; plays through on its own until someone picks a tab. */
export default function FeatureExplorer({ page }) {
  const [tab, setTab] = useState(0)
  const [paused, setPaused] = useState(false)
  const features = page.features

  useEffect(() => {
    if (paused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const t = setTimeout(() => setTab((x) => (x + 1) % features.length), 6000)
    return () => clearTimeout(t)
  }, [tab, paused, features.length])

  const f = features[tab]
  return (
    <div className="flex flex-wrap items-stretch gap-5">
      <div role="tablist" aria-label={`${page.name} features`} aria-orientation="vertical" className="flex flex-[1_1_300px] flex-col gap-1.5">
        {features.map((x, i) => {
          const on = i === tab
          return (
            <button
              key={x.title}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => {
                setTab(i)
                setPaused(true)
              }}
              className={`min-h-[56px] rounded-[18px] px-4 py-3.5 text-left transition ${on ? 'bg-white shadow-[0_16px_30px_-20px_rgba(0,0,0,.3)]' : 'hover:bg-white/60'}`}
            >
              <span className="flex items-center gap-3">
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[10px] text-xs font-bold" style={{ background: on ? page.accent : '#FFFFFF', color: on ? '#FFFFFF' : '#5C5C5C' }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="text-base font-semibold">{x.title}</span>
              </span>
              {on && (
                <>
                  <span className="ml-11 mt-2.5 block text-sm leading-relaxed text-[#4A4A4A]">{x.text}</span>
                  {!paused && (
                    <span className="ml-11 mt-3 block h-[3px] overflow-hidden rounded-full bg-[#E2E2DE]">
                      <span key={tab} className="fill-bar block h-full" style={{ background: page.accent }} />
                    </span>
                  )}
                </>
              )}
            </button>
          )
        })}
      </div>
      <div role="tabpanel" className="flex min-w-0 flex-[999_1_560px] flex-col gap-6 overflow-hidden rounded-[32px] p-5 sm:p-8" style={{ background: page.panel }}>
        <div key={tab} className="reveal min-h-[340px] rounded-[20px] bg-white p-4 shadow-[0_30px_60px_-30px_rgba(0,0,0,.3)] sm:p-5">
          <p className="mb-3.5 flex items-center gap-2 text-[15px] font-semibold">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={page.icon} alt="" className="h-[22px] w-[22px]" />
            {f.screen}
          </p>
          <Preview f={f} accent={page.accent} />
        </div>
        <ul className="grid gap-x-5 gap-y-2.5 sm:grid-cols-2">
          {f.points.map((p) => (
            <li key={p} className="flex gap-2.5 text-[15px] leading-snug text-[#2A2A2A]">
              <Check className="mt-0.5 h-[18px] w-[18px] flex-shrink-0" style={{ color: page.accent }} strokeWidth={2.6} aria-hidden="true" />
              {p}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
