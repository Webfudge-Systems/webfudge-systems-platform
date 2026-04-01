'use client'

import { clsx } from 'clsx'
import { Search, Plus, List, LayoutGrid, Download, Eye, Filter, ListChecks } from 'lucide-react'

/**
 * Advanced Tabs component with integrated actions, search, and view toggles
 * Perfect for CRM-style list/board views with filtering and actions
 *
 * Variants:
 * - glass | modern | default — toolbar + tabs (list pages)
 * - pill — white pill-shaped track, evenly spaced tabs; active = solid orange pill, inactive = text only (detail pages)
 */
export function TabsWithActions({
  tabs,
  activeTab,
  onTabChange,

  // Search props
  showSearch = false,
  searchQuery = '',
  onSearchChange,
  searchPlaceholder = 'Search...',

  // Actions props
  showAdd = false,
  onAddClick,
  addTitle = 'Add New',

  showExport = false,
  onExportClick,
  exportTitle = 'Export',

  showFilter = false,
  onFilterClick,
  filterTitle = 'Filter',

  showBulkEdit = false,
  onBulkEditClick,
  bulkEditActive = false,
  bulkEditTitle = 'Bulk edit',

  showColumnVisibility = false,
  onColumnVisibilityClick,
  columnVisibilityTitle = 'Column Visibility',

  // View toggle props
  showViewToggle = false,
  activeView = 'list',
  onViewChange,
  viewOptions = ['list', 'board'],

  // Styling
  className,
  variant = 'glass',
  ...props
}) {
  const handleTabClick = (tabId) => {
    if (onTabChange) {
      onTabChange(tabId)
    }
  }

  const hasRightPanel =
    showSearch ||
    (showAdd && onAddClick) ||
    (showExport && onExportClick) ||
    (showFilter && onFilterClick) ||
    (showBulkEdit && onBulkEditClick) ||
    (showColumnVisibility && onColumnVisibilityClick) ||
    showViewToggle

  const isPill = variant === 'pill'

  const containerClasses = {
    glass:
      'flex items-center justify-between gap-3 bg-white/70 backdrop-blur-xl border border-white/40 rounded-lg shadow-xl p-3',
    modern:
      'flex items-center justify-between gap-3 bg-white border border-gray-200 rounded-lg shadow-lg p-3',
    default: 'flex items-center justify-between gap-3 bg-white border-b border-gray-200 pb-3',
  }

  const tabButtonClass = (tabId) => {
    const active = activeTab === tabId
    if (isPill) {
      return clsx(
        'flex min-w-[5rem] flex-1 basis-0 items-center justify-center gap-1.5 rounded-full px-3 py-2.5 text-sm transition-all duration-200',
        active
          ? 'bg-[#FF7A20] font-semibold text-white shadow-sm'
          : 'bg-transparent font-normal text-gray-800 hover:bg-gray-100/90'
      )
    }
    return clsx(
      'flex items-center whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-300',
      active
        ? 'bg-orange-500 text-white shadow-lg'
        : 'border border-white/40 bg-white/80 text-gray-700 backdrop-blur-sm hover:bg-white/90 hover:shadow-md'
    )
  }

  const badgeClass = (tabId) => {
    const active = activeTab === tabId
    if (isPill) {
      return clsx(
        'rounded-full px-2 py-0.5 text-xs font-bold transition-all duration-200',
        active ? 'bg-white/25 text-white' : 'bg-gray-200/90 text-gray-700'
      )
    }
    return clsx(
      'ml-2 rounded-full px-2 py-0.5 text-xs font-bold transition-all duration-300',
      active ? 'bg-white/30 text-white' : 'bg-gray-100 text-gray-700'
    )
  }

  const tabRow = (
    <div
      className={clsx(
        isPill
          ? 'flex min-h-[48px] w-full min-w-0 flex-1 items-center gap-1 overflow-x-auto rounded-full border border-gray-200 bg-white p-1.5 shadow-[0_2px_12px_rgba(15,23,42,0.09),0_1px_3px_rgba(15,23,42,0.05)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
          : 'flex flex-1 items-center gap-2 overflow-x-auto'
      )}
    >
      {tabs.map((tab) => {
        const tabId = tab.id || tab.key
        return (
          <button
            key={tabId}
            type="button"
            onClick={() => handleTabClick(tabId)}
            className={tabButtonClass(tabId)}
          >
            <span>{tab.label}</span>
            {tab.badge !== undefined && tab.badge !== null && tab.badge !== '' && (
              <span className={badgeClass(tabId)}>{tab.badge}</span>
            )}
          </button>
        )
      })}
    </div>
  )

  const rightPanel = (
    <div className="flex flex-shrink-0 items-center gap-2">
      {showSearch && (
        <div className="hidden lg:flex items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="w-64 rounded-xl border border-white/40 bg-white/80 py-2.5 pl-10 pr-4 text-sm text-gray-700 shadow-md backdrop-blur-sm transition-all duration-300 placeholder:text-gray-400 focus:border-orange-500/50 focus:bg-white/90 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
            />
          </div>
        </div>
      )}

      {showAdd && onAddClick && (
        <button
          onClick={onAddClick}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/40 bg-white/80 text-orange-500 shadow-md backdrop-blur-sm transition-all duration-300 hover:bg-orange-50 hover:text-orange-600 hover:shadow-lg"
          title={addTitle}
        >
          <Plus className="h-5 w-5" />
        </button>
      )}

      {showViewToggle && (
        <>
          {viewOptions.includes('list') && (
            <button
              onClick={() => onViewChange?.('list')}
              className={clsx(
                'flex h-10 w-10 items-center justify-center rounded-full border shadow-md backdrop-blur-sm transition-all duration-300 hover:shadow-lg',
                activeView === 'list'
                  ? 'border-orange-500/50 bg-orange-500 text-white'
                  : 'border-white/40 bg-white/80 text-gray-700 hover:bg-white/90'
              )}
              title="List View"
            >
              <List className="h-5 w-5" />
            </button>
          )}
          {viewOptions.includes('board') && (
            <button
              onClick={() => onViewChange?.('board')}
              className={clsx(
                'flex h-10 w-10 items-center justify-center rounded-full border shadow-md backdrop-blur-sm transition-all duration-300 hover:shadow-lg',
                activeView === 'board'
                  ? 'border-orange-500/50 bg-orange-500 text-white'
                  : 'border-white/40 bg-white/80 text-gray-700 hover:bg-white/90'
              )}
              title="Board View"
            >
              <LayoutGrid className="h-5 w-5" />
            </button>
          )}
        </>
      )}

      {showFilter && onFilterClick && (
        <button
          onClick={onFilterClick}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/40 bg-white/80 text-gray-700 shadow-md backdrop-blur-sm transition-all duration-300 hover:bg-white/90 hover:shadow-lg"
          title={filterTitle}
        >
          <Filter className="h-5 w-5" />
        </button>
      )}

      {showBulkEdit && onBulkEditClick && (
        <button
          type="button"
          onClick={onBulkEditClick}
          className={clsx(
            'flex items-center gap-2 whitespace-nowrap rounded-xl border px-3 py-2 text-sm font-semibold shadow-md transition-all duration-300',
            bulkEditActive
              ? 'border-orange-500/50 bg-orange-500 text-white shadow-lg'
              : 'border-white/40 bg-white/80 text-gray-700 backdrop-blur-sm hover:bg-white/90'
          )}
          title={bulkEditTitle}
        >
          <ListChecks className="h-4 w-4 flex-shrink-0" />
          <span className="hidden lg:inline">{bulkEditTitle}</span>
        </button>
      )}

      {showColumnVisibility && onColumnVisibilityClick && (
        <button
          onClick={onColumnVisibilityClick}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/40 bg-white/80 text-gray-700 shadow-md backdrop-blur-sm transition-all duration-300 hover:bg-white/90 hover:shadow-lg"
          title={columnVisibilityTitle}
        >
          <Eye className="h-5 w-5" />
        </button>
      )}

      {showExport && onExportClick && (
        <button
          onClick={onExportClick}
          className="flex items-center gap-2 whitespace-nowrap rounded-xl border border-white/40 bg-white/80 px-4 py-2.5 text-sm font-medium text-gray-700 shadow-md backdrop-blur-sm transition-all duration-300 hover:bg-white/90"
          title={exportTitle}
        >
          <Download className="h-4 w-4" />
          <span className="hidden lg:inline">{exportTitle}</span>
        </button>
      )}
    </div>
  )

  if (isPill) {
    return (
      <div
        className={clsx(
          'flex w-full items-center gap-3',
          hasRightPanel && 'justify-between',
          className
        )}
        {...props}
      >
        {tabRow}
        {hasRightPanel ? rightPanel : null}
      </div>
    )
  }

  return (
    <div
      className={clsx(containerClasses[variant] || containerClasses.glass, className)}
      {...props}
    >
      {tabRow}
      {rightPanel}
    </div>
  )
}

export default TabsWithActions
