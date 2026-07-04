'use client'

import { useEffect, useId, useState } from 'react'
import { animate, motion, useMotionValue } from 'framer-motion'

const ACCENT = '#F5630F'
const EASE = [0.22, 1, 0.36, 1] as const

type Variant =
  | 'crm'
  | 'erp'
  | 'hr'
  | 'finance'
  | 'lead-gen'
  | 'invoice'
  | 'inventory'
  | 'custom-web'
type Props = { variant: Variant; dark: boolean }

const stroke = (dark: boolean) => (dark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.08)')
const fillPanel = (dark: boolean) => (dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)')
const fillCol = (dark: boolean) => (dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)')
const labelFill = (dark: boolean) => (dark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)')
const textPrimary = (dark: boolean) => (dark ? '#ffffff' : '#111111')

function BoardShell({
  dark,
  children,
  uid,
}: {
  dark: boolean
  children: React.ReactNode
  uid: string
}) {
  return (
    <svg viewBox="0 0 280 188" fill="none" className="w-full h-full" aria-hidden>
      <defs>
        <linearGradient id={`${uid}-panel`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={dark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.9)'} />
          <stop offset="100%" stopColor={dark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'} />
        </linearGradient>
        <filter id={`${uid}-shadow`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity={dark ? 0.35 : 0.08} />
        </filter>
        <filter id={`${uid}-glow`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <rect
        x="12"
        y="8"
        width="256"
        height="172"
        rx="14"
        fill={`url(#${uid}-panel)`}
        stroke={stroke(dark)}
        strokeWidth="1"
      />
      {children}
    </svg>
  )
}

function DealCard({
  x,
  y,
  w = 44,
  h = 26,
  active,
  dark,
}: {
  x: number
  y: number
  w?: number
  h?: number
  active?: boolean
  dark: boolean
}) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx="7"
        fill={active ? (dark ? 'rgba(245,99,15,0.22)' : 'rgba(245,99,15,0.12)') : fillCol(dark)}
        stroke={active ? ACCENT : stroke(dark)}
        strokeWidth={active ? 1.5 : 1}
      />
      <rect
        x={x + 7}
        y={y + 8}
        width={w - 20}
        height="3.5"
        rx="1.75"
        fill={active ? ACCENT : stroke(dark)}
        opacity={active ? 0.85 : 0.6}
      />
      <rect x={x + 7} y={y + 15} width={w - 28} height="2.5" rx="1.25" fill={stroke(dark)} />
    </g>
  )
}

function PersonIcon({ cx, cy, dark, accent }: { cx: number; cy: number; dark: boolean; accent?: boolean }) {
  return (
    <g>
      <circle
        cx={cx}
        cy={cy - 4}
        r="5"
        fill={accent ? ACCENT : fillCol(dark)}
        opacity={accent ? 0.9 : 0.5}
      />
      <path
        d={`M${cx - 7} ${cy + 8} Q${cx} ${cy + 2} ${cx + 7} ${cy + 8}`}
        fill={accent ? ACCENT : fillCol(dark)}
        opacity={accent ? 0.5 : 0.35}
      />
    </g>
  )
}

function AnimatedBalance({ dark }: { dark: boolean }) {
  const count = useMotionValue(0)
  const [text, setText] = useState('$0.0k')

  useEffect(() => {
    const unsub = count.on('change', (v) => setText(`$${v.toFixed(1)}k`))
    const controls = animate(count, 48.2, {
      duration: 2.8,
      ease: EASE,
      repeat: Infinity,
      repeatType: 'reverse',
      repeatDelay: 1.2,
    })
    return () => {
      unsub()
      controls.stop()
    }
  }, [count])

  return (
    <text x="28" y="62" fill={textPrimary(dark)} fontSize="17" fontWeight="700" letterSpacing="-0.02em">
      {text}
    </text>
  )
}

function DrawLine({
  x1,
  y1,
  x2,
  y2,
  dark,
  delay = 0,
}: {
  x1: number
  y1: number
  x2: number
  y2: number
  dark: boolean
  delay?: number
}) {
  const len = Math.hypot(x2 - x1, y2 - y1)
  return (
    <motion.line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke={stroke(dark)}
      strokeWidth="1"
      strokeLinecap="round"
      strokeDasharray={len}
      initial={{ strokeDashoffset: len, opacity: 0 }}
      animate={{ strokeDashoffset: [len, 0], opacity: [0, 1] }}
      transition={{
        duration: 0.65,
        delay,
        ease: EASE,
        repeat: Infinity,
        repeatDelay: 7,
        repeatType: 'loop',
      }}
    />
  )
}

/** CRM — deal drags through pipeline; Won column highlights on close */
function CrmIllustration({ dark, uid }: { dark: boolean; uid: string }) {
  const stages = ['Lead', 'Qualified', 'Proposal', 'Won']
  const colX = [22, 84, 146, 208]
  const colW = 52

  return (
    <BoardShell dark={dark} uid={uid}>
      {stages.map((label, i) => (
        <g key={label}>
          <motion.rect
            x={colX[i]}
            y="38"
            width={colW}
            height="118"
            rx="9"
            fill={fillCol(dark)}
            stroke={i === 3 ? ACCENT : stroke(dark)}
            strokeWidth={i === 3 ? 1.5 : 1}
            animate={
              i === 3
                ? {
                    strokeOpacity: [0.5, 1, 0.5],
                    fill: [
                      fillCol(dark),
                      dark ? 'rgba(245,99,15,0.12)' : 'rgba(245,99,15,0.08)',
                      fillCol(dark),
                    ],
                  }
                : {}
            }
            transition={{ duration: 5, repeat: Infinity, times: [0, 0.85, 1], ease: 'easeInOut' }}
          />
          <text
            x={colX[i] + colW / 2}
            y="52"
            textAnchor="middle"
            fill={i === 3 ? ACCENT : labelFill(dark)}
            fontSize="6.5"
            fontWeight="600"
            letterSpacing="0.04em"
          >
            {label.toUpperCase()}
          </text>
        </g>
      ))}

      {/* Ghost cards in pipeline */}
      <DealCard x={28} y={98} dark={dark} />
      <DealCard x={90} y={108} dark={dark} />

      {/* Active deal — spring drag with slight lift */}
      <motion.g
        filter={`url(#${uid}-shadow)`}
        animate={{
          x: [0, 62, 124, 186],
          y: [0, -3, -2, -4],
          scale: [1, 1.02, 1.02, 1.04],
        }}
        transition={{
          duration: 5.5,
          repeat: Infinity,
          ease: EASE,
        }}
      >
        <DealCard x={28} y={72} active dark={dark} />
      </motion.g>

      {/* Won notification dot */}
      <motion.circle
        cx={colX[3] + colW - 8}
        cy="46"
        r="3.5"
        fill={ACCENT}
        filter={`url(#${uid}-glow)`}
        animate={{ scale: [0, 1, 1, 0], opacity: [0, 1, 1, 0] }}
        transition={{ duration: 5.5, repeat: Infinity, times: [0, 0.78, 0.88, 1], ease: EASE }}
      />

      {/* Activity indicator */}
      <motion.circle
        cx="248"
        cy="22"
        r="4"
        fill={ACCENT}
        animate={{ opacity: [0.35, 0.9, 0.35] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
      />
    </BoardShell>
  )
}

/** ERP — connected modules pulse around a central operations hub */
function ErpIllustration({ dark, uid }: { dark: boolean; uid: string }) {
  const hub = { x: 96, y: 62, w: 88, h: 56 }
  const hubCx = hub.x + hub.w / 2
  const hubCy = hub.y + hub.h / 2

  const modules = [
    { label: 'Sales', x: 28, y: 42, linkX: hub.x, linkY: hubCy - 10 },
    { label: 'Finance', x: 196, y: 42, linkX: hub.x + hub.w, linkY: hubCy - 10 },
    { label: 'HR', x: 28, y: 118, linkX: hub.x, linkY: hubCy + 10 },
    { label: 'Stock', x: 196, y: 118, linkX: hub.x + hub.w, linkY: hubCy + 10 },
  ]

  return (
    <BoardShell dark={dark} uid={uid}>
      {modules.map((mod, i) => {
        const modCx = mod.x + 36
        const modCy = mod.y + 18
        return (
          <DrawLine
            key={`line-${mod.label}`}
            x1={modCx}
            y1={modCy}
            x2={mod.linkX}
            y2={mod.linkY}
            dark={dark}
            delay={0.15 + i * 0.12}
          />
        )
      })}

      <motion.rect
        x={hub.x}
        y={hub.y}
        width={hub.w}
        height={hub.h}
        rx="12"
        fill={dark ? 'rgba(245,99,15,0.18)' : 'rgba(245,99,15,0.1)'}
        stroke={ACCENT}
        strokeWidth="1.5"
        animate={{ scale: [1, 1.04, 1], opacity: [0.85, 1, 0.85] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />
      <text x={hubCx} y={hubCy - 4} textAnchor="middle" fill={ACCENT} fontSize="7" fontWeight="700" letterSpacing="0.08em">
        ERP
      </text>
      <rect x={hubCx - 22} y={hubCy + 2} width="44" height="3" rx="1.5" fill={ACCENT} opacity="0.55" />

      {modules.map((mod, i) => (
        <motion.g
          key={mod.label}
          animate={{
            opacity: [0.65, 1, 0.65],
            scale: [1, 1.03, 1],
          }}
          transition={{ duration: 3.2, repeat: Infinity, delay: i * 0.45, ease: 'easeInOut' }}
        >
          <rect
            x={mod.x}
            y={mod.y}
            width="72"
            height="36"
            rx="8"
            fill={fillCol(dark)}
            stroke={stroke(dark)}
          />
          <text
            x={mod.x + 36}
            y={mod.y + 22}
            textAnchor="middle"
            fill={labelFill(dark)}
            fontSize="6.5"
            fontWeight="600"
          >
            {mod.label.toUpperCase()}
          </text>
        </motion.g>
      ))}
    </BoardShell>
  )
}

/** Lead gen — browser page + extension popup side-by-side, leads below */
function LeadGenIllustration({ dark, uid }: { dark: boolean; uid: string }) {
  return (
    <BoardShell dark={dark} uid={uid}>
      {/* Browser chrome */}
      <rect x="22" y="22" width="236" height="16" rx="5" fill={fillCol(dark)} stroke={stroke(dark)} />
      <circle cx="32" cy="30" r="2.5" fill="#ff5f57" opacity="0.85" />
      <circle cx="41" cy="30" r="2.5" fill="#febc2e" opacity="0.85" />
      <circle cx="50" cy="30" r="2.5" fill="#28c840" opacity="0.85" />
      <rect x="62" y="26" width="108" height="7" rx="3.5" fill={fillPanel(dark)} />

      <motion.text
        x="248"
        y="32"
        textAnchor="end"
        fill={ACCENT}
        fontSize="7.5"
        fontWeight="700"
        animate={{ opacity: [0.45, 1, 0.45] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
      >
        +12
      </motion.text>

      {/* Left — webpage content */}
      <rect x="22" y="44" width="108" height="68" rx="8" fill={fillCol(dark)} stroke={stroke(dark)} />
      <text x="32" y="58" fill={labelFill(dark)} fontSize="6" fontWeight="600" letterSpacing="0.06em">
        WEB PAGE
      </text>
      {[0, 1, 2].map((i) => (
        <rect key={i} x="32" y={64 + i * 14} width={78 - i * 10} height="3.5" rx="1.75" fill={stroke(dark)} />
      ))}

      {/* Right — extension popup (no overlap) */}
      <motion.g
        filter={`url(#${uid}-shadow)`}
        animate={{ y: [0, -1.5, 0] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
      >
        <rect
          x="138"
          y="44"
          width="120"
          height="68"
          rx="9"
          fill={dark ? 'rgba(245,99,15,0.14)' : 'rgba(245,99,15,0.08)'}
          stroke={ACCENT}
          strokeWidth="1.5"
        />
        <text x="198" y="58" textAnchor="middle" fill={ACCENT} fontSize="6" fontWeight="700" letterSpacing="0.05em">
          CAPTURE LEAD
        </text>
        <rect x="150" y="64" width="96" height="9" rx="4" fill={fillCol(dark)} stroke={stroke(dark)} />
        <rect x="150" y="78" width="96" height="9" rx="4" fill={fillCol(dark)} stroke={stroke(dark)} />
        <rect x="150" y="94" width="96" height="12" rx="6" fill={ACCENT} />
        <text x="198" y="103" textAnchor="middle" fill="#fff" fontSize="5.5" fontWeight="700">
          SAVE
        </text>
      </motion.g>

      {/* Bottom — captured leads panel */}
      <rect x="22" y="122" width="236" height="44" rx="8" fill={fillPanel(dark)} stroke={stroke(dark)} />
      <text x="32" y="134" fill={labelFill(dark)} fontSize="5.5" fontWeight="600" letterSpacing="0.06em">
        CAPTURED LEADS
      </text>

      {[0, 1].map((i) => (
        <motion.g
          key={i}
          animate={{ opacity: [0.35, 1, 0.75], x: [4, 0, 0] }}
          transition={{ duration: 4.5, repeat: Infinity, delay: i * 1.2, ease: EASE, times: [0, 0.25, 1] }}
        >
          <rect x="32" y={140 + i * 12} width="116" height="9" rx="4" fill={fillCol(dark)} stroke={stroke(dark)} />
          <circle cx="40" cy={144.5 + i * 12} r="2.5" fill={ACCENT} />
          <rect x="48" y={142.5 + i * 12} width={72 - i * 8} height="2.5" rx="1.25" fill={stroke(dark)} />
        </motion.g>
      ))}

      <motion.g
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      >
        <rect x="168" y="140" width="78" height="9" rx="4" fill={fillCol(dark)} stroke={stroke(dark)} />
        <circle cx="176" cy="144.5" r="2.5" fill={ACCENT} />
        <rect x="184" y="142.5" width="52" height="2.5" rx="1.25" fill={stroke(dark)} />
      </motion.g>
    </BoardShell>
  )
}

/** Invoice — document status moves from sent to paid */
function InvoiceIllustration({ dark, uid }: { dark: boolean; uid: string }) {
  return (
    <BoardShell dark={dark} uid={uid}>
      <motion.g
        animate={{ y: [0, -2, 0] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <rect x="72" y="28" width="136" height="118" rx="10" fill={fillCol(dark)} stroke={stroke(dark)} />
        <text x="88" y="48" fill={labelFill(dark)} fontSize="7" fontWeight="600" letterSpacing="0.08em">
          INVOICE #1042
        </text>
        {[0, 1, 2, 3].map((i) => (
          <g key={i}>
            <rect x="88" y={58 + i * 16} width="72" height="3" rx="1.5" fill={stroke(dark)} />
            <rect x="176" y={58 + i * 16} width="20" height="3" rx="1.5" fill={stroke(dark)} />
          </g>
        ))}
        <line x1="88" y1="118" x2="188" y2="118" stroke={stroke(dark)} />
        <text x="88" y="132" fill={textPrimary(dark)} fontSize="8" fontWeight="700">
          TOTAL
        </text>
        <text x="188" y="132" textAnchor="end" fill={ACCENT} fontSize="9" fontWeight="700">
          $2,480
        </text>
      </motion.g>

      <motion.g
        animate={{
          opacity: [0, 0, 1, 1, 0.35],
          scale: [0.8, 0.8, 1.05, 1, 1],
          rotate: [-8, -8, -4, -4, -4],
        }}
        transition={{ duration: 4.5, repeat: Infinity, ease: EASE, times: [0, 0.45, 0.55, 0.85, 1] }}
      >
        <rect x="150" y="72" width="52" height="22" rx="6" fill={ACCENT} opacity="0.92" />
        <text x="176" y="87" textAnchor="middle" fill="#fff" fontSize="7" fontWeight="800">
          PAID
        </text>
      </motion.g>

      <motion.path
        d="M36 92 L44 100 L62 78"
        stroke={ACCENT}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: [0, 0, 1, 1], opacity: [0, 0, 1, 0.6] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: EASE, times: [0, 0.5, 0.65, 1] }}
      />

      {[0, 1].map((i) => (
        <motion.rect
          key={i}
          x="28"
          y={148 + i * 14}
          width={88 + i * 16}
          height="8"
          rx="4"
          fill={fillCol(dark)}
          stroke={stroke(dark)}
          animate={{ opacity: [0.45, 0.9, 0.45] }}
          transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.35, ease: 'easeInOut' }}
        />
      ))}

      <motion.circle
        cx="248"
        cy="28"
        r="5"
        fill={ACCENT}
        filter={`url(#${uid}-glow)`}
        animate={{ scale: [1, 1.15, 1], opacity: [0.45, 1, 0.45] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
      />
    </BoardShell>
  )
}

/** Inventory — warehouse grid with stock levels and reorder alert */
function InventoryIllustration({ dark, uid }: { dark: boolean; uid: string }) {
  const slots = [
    { x: 24, y: 38, level: 0.85 },
    { x: 78, y: 38, level: 0.55 },
    { x: 132, y: 38, level: 0.25 },
    { x: 186, y: 38, level: 0.7 },
    { x: 24, y: 92, level: 0.6 },
    { x: 78, y: 92, level: 0.4 },
    { x: 132, y: 92, level: 0.9 },
    { x: 186, y: 92, level: 0.35 },
  ]

  return (
    <BoardShell dark={dark} uid={uid}>
      <text x="28" y="30" fill={labelFill(dark)} fontSize="7" fontWeight="600" letterSpacing="0.08em">
        WAREHOUSE STOCK
      </text>

      {slots.map((slot, i) => {
        const low = slot.level < 0.35
        return (
          <g key={i}>
            <rect
              x={slot.x}
              y={slot.y}
              width="44"
              height="44"
              rx="8"
              fill={fillCol(dark)}
              stroke={low ? ACCENT : stroke(dark)}
              strokeWidth={low ? 1.5 : 1}
            />
            <rect x={slot.x + 6} y={slot.y + 34} width="32" height="4" rx="2" fill={fillPanel(dark)} />
            <motion.rect
              x={slot.x + 6}
              y={slot.y + 34 - 24 * slot.level}
              width="32"
              height={24 * slot.level}
              rx="2"
              fill={low ? ACCENT : fillCol(dark)}
              animate={low ? { opacity: [0.55, 1, 0.55] } : { opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2.8, repeat: Infinity, delay: i * 0.08, ease: 'easeInOut' }}
            />
          </g>
        )
      })}

      <motion.g
        animate={{ x: [0, 6, 0], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <rect x="28" y="148" width="96" height="18" rx="7" fill={dark ? 'rgba(245,99,15,0.16)' : 'rgba(245,99,15,0.08)'} stroke={ACCENT} />
        <text x="76" y="160" textAnchor="middle" fill={ACCENT} fontSize="6.5" fontWeight="700">
          REORDER
        </text>
      </motion.g>

      <motion.path
        d="M196 156 L214 156 L205 146"
        stroke={ACCENT}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        animate={{ x: [0, 8, 0], opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
      />
    </BoardShell>
  )
}

/** Custom web app — modular widgets assemble into a tailored dashboard */
function CustomWebIllustration({ dark, uid }: { dark: boolean; uid: string }) {
  const widgets = [
    { x: 92, y: 34, w: 88, h: 34, delay: 0 },
    { x: 92, y: 76, w: 42, h: 34, delay: 0.15 },
    { x: 138, y: 76, w: 42, h: 34, delay: 0.3 },
    { x: 92, y: 118, w: 88, h: 34, delay: 0.45 },
  ]

  return (
    <BoardShell dark={dark} uid={uid}>
      <rect x="20" y="28" width="56" height="124" rx="9" fill={fillCol(dark)} stroke={stroke(dark)} />
      {[0, 1, 2, 3].map((i) => (
        <motion.rect
          key={i}
          x="30"
          y={40 + i * 22}
          width="36"
          height="8"
          rx="4"
          fill={i === 0 ? ACCENT : fillPanel(dark)}
          animate={i === 0 ? { opacity: [0.6, 1, 0.6] } : {}}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}

      {widgets.map((w, i) => (
        <motion.g
          key={i}
          initial={{ opacity: 0, scale: 0.92, y: 8 }}
          animate={{ opacity: [0.55, 1, 1], scale: 1, y: 0 }}
          transition={{
            duration: 3.6,
            repeat: Infinity,
            delay: w.delay,
            ease: EASE,
            times: [0, 0.25, 1],
          }}
        >
          <rect
            x={w.x}
            y={w.y}
            width={w.w}
            height={w.h}
            rx="8"
            fill={fillCol(dark)}
            stroke={i === 0 ? ACCENT : stroke(dark)}
            strokeWidth={i === 0 ? 1.5 : 1}
          />
          {i === 0 && (
            <>
              {[0, 1, 2, 3].map((b) => (
                <motion.rect
                  key={b}
                  x={w.x + 10 + b * 16}
                  y={w.y + 18}
                  width="8"
                  height={[12, 18, 10, 22][b]}
                  rx="2"
                  fill={b === 2 ? ACCENT : fillPanel(dark)}
                  animate={{ height: [[12, 18, 10, 22][b], [16, 14, 16, 18][b], [12, 18, 10, 22][b]] }}
                  transition={{ duration: 2.8, repeat: Infinity, delay: b * 0.1, ease: 'easeInOut' }}
                />
              ))}
            </>
          )}
          {i > 0 && (
            <>
              <rect x={w.x + 10} y={w.y + 12} width={w.w - 20} height="3" rx="1.5" fill={stroke(dark)} />
              <rect x={w.x + 10} y={w.y + 20} width={w.w - 28} height="3" rx="1.5" fill={stroke(dark)} />
            </>
          )}
        </motion.g>
      ))}

      <motion.g
        animate={{ rotate: [0, 8, 0], opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      >
        <text x="34" y="166" fill={ACCENT} fontSize="11" fontWeight="700">
          {'{ }'}
        </text>
      </motion.g>
    </BoardShell>
  )
}

/** Finance — balance count-up, ledger rows, trend chart */
function FinanceIllustration({ dark, uid }: { dark: boolean; uid: string }) {
  return <AccountsIllustration dark={dark} uid={uid} />
}

/** PM kept for backward compatibility */
function PmIllustration({ dark, uid }: { dark: boolean; uid: string }) {
  const cols = ['To Do', 'In Progress', 'Done']
  const colX = [20, 102, 184]

  return (
    <BoardShell dark={dark} uid={uid}>
      {cols.map((label, i) => (
        <g key={label}>
          <rect x={colX[i]} y="34" width="76" height="108" rx="9" fill={fillCol(dark)} stroke={stroke(dark)} />
          <text
            x={colX[i] + 38}
            y="48"
            textAnchor="middle"
            fill={labelFill(dark)}
            fontSize="6.5"
            fontWeight="600"
            letterSpacing="0.03em"
          >
            {label.toUpperCase()}
          </text>
        </g>
      ))}

      {/* Static cards */}
      <rect x="26" y="88" width="64" height="18" rx="6" fill={fillCol(dark)} stroke={stroke(dark)} />
      <rect x="190" y="56" width="64" height="20" rx="6" fill={fillCol(dark)} stroke={stroke(dark)} />
      <rect x="190" y="82" width="64" height="16" rx="6" fill={fillCol(dark)} stroke={stroke(dark)} />

      {/* Moving task */}
      <motion.g
        filter={`url(#${uid}-shadow)`}
        animate={{ x: [0, 82, 164], y: [0, -2, 0] }}
        transition={{ duration: 4.2, repeat: Infinity, ease: EASE, times: [0, 0.45, 1] }}
      >
        <rect
          x="26"
          y="56"
          width="64"
          height="28"
          rx="7"
          fill={dark ? 'rgba(245,99,15,0.2)' : 'rgba(245,99,15,0.1)'}
          stroke={ACCENT}
          strokeWidth="1.5"
        />
        <rect x="34" y="66" width="40" height="3.5" rx="1.75" fill={ACCENT} opacity="0.75" />
        <rect x="34" y="73" width="28" height="2.5" rx="1.25" fill={stroke(dark)} />
      </motion.g>

      {/* Team status dots — light up as task completes */}
      {[0, 1, 2].map((i) => (
        <motion.circle
          key={i}
          cx={218 + i * 12}
          cy="22"
          r="4.5"
          fill={fillCol(dark)}
          stroke={stroke(dark)}
          strokeWidth="1"
          animate={{
            fill: [
              fillCol(dark),
              i === 0 ? ACCENT : fillCol(dark),
              i <= 1 ? ACCENT : fillCol(dark),
              ACCENT,
            ],
            scale: [1, 1, 1.15, 1],
          }}
          transition={{ duration: 4.2, repeat: Infinity, ease: EASE, times: [0, 0.4, 0.7, 1] }}
        />
      ))}

      {/* Progress track */}
      <rect x="20" y="152" width="240" height="5" rx="2.5" fill={fillCol(dark)} />
      <motion.rect
        x="20"
        y="152"
        height="5"
        rx="2.5"
        fill={ACCENT}
        animate={{ width: [48, 132, 204, 156, 216] }}
        transition={{ duration: 4.2, repeat: Infinity, ease: EASE }}
      />
    </BoardShell>
  )
}

/** Accounts — balance count-up, staggered chart, invoice flow */
function AccountsIllustration({ dark, uid }: { dark: boolean; uid: string }) {
  const bars = [28, 42, 35, 52, 38, 58, 46]
  const barX = 168

  return (
    <BoardShell dark={dark} uid={uid}>
      <text x="28" y="40" fill={labelFill(dark)} fontSize="7" fontWeight="600" letterSpacing="0.12em">
        BALANCE
      </text>
      <AnimatedBalance dark={dark} />

      {/* Invoice rows */}
      {[0, 1, 2].map((i) => (
        <motion.g
          key={i}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: [0.55, 1, 0.55], x: [0, 2, 0] }}
          transition={{ duration: 3, repeat: Infinity, delay: i * 0.35, ease: 'easeInOut' }}
        >
          <rect x="28" y={78 + i * 26} width="108" height="20" rx="7" fill={fillCol(dark)} stroke={stroke(dark)} />
          <rect x="36" y={86 + i * 26} width="44" height="3" rx="1.5" fill={stroke(dark)} />
          <motion.rect
            x="108"
            y={86 + i * 26}
            width="20"
            height="3"
            rx="1.5"
            fill={ACCENT}
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
          />
        </motion.g>
      ))}

      {/* Chart bars — grow from baseline */}
      <line x1={barX - 4} y1="132" x2={barX + 108} y2="132" stroke={stroke(dark)} strokeWidth="1" />
      {bars.map((h, i) => (
        <motion.rect
          key={i}
          x={barX + i * 14}
          width="9"
          rx="2.5"
          fill={i === 5 ? ACCENT : fillCol(dark)}
          initial={{ height: 0, y: 132 }}
          animate={{
            height: [0, h, h * 0.85, h],
            y: [132, 132 - h, 132 - h * 0.85, 132 - h],
          }}
          transition={{
            duration: 2.8,
            repeat: Infinity,
            delay: i * 0.08,
            ease: EASE,
            repeatDelay: 0.8,
          }}
        />
      ))}

      {/* Payment ripple */}
      <motion.circle
        cx="248"
        cy="28"
        r="5"
        fill={ACCENT}
        filter={`url(#${uid}-glow)`}
        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.circle
        cx="248"
        cy="28"
        r="10"
        stroke={ACCENT}
        strokeWidth="1"
        fill="none"
        animate={{ scale: [0.6, 1.4], opacity: [0.5, 0] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut' }}
      />
    </BoardShell>
  )
}

/** HR — org chart draws in; team pulses; leave calendar highlights */
function HrIllustration({ dark, uid }: { dark: boolean; uid: string }) {
  const teamX = [48, 112, 176]

  return (
    <BoardShell dark={dark} uid={uid}>
      {/* Manager node */}
      <motion.g
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: [0, -2, 0] }}
        transition={{
          opacity: { duration: 0.5 },
          y: { duration: 3.5, repeat: Infinity, ease: 'easeInOut' },
        }}
      >
        <rect
          x="108"
          y="32"
          width="64"
          height="38"
          rx="9"
          fill={fillCol(dark)}
          stroke={ACCENT}
          strokeWidth="1.5"
        />
        <PersonIcon cx={140} cy={52} dark={dark} accent />
        <rect x="120" y="60" width="40" height="3" rx="1.5" fill={stroke(dark)} />
      </motion.g>

      {/* Connectors — draw sequence */}
      <DrawLine x1={140} y1={70} x2={140} y2={82} dark={dark} delay={0.2} />
      <DrawLine x1={76} y1={82} x2={204} y2={82} dark={dark} delay={0.35} />
      <DrawLine x1={76} y1={82} x2={76} y2={94} dark={dark} delay={0.5} />
      <DrawLine x1={140} y1={82} x2={140} y2={94} dark={dark} delay={0.55} />
      <DrawLine x1={204} y1={82} x2={204} y2={94} dark={dark} delay={0.6} />

      {/* Team nodes */}
      {teamX.map((x, i) => (
        <motion.g
          key={x}
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: [0.7, 1, 0.7], scale: 1 }}
          transition={{
            opacity: { duration: 2.8, repeat: Infinity, delay: 0.7 + i * 0.25 },
            scale: { duration: 0.5, delay: 0.6 + i * 0.15 },
          }}
        >
          <rect x={x} y="94" width="56" height="38" rx="8" fill={fillCol(dark)} stroke={stroke(dark)} />
          <PersonIcon cx={x + 28} cy={110} dark={dark} accent={i === 1} />
          <rect x={x + 12} y="120" width="32" height="2.5" rx="1.25" fill={stroke(dark)} />
        </motion.g>
      ))}

      {/* Leave calendar */}
      <rect x="28" y="148" width="224" height="22" rx="7" fill={fillCol(dark)} stroke={stroke(dark)} />
      {[0, 1, 2, 3, 4, 5, 6].map((d) => (
        <motion.rect
          key={d}
          x={36 + d * 30}
          y="154"
          width="22"
          height="10"
          rx="3"
          fill={d >= 3 && d <= 4 ? ACCENT : fillPanel(dark)}
          animate={
            d === 3
              ? { opacity: [0.45, 1, 0.45], scale: [1, 1.06, 1] }
              : d === 4
                ? { opacity: [0.45, 0.9, 0.45] }
                : {}
          }
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: d * 0.1 }}
        />
      ))}
    </BoardShell>
  )
}

export default function SolutionCardIllustration({ variant, dark }: Props) {
  const uid = useId().replace(/:/g, '')

  return (
    <div className="absolute inset-0 flex items-center justify-center px-2 pt-11 pb-1 pointer-events-none">
      {variant === 'crm' && <CrmIllustration dark={dark} uid={uid} />}
      {variant === 'erp' && <ErpIllustration dark={dark} uid={uid} />}
      {variant === 'hr' && <HrIllustration dark={dark} uid={uid} />}
      {variant === 'finance' && <FinanceIllustration dark={dark} uid={uid} />}
      {variant === 'lead-gen' && <LeadGenIllustration dark={dark} uid={uid} />}
      {variant === 'invoice' && <InvoiceIllustration dark={dark} uid={uid} />}
      {variant === 'inventory' && <InventoryIllustration dark={dark} uid={uid} />}
      {variant === 'custom-web' && <CustomWebIllustration dark={dark} uid={uid} />}
    </div>
  )
}
