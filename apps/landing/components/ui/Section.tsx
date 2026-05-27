'use client'

import React from 'react'

interface SectionProps {
  children: React.ReactNode
  className?: string
  id?: string
  as?: keyof JSX.IntrinsicElements
}

export default function Section({ children, className = '', id, as: Tag = 'section' }: SectionProps) {
  return (
    <Tag id={id} className={`py-24 md:py-32 ${className}`}>
      {children}
    </Tag>
  )
}
