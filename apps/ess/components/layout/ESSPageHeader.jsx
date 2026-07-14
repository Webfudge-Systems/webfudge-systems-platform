'use client'

import { usePathname } from 'next/navigation'
import { AppPageHeader } from '@webfudge/ui'

export default function ESSPageHeader({ showBack, ...props }) {
  const pathname = usePathname()
  const isOverview = pathname === '/overview' || pathname === '/'
  const defaultShowBack = !isOverview

  return (
    <AppPageHeader
      {...props}
      showBack={showBack ?? defaultShowBack}
      searchPlaceholder={props.searchPlaceholder ?? 'Search...'}
    />
  )
}
