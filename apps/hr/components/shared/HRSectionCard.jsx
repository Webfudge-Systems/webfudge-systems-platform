'use client'

import { Card } from '@webfudge/ui'

/**
 * Elevated content panel — replaces ad-hoc SECTION_CARD classes.
 */
export default function HRSectionCard({ children, className = '', padding = true, ...props }) {
  return (
    <Card
      variant="elevated"
      padding={padding}
      className={`rounded-xl ${className}`.trim()}
      {...props}
    >
      {children}
    </Card>
  )
}
