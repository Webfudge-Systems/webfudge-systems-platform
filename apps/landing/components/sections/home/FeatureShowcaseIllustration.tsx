'use client'

import { useId } from 'react'
import { motion } from 'framer-motion'

type Props = {
  index: number
  dark: boolean
  accent: string
}

const EASE = [0.22, 1, 0.36, 1] as const

const stroke = (dark: boolean) => (dark ? 'rgba(255,255,255,0.18)' : 'rgba(245,99,15,0.22)')
const fillSoft = (dark: boolean) => (dark ? 'rgba(255,255,255,0.06)' : 'rgba(245,99,15,0.06)')
const fillMid = (dark: boolean) => (dark ? 'rgba(255,255,255,0.12)' : 'rgba(245,99,15,0.1)')

function IllustrationDefs({ uid, dark }: { uid: string; dark: boolean }) {
  return (
    <defs>
      <linearGradient id={`${uid}-line`} x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor={dark ? 'rgba(255,255,255,0.05)' : 'rgba(245,99,15,0.1)'} />
        <stop offset="50%" stopColor={dark ? 'rgba(255,255,255,0.35)' : 'rgba(245,99,15,0.45)'} />
        <stop offset="100%" stopColor={dark ? 'rgba(255,255,255,0.05)' : 'rgba(245,99,15,0.1)'} />
      </linearGradient>
      <filter id={`${uid}-glow`} x="-80%" y="-80%" width="260%" height="260%">
        <feGaussianBlur stdDeviation="3" result="b" />
        <feMerge>
          <feMergeNode in="b" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <filter id={`${uid}-shadow`} x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#000" floodOpacity={dark ? 0.25 : 0.07} />
      </filter>
    </defs>
  )
}

function NodeCard({
  cx,
  cy,
  accent,
  dark,
  uid,
  highlight,
  delay = 0,
}: {
  cx: number
  cy: number
  accent: string
  dark: boolean
  uid: string
  highlight?: boolean
  delay?: number
}) {
  const w = 56
  const h = 44
  const x = cx - w / 2
  const y = cy - h / 2
  const s = stroke(dark)

  return (
    <motion.g
      filter={`url(#${uid}-shadow)`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1, y: [0, -3, 0] }}
      transition={{
        opacity: { duration: 0.5, delay },
        scale: { duration: 0.5, delay },
        y: { duration: 3.5 + delay * 0.5, repeat: Infinity, ease: 'easeInOut', delay },
      }}
    >
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx="10"
        fill={fillSoft(dark)}
        stroke={highlight ? accent : s}
        strokeWidth={highlight ? 1.75 : 1.25}
      />
      <rect x={x + 10} y={y + 10} width={w - 20} height="5" rx="2.5" fill={accent} opacity={highlight ? 0.65 : 0.4} />
      <rect x={x + 10} y={y + 20} width={w - 28} height="3.5" rx="1.75" fill={s} />
      <rect x={x + 10} y={y + 28} width={w - 22} height="3.5" rx="1.75" fill={s} opacity="0.7" />
    </motion.g>
  )
}

function NetworkPath({
  d,
  uid,
  dark,
  delay = 0,
}: {
  d: string
  uid: string
  dark: boolean
  delay?: number
}) {
  return (
    <>
      <motion.path
        d={d}
        stroke={stroke(dark)}
        strokeWidth="1.25"
        fill="none"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: [0.35, 0.65, 0.35] }}
        transition={{
          pathLength: { duration: 1.4, delay, ease: EASE },
          opacity: { duration: 3, repeat: Infinity, delay: delay + 0.5, ease: 'easeInOut' },
        }}
      />
      <motion.path
        d={d}
        stroke={`url(#${uid}-line)`}
        strokeWidth="1.5"
        fill="none"
        strokeDasharray="5 9"
        animate={{ strokeDashoffset: [0, -28] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: 'linear', delay }}
      />
    </>
  )
}

