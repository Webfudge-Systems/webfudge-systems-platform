'use client'

import { useEffect, useId, useState } from 'react'
import { animate, motion, useMotionValue } from 'framer-motion'

const ACCENT = '#F5630F'
const EASE = [0.22, 1, 0.36, 1] as const

type Variant = 'crm' | 'pm' | 'accounts' | 'hr'
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

/** PM — kanban task flows; progress + team status sync */
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
      {variant === 'pm' && <PmIllustration dark={dark} uid={uid} />}
      {variant === 'accounts' && <AccountsIllustration dark={dark} uid={uid} />}
      {variant === 'hr' && <HrIllustration dark={dark} uid={uid} />}
    </div>
  )
}
