'use client'

import React from 'react'

interface ContainerProps {
  children: React.ReactNode
  className?: string
  as?: keyof JSX.IntrinsicElements
}

export default function Container({ children, className = '', as: Tag = 'div' }: ContainerProps) {
  return (
    <Tag className={`mx-auto px-4 sm:px-6 lg:px-8 w-full max-w-[1400px] ${className}`}>
      {children}
    </Tag>
  )
}
