'use client'

import React from 'react'

interface MarqueeProps {
  children: React.ReactNode
  speed?: number
  className?: string
  direction?: 'left' | 'right'
  pauseOnHover?: boolean
}

export default function Marquee({
  children,
  speed = 30,
  className = '',
  direction = 'left',
  pauseOnHover = true,
}: MarqueeProps) {
  return (
    <div className={`overflow-hidden w-full ${className}`}>
      <div
        className="flex w-max"
        style={{
          animation: `marquee-left ${speed}s linear infinite`,
          animationDirection: direction === 'right' ? 'reverse' : 'normal',
        }}
      >
        <div className={`flex items-center gap-0 ${pauseOnHover ? 'hover:[animation-play-state:paused]' : ''}`}>
          {children}
        </div>
        <div className={`flex items-center gap-0 ${pauseOnHover ? 'hover:[animation-play-state:paused]' : ''}`} aria-hidden>
          {children}
        </div>
      </div>
    </div>
  )
}
