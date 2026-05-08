'use client';

import { WorkspaceHeader } from '@webfudge/ui';
import notificationService from '../lib/api/notificationService';

export default function VLMPageHeader({
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
  hasActiveFilters = false,
  onImportClick,
  onExportClick,
  onShareImageClick,
  actions,
  children,
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
      hasActiveFilters={hasActiveFilters}
      onImportClick={onImportClick}
      onExportClick={onExportClick}
      onShareImageClick={onShareImageClick}
      actions={actions}
      notificationService={notificationService}
      searchInputClassName="w-64 pl-10 pr-4 py-2.5 bg-white border border-orange-500/40 rounded-full text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all duration-300 placeholder:text-gray-400 text-gray-800"
    >
      {children}
    </WorkspaceHeader>
  );
}