function DataPacket({
  path,
  accent,
  uid,
  dur = '3.2s',
  delay = '0s',
}: {
  path: string
  accent: string
  uid: string
  dur?: string
  delay?: string
}) {
  return (
    <circle r="5" fill={accent} filter={`url(#${uid}-glow)`}>
      <animateMotion dur={dur} repeatCount="indefinite" begin={delay} path={path} />
      <animate attributeName="opacity" values="0.35;1;0.35" dur={dur} repeatCount="indefinite" begin={delay} />
    </circle>
  )
}

/** 01 — Diamond network: scalable nodes + secure shield */
function ScalabilityIllustration({
  dark,
  accent,
  uid,
}: {
  dark: boolean
  accent: string
  uid: string
}) {
  const top = { cx: 200, cy: 108 }
  const left = { cx: 88, cy: 200 }
  const right = { cx: 312, cy: 200 }
  const bottom = { cx: 200, cy: 268 }

  const paths = {
    tl: `M${top.cx} ${top.cy + 22} L${left.cx + 28} ${left.cy - 22}`,
    tr: `M${top.cx} ${top.cy + 22} L${right.cx - 28} ${right.cy - 22}`,
    bl: `M${left.cx + 28} ${left.cy + 22} L${bottom.cx} ${bottom.cy - 22}`,
    br: `M${right.cx - 28} ${right.cy + 22} L${bottom.cx} ${bottom.cy - 22}`,
  }

  return (
    <svg viewBox="0 0 400 320" fill="none" className="w-full h-full" aria-hidden>
      <IllustrationDefs uid={uid} dark={dark} />

      {Object.values(paths).map((d, i) => (
        <NetworkPath key={d} d={d} uid={uid} dark={dark} delay={i * 0.12} />
      ))}

      <NodeCard cx={left.cx} cy={left.cy} accent={accent} dark={dark} uid={uid} delay={0.1} />
      <NodeCard cx={right.cx} cy={right.cy} accent={accent} dark={dark} uid={uid} delay={0.2} />
      <NodeCard cx={bottom.cx} cy={bottom.cy} accent={accent} dark={dark} uid={uid} delay={0.3} />

      {/* Top node + shield */}
      <NodeCard cx={top.cx} cy={top.cy} accent={accent} dark={dark} uid={uid} highlight delay={0} />
      <motion.g
        animate={{ opacity: [0.75, 1, 0.75], scale: [1, 1.04, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      >
        <path
          d={`M${top.cx} ${top.cy - 38} L${top.cx + 26} ${top.cy - 28} V${top.cy - 2} C${top.cx + 26} ${top.cy + 16} ${top.cx} ${top.cy + 24} ${top.cx} ${top.cy + 24} C${top.cx} ${top.cy + 24} ${top.cx - 26} ${top.cy + 16} ${top.cx - 26} ${top.cy - 2} V${top.cy - 28} Z`}
          fill={fillMid(dark)}
          stroke={accent}
          strokeWidth="1.5"
        />
        <motion.path
          d={`M${top.cx - 8} ${top.cy - 6} L${top.cx - 2} ${top.cy} L${top.cx + 10} ${top.cy - 14}`}
          stroke={accent}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.8, delay: 0.5, ease: EASE }}
        />
      </motion.g>

      <DataPacket path={paths.tl} accent={accent} uid={uid} dur="3.4s" delay="0s" />
      <DataPacket path={paths.tr} accent={accent} uid={uid} dur="3.4s" delay="1.1s" />
      <DataPacket path={paths.bl} accent={accent} uid={uid} dur="3s" delay="0.6s" />
      <DataPacket path={paths.br} accent={accent} uid={uid} dur="3s" delay="1.7s" />

      {/* Center hub pulse */}
      <motion.circle
        cx="200"
        cy="188"
        r="6"
        fill={accent}
        filter={`url(#${uid}-glow)`}
        animate={{ scale: [0.85, 1.2, 0.85], opacity: [0.25, 0.7, 0.25] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
      />
    </svg>
  )
}

/** 02 — Clean UI panel + guided cursor */
function UsabilityIllustration({ dark, accent, uid }: { dark: boolean; accent: string; uid: string }) {
  const s = stroke(dark)
  return (
    <svg viewBox="0 0 400 320" fill="none" className="w-full h-full" aria-hidden>
      <IllustrationDefs uid={uid} dark={dark} />
      <motion.g
        filter={`url(#${uid}-shadow)`}
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      >
        <rect x="72" y="64" width="256" height="192" rx="16" fill={fillSoft(dark)} stroke={accent} strokeWidth="1.5" />
        <rect x="72" y="64" width="256" height="36" rx="16" fill={fillMid(dark)} />
        <rect x="72" y="88" width="256" height="12" fill={fillMid(dark)} />
        <circle cx="92" cy="82" r="5" fill="#ff6b6b" opacity="0.8" />
        <circle cx="108" cy="82" r="5" fill="#ffd166" opacity="0.8" />
        <circle cx="124" cy="82" r="5" fill="#06d6a0" opacity="0.8" />
        <rect x="88" y="112" width="72" height="128" rx="10" fill={fillMid(dark)} stroke={s} strokeWidth="1" />
        {[0, 1, 2, 3].map((i) => (
          <motion.rect
            key={i}
            x="96"
            y={124 + i * 26}
            width="56"
            height="16"
            rx="5"
            fill={fillSoft(dark)}
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2.2, repeat: Infinity, delay: i * 0.25 }}
          />
        ))}
        {[0, 1, 2].map((i) => (
          <motion.rect
            key={`row-${i}`}
            x="176"
            y={116 + i * 44}
            width="136"
            height="32"
            rx="8"
            fill={fillSoft(dark)}
            stroke={i === 1 ? accent : s}
            strokeWidth={i === 1 ? 1.5 : 1}
            animate={i === 1 ? { opacity: [0.6, 1, 0.6] } : { opacity: [0.5, 0.75, 0.5] }}
            transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.3 }}
          />
        ))}
      </motion.g>
      <motion.g
        animate={{ x: [0, 24, 8, 0], y: [0, 16, 32, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: EASE }}
      >
        <path
          d="M292 228 L292 252 L280 246 L274 262 L268 228 Z"
          fill={accent}
          filter={`url(#${uid}-glow)`}
        />
      </motion.g>
    </svg>
  )
}

