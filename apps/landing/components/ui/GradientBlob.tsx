'use client'

import React from 'react'

interface GradientBlobProps {
  className?: string
  size?: number
  color?: string
  opacity?: number
  blur?: number
  animate?: 'a' | 'b' | 'c' | 'none'
}

export default function GradientBlob({
  className = '',
  size = 600,
  color = '#F5630F',
  opacity = 0.15,
  blur = 80,
  animate = 'none',
}: GradientBlobProps) {
  const animClass = animate !== 'none' ? `blob-${animate}` : ''

  return (
    <div
      className={`absolute rounded-full pointer-events-none ${animClass} ${className}`}
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
        opacity,
        filter: `blur(${blur}px)`,
        transform: 'translate(-50%, -50%)',
      }}
    />
  )
}
