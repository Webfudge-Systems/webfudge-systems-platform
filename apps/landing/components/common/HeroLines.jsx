'use client'

/**
 * Hero radiating lines SVG - base lines always visible; glowing segment moves along to show current flow.
 */
export default function HeroLines() {
  return (
    <svg
      className="w-full h-auto min-w-0 object-contain scale-110 lines-svg"
      viewBox="0 0 1515 334"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <filter id="hero-line-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {/* Base lines — always fully visible */}
      <path
        className="hero-line-base"
        d="M54 0.930664C616.85 222.415 932.185 221.771 1494 0.930664"
        stroke="#FFC7A8"
        strokeWidth="2"
      />
      <path
        className="hero-line-base"
        d="M54 332.431C616.85 111.443 932.185 112.085 1494 332.431"
        stroke="#FFC7A8"
        strokeWidth="2"
      />
      <line className="hero-line-base" y1="166.931" x2="1515" y2="166.931" stroke="#FFC7A8" strokeWidth="2" />
      <path
        className="hero-line-base"
        d="M49 242.931C611.839 142.179 927.172 143.685 1489 242.931"
        stroke="#FFC7A8"
        strokeWidth="2"
      />
      <path
        className="hero-line-base"
        d="M49 91.9307C611.839 192.682 927.172 191.176 1489 91.9307"
        stroke="#FFC7A8"
        strokeWidth="2"
      />
      {/* Glow — expands from center outward */}
      <path
        className="hero-line-glow hero-line-glow-0"
        d="M54 0.930664C616.85 222.415 932.185 221.771 1494 0.930664"
        stroke="#FF9B7A"
        strokeWidth="4"
        filter="url(#hero-line-glow)"
        pathLength="1000"
      />
      <path
        className="hero-line-glow hero-line-glow-1"
        d="M54 332.431C616.85 111.443 932.185 112.085 1494 332.431"
        stroke="#FF9B7A"
        strokeWidth="4"
        filter="url(#hero-line-glow)"
        pathLength="1000"
      />
      <line
        className="hero-line-glow hero-line-glow-center"
        y1="166.931"
        x2="1515"
        y2="166.931"
        stroke="#FF9B7A"
        strokeWidth="4"
        filter="url(#hero-line-glow)"
        pathLength="1000"
      />
      <path
        className="hero-line-glow hero-line-glow-2"
        d="M49 242.931C611.839 142.179 927.172 143.685 1489 242.931"
        stroke="#FF9B7A"
        strokeWidth="4"
        filter="url(#hero-line-glow)"
        pathLength="1000"
      />
      <path
        className="hero-line-glow hero-line-glow-3"
        d="M49 91.9307C611.839 192.682 927.172 191.176 1489 91.9307"
        stroke="#FF9B7A"
        strokeWidth="4"
        filter="url(#hero-line-glow)"
        pathLength="1000"
      />
    </svg>
  )
}