/** 03 — Growth bars + rising trend */
function AffordabilityIllustration({ dark, accent, uid }: { dark: boolean; accent: string; uid: string }) {
  const bars = [
    { x: 70, h: 52 },
    { x: 118, h: 78 },
    { x: 166, h: 64 },
    { x: 214, h: 108 },
    { x: 262, h: 88 },
  ]
  const baseline = 248

  return (
    <svg viewBox="0 0 400 320" fill="none" className="w-full h-full" aria-hidden>
      <IllustrationDefs uid={uid} dark={dark} />
      <rect x="48" y="56" width="304" height="200" rx="16" fill={fillSoft(dark)} stroke={stroke(dark)} strokeWidth="1" />
      <line x1="64" y1={baseline} x2="336" y2={baseline} stroke={stroke(dark)} strokeWidth="1.25" />
      {bars.map(({ x, h }, i) => (
        <motion.rect
          key={x}
          x={x}
          width="36"
          rx="7"
          fill={i === 3 ? fillMid(dark) : fillSoft(dark)}
          stroke={i === 3 ? accent : stroke(dark)}
          strokeWidth={i === 3 ? 1.5 : 1}
          initial={{ height: 0, y: baseline }}
          animate={{
            height: [0, h, h * 0.9, h],
            y: [baseline, baseline - h, baseline - h * 0.9, baseline - h],
          }}
          transition={{ duration: 2.8, repeat: Infinity, delay: i * 0.12, ease: EASE, repeatDelay: 0.6 }}
        />
      ))}
      <motion.path
        d="M64 210 Q120 150 180 175 T320 95"
        stroke={accent}
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0.5 }}
        animate={{ pathLength: 1, opacity: [0.5, 1, 0.5] }}
        transition={{
          pathLength: { duration: 2, repeat: Infinity, repeatType: 'reverse', ease: EASE },
          opacity: { duration: 3, repeat: Infinity },
        }}
      />
      <motion.circle
        cx="320"
        cy="95"
        r="6"
        fill={accent}
        filter={`url(#${uid}-glow)`}
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
    </svg>
  )
}

