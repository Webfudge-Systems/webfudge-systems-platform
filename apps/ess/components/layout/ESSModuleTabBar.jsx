'use client'

import { TabsWithActions } from '@webfudge/ui'

/**
 * ESS module tab bar — matches HR list pages (`TabsWithActions` glass variant).
 */
export default function ESSModuleTabBar({
  tabs = [],
  activeTab,
  onTabChange,
  showAdd = false,
  onAddClick,
  addTitle = 'Add',
  showSearch = false,
  searchQuery = '',
  onSearchChange,
  searchPlaceholder = 'Search...',
  showFilter = false,
  onFilterClick,
  hasActiveFilters = false,
  className = '',
}) {
  const normalizedTabs = tabs.map((tab) => ({
    key: tab.key || tab.id,
    label: tab.label,
    ...(tab.badge !== undefined && tab.badge !== null ? { badge: String(tab.badge) } : {}),
  }))

  return (
    <TabsWithActions
      className={className}
      tabs={normalizedTabs}
      activeTab={activeTab}
      onTabChange={onTabChange}
      variant="glass"
      showAdd={showAdd && Boolean(onAddClick)}
      onAddClick={onAddClick}
      addTitle={addTitle}
      showSearch={showSearch}
      searchQuery={searchQuery}
      onSearchChange={onSearchChange}
      searchPlaceholder={searchPlaceholder}
      showFilter={showFilter}
      onFilterClick={onFilterClick}
      hasActiveFilters={hasActiveFilters}
    />
  )
}
