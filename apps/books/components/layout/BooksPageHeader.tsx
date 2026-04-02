'use client'

import type { ReactNode } from 'react'
import { WorkspaceHeader } from '@webfudge/ui'
import notificationService from '@/lib/notificationService'

const BOOKS_SEARCH_INPUT_CLASS =
  'w-64 pl-10 pr-4 py-2.5 bg-white border border-orange-500/40 rounded-full text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all duration-300 placeholder:text-gray-400 text-gray-800'

type BreadcrumbItem = string | { label: string; href: string }

type BooksPageHeaderProps = {
  title: string
  subtitle: string
  breadcrumb?: BreadcrumbItem[]
  showSearch?: boolean
  showActions?: boolean
  showProfile?: boolean
  searchPlaceholder?: string
  onSearchChange?: (value: string) => void
  onAddClick?: () => void
  onFilterClick?: () => void
  onImportClick?: () => void
  onExportClick?: () => void
  onShareImageClick?: () => void
  hasActiveFilters?: boolean
  actions?: any
  children?: ReactNode
}

export default function BooksPageHeader({
  title,
  subtitle,
  breadcrumb = [],
  showSearch = false,
  showActions = false,
  showProfile = true,
  searchPlaceholder,
  onSearchChange,
  onAddClick,
  onFilterClick,
  onImportClick,
  onExportClick,
  onShareImageClick,
  hasActiveFilters,
  actions,
  children,
}: BooksPageHeaderProps) {
  return (
    <WorkspaceHeader
      title={title}
      subtitle={subtitle}
      breadcrumb={breadcrumb}
      showSearch={showSearch}
      showActions={showActions}
      showProfile={showProfile}
      searchPlaceholder={searchPlaceholder}
      onSearchChange={onSearchChange}
      onAddClick={onAddClick}
      onFilterClick={onFilterClick}
      onImportClick={onImportClick}
      onExportClick={onExportClick}
      onShareImageClick={onShareImageClick}
      hasActiveFilters={hasActiveFilters}
      actions={actions}
      searchInputClassName={BOOKS_SEARCH_INPUT_CLASS}
      notificationService={notificationService}
    >
      {children}
    </WorkspaceHeader>
  )
}