/** 04 — Support rings + uptime timeline */
function SupportIllustration({ dark, accent, uid }: { dark: boolean; accent: string; uid: string }) {
  return (
    <svg viewBox="0 0 400 320" fill="none" className="w-full h-full" aria-hidden>
      <IllustrationDefs uid={uid} dark={dark} />
      {[0, 1, 2].map((ring) => (
        <motion.circle
          key={ring}
          cx="200"
          cy="148"
          r={44 + ring * 28}
          stroke={ring === 0 ? accent : stroke(dark)}
          strokeWidth="1.25"
          fill="none"
          strokeDasharray={ring === 0 ? 'none' : '4 10'}
          animate={{
            scale: [1, 1.04, 1],
            opacity: ring === 0 ? [0.5, 0.9, 0.5] : [0.3, 0.6, 0.3],
          }}
          transition={{ duration: 3 + ring * 0.5, repeat: Infinity, ease: 'easeInOut', delay: ring * 0.2 }}
        />
      ))}
      <motion.g filter={`url(#${uid}-shadow)`}>
        <circle cx="200" cy="148" r="32" fill={fillMid(dark)} stroke={accent} strokeWidth="1.5" />
        <motion.path
          d="M200 128 L200 148 L222 160"
          stroke={accent}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          animate={{ rotate: [0, 8, 0] }}
          style={{ transformOrigin: '200px 148px' }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />
      </motion.g>
      <rect x="88" y="228" width="224" height="36" rx="10" fill={fillSoft(dark)} stroke={stroke(dark)} />
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.rect
          key={i}
          x={100 + i * 42}
          y="242"
          width="32"
          height="8"
          rx="4"
          fill={i >= 3 ? accent : fillMid(dark)}
          animate={{ opacity: [0.35, 1, 0.35] }}
          transition={{ duration: 2, repeat: Infinity, delay: i * 0.22 }}
        />
      ))}
    </svg>
  )
}

/** 05 — Bento UI layout composition */
function DesignIllustration({ dark, accent, uid }: { dark: boolean; accent: string; uid: string }) {
  const s = stroke(dark)
  const blocks = [
    { x: 64, y: 72, w: 128, h: 100, primary: true },
    { x: 208, y: 72, w: 128, h: 52 },
    { x: 208, y: 136, w: 128, h: 72 },
    { x: 64, y: 184, w: 272, h: 56 },
  ]

  return (
    <svg viewBox="0 0 400 320" fill="none" className="w-full h-full" aria-hidden>
      <IllustrationDefs uid={uid} dark={dark} />
      <rect x="48" y="56" width="304" height="200" rx="16" fill={fillSoft(dark)} stroke={stroke(dark)} strokeWidth="1" />
      {blocks.map((box, i) => (
        <motion.g
          key={i}
          filter={box.primary ? `url(#${uid}-shadow)` : undefined}
          animate={{ y: [0, -2, 0] }}
          transition={{ duration: 3.2 + i * 0.2, repeat: Infinity, ease: 'easeInOut', delay: i * 0.15 }}
        >
          <rect
            x={box.x}
            y={box.y}
            width={box.w}
            height={box.h}
            rx="11"
            fill={fillSoft(dark)}
            stroke={box.primary ? accent : s}
            strokeWidth={box.primary ? 1.5 : 1}
          />
          {box.primary && (
            <>
              <motion.circle
                cx={box.x + 36}
                cy={box.y + 50}
                r="20"
                fill={accent}
                opacity="0.2"
                animate={{ scale: [1, 1.12, 1] }}
                transition={{ duration: 2.5, repeat: Infinity }}
              />
              <rect x={box.x + 16} y={box.y + 18} width={56} height="5" rx="2.5" fill={accent} opacity="0.5" />
              <rect x={box.x + 16} y={box.y + 30} width={80} height="4" rx="2" fill={s} />
            </>
          )}
        </motion.g>
      ))}
      {/* Alignment guides */}
      <motion.line
        x1="64"
        y1="68"
        x2="336"
        y2="68"
        stroke={accent}
        strokeWidth="1"
        strokeDasharray="4 6"
        animate={{ opacity: [0, 0.5, 0] }}
        transition={{ duration: 3, repeat: Infinity }}
      />
    </svg>
  )
}

