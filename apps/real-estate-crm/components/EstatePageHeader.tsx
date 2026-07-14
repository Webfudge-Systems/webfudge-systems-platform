'use client'

import type { ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { AppPageHeader } from '@webfudge/ui'
import notificationService from '../lib/api/notificationService'

interface BreadcrumbItem {
  label: string
  href?: string
}

interface EstatePageHeaderProps {
  title?: string
  subtitle?: string
  breadcrumb?: BreadcrumbItem[]
  showActions?: boolean
  showProfile?: boolean
  showBack?: boolean
  onBack?: () => void
  backLabel?: string
  onAddClick?: () => void
  onFilterClick?: () => void
  onImportClick?: () => void
  onExportClick?: () => void
  hasActiveFilters?: boolean
  actions?: ReactNode
  children?: ReactNode
  onProfileClick?: () => void
  onSettingsClick?: () => void
}

export default function EstatePageHeader({ showBack, ...props }: EstatePageHeaderProps) {
  const pathname = usePathname()
  const router = useRouter()
  const defaultShowBack = pathname !== '/'

  return (
    <AppPageHeader
      {...props}
      showBack={showBack ?? defaultShowBack}
      notificationService={notificationService}
      onProfileClick={props.onProfileClick ?? (() => router.push('/settings'))}
      onSettingsClick={props.onSettingsClick ?? (() => router.push('/settings'))}
    />
  )
}
