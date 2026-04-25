'use client'

import { WorkspaceHeader } from '@webfudge/ui'
import GlobalSearchModal from './GlobalSearchModal'
import notificationService from '../lib/api/notificationService'

export default function CRMPageHeader({
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
  actions,
  children,
  hasActiveFilters = false,
}) {
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
      actions={actions}
      hasActiveFilters={hasActiveFilters}
      notificationService={notificationService}
      renderGlobalSearchModal={({ isOpen, onClose, initialQuery }) => (
        <GlobalSearchModal isOpen={isOpen} onClose={onClose} initialQuery={initialQuery} />
      )}
    >
      {children}
    </WorkspaceHeader>
  )
}