/** 06 — Business hub with orbiting nodes */
function BusinessIllustration({ dark, accent, uid }: { dark: boolean; accent: string; uid: string }) {
  const s = stroke(dark)
  const satellites = [
    { x: 200, y: 58 },
    { x: 318, y: 158 },
    { x: 200, y: 258 },
    { x: 82, y: 158 },
  ]

  return (
    <svg viewBox="0 0 400 320" fill="none" className="w-full h-full" aria-hidden>
      <IllustrationDefs uid={uid} dark={dark} />
      {[0, 1].map((ring) => (
        <motion.circle
          key={ring}
          cx="200"
          cy="158"
          r={72 + ring * 32}
          stroke={s}
          strokeWidth="1"
          fill="none"
          strokeDasharray="3 12"
          animate={{ rotate: ring === 0 ? 360 : -360 }}
          style={{ transformOrigin: '200px 158px' }}
          transition={{ duration: 24 + ring * 10, repeat: Infinity, ease: 'linear' }}
        />
      ))}
      <motion.g filter={`url(#${uid}-shadow)`} animate={{ scale: [1, 1.03, 1] }} transition={{ duration: 3, repeat: Infinity }}>
        <rect x="168" y="128" width="64" height="60" rx="14" fill={fillMid(dark)} stroke={accent} strokeWidth="1.5" />
        <circle cx="200" cy="158" r="9" fill={accent} filter={`url(#${uid}-glow)`} />
      </motion.g>
      {satellites.map(({ x, y }, i) => (
        <motion.g
          key={i}
          animate={{ opacity: [0.45, 1, 0.45], scale: [0.95, 1.05, 0.95] }}
          transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.35 }}
        >
          <circle cx={x} cy={y} r="12" fill={fillSoft(dark)} stroke={accent} strokeWidth="1.5" />
          <circle cx={x} cy={y} r="4" fill={accent} opacity="0.7" />
        </motion.g>
      ))}
      {/* Connection spokes */}
      {satellites.map(({ x, y }, i) => {
        const len = Math.hypot(x - 200, y - 158)
        return (
          <motion.line
            key={`line-${i}`}
            x1="200"
            y1="158"
            x2={x}
            y2={y}
            stroke={s}
            strokeWidth="1"
            strokeDasharray={len}
            initial={{ strokeDashoffset: len, opacity: 0 }}
            animate={{ strokeDashoffset: 0, opacity: [0.2, 0.55, 0.2] }}
            transition={{
              strokeDashoffset: { duration: 0.7, delay: i * 0.12, ease: EASE },
              opacity: { duration: 3, repeat: Infinity, delay: i * 0.25 },
            }}
          />
        )
      })}
    </svg>
  )
}

function renderIllustration(index: number, dark: boolean, accent: string, uid: string) {
  switch (index) {
    case 0:
      return <ScalabilityIllustration dark={dark} accent={accent} uid={uid} />
    case 1:
      return <UsabilityIllustration dark={dark} accent={accent} uid={uid} />
    case 2:
      return <AffordabilityIllustration dark={dark} accent={accent} uid={uid} />
    case 3:
      return <SupportIllustration dark={dark} accent={accent} uid={uid} />
    case 4:
      return <DesignIllustration dark={dark} accent={accent} uid={uid} />
    case 5:
      return <BusinessIllustration dark={dark} accent={accent} uid={uid} />
    default:
      return <ScalabilityIllustration dark={dark} accent={accent} uid={uid} />
  }
}

export default function FeatureShowcaseIllustration({ index, dark, accent }: Props) {
  const uid = useId().replace(/:/g, '')

  return (
    <motion.div
      className="w-full h-full"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.65, ease: EASE }}
    >
      {renderIllustration(index, dark, accent, uid)}
    </motion.div>
  )
}
