'use client'

import { clsx } from 'clsx'
import { Search, Plus, List, LayoutGrid, Download, Eye, Filter } from 'lucide-react'

/**
 * Advanced Tabs component with integrated actions, search, and view toggles
 * Perfect for CRM-style list/board views with filtering and actions
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

  const containerClasses = {
    glass:
      'flex items-center justify-between gap-3 bg-white/70 backdrop-blur-xl border border-white/40 rounded-2xl shadow-xl p-3',
    modern:
      'flex items-center justify-between gap-3 bg-white border border-gray-200 rounded-xl shadow-lg p-3',
    default: 'flex items-center justify-between gap-3 bg-white border-b border-gray-200 pb-3',
  }

  return (
    <div
      className={clsx(containerClasses[variant] || containerClasses.glass, className)}
      {...props}
    >
      {/* Left: Tabs with Badges */}
      <div className="flex items-center gap-2 flex-1 overflow-x-auto">
        {tabs.map((tab) => {
          const tabId = tab.id || tab.key
          return (
            <button
              key={tabId}
              onClick={() => handleTabClick(tabId)}
              className={clsx(
                'flex items-center px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 whitespace-nowrap',
                activeTab === tabId
                  ? 'bg-orange-500 text-white shadow-lg'
                  : 'bg-white/80 backdrop-blur-sm text-gray-700 hover:bg-white/90 border border-white/40 hover:shadow-md'
              )}
            >
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={clsx(
                    'ml-2 px-2 py-0.5 text-xs font-bold rounded-full transition-all duration-300',
                    activeTab === tabId ? 'bg-white/30 text-white' : 'bg-gray-100 text-gray-700'
                  )}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Right: Search and Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Search Bar */}
        {showSearch && (
          <div className="hidden lg:flex items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => onSearchChange?.(e.target.value)}
                className="w-64 pl-10 pr-4 py-2.5 rounded-xl bg-white/80 backdrop-blur-sm border border-white/40 text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500/50 focus:bg-white/90 transition-all duration-300 shadow-md placeholder:text-gray-400"
              />
            </div>
          </div>
        )}

        {/* Add Button */}
        {showAdd && onAddClick && (
          <button
            onClick={onAddClick}
            className="w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm border border-white/40 text-orange-500 hover:bg-orange-50 hover:text-orange-600 transition-all duration-300 shadow-md hover:shadow-lg flex items-center justify-center"
            title={addTitle}
          >
            <Plus className="w-5 h-5" />
          </button>
        )}

        {/* View Toggle */}
        {showViewToggle && (
          <>
            {viewOptions.includes('list') && (
              <button
                onClick={() => onViewChange?.('list')}
                className={clsx(
                  'w-10 h-10 rounded-full backdrop-blur-sm border transition-all duration-300 shadow-md hover:shadow-lg flex items-center justify-center',
                  activeView === 'list'
                    ? 'bg-orange-500 text-white border-orange-500/50'
                    : 'bg-white/80 text-gray-700 border-white/40 hover:bg-white/90'
                )}
                title="List View"
              >
                <List className="w-5 h-5" />
              </button>
            )}
            {viewOptions.includes('board') && (
              <button
                onClick={() => onViewChange?.('board')}
                className={clsx(
                  'w-10 h-10 rounded-full backdrop-blur-sm border transition-all duration-300 shadow-md hover:shadow-lg flex items-center justify-center',
                  activeView === 'board'
                    ? 'bg-orange-500 text-white border-orange-500/50'
                    : 'bg-white/80 text-gray-700 border-white/40 hover:bg-white/90'
                )}
                title="Board View"
              >
                <LayoutGrid className="w-5 h-5" />
              </button>
            )}
          </>
        )}

        {/* Filter Button */}
        {showFilter && onFilterClick && (
          <button
            onClick={onFilterClick}
            className="w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm border border-white/40 text-gray-700 hover:bg-white/90 transition-all duration-300 shadow-md hover:shadow-lg flex items-center justify-center"
            title={filterTitle}
          >
            <Filter className="w-5 h-5" />
          </button>
        )}

        {/* Column Visibility Button */}
        {showColumnVisibility && onColumnVisibilityClick && (
          <button
            onClick={onColumnVisibilityClick}
            className="w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm border border-white/40 text-gray-700 hover:bg-white/90 transition-all duration-300 shadow-md hover:shadow-lg flex items-center justify-center"
            title={columnVisibilityTitle}
          >
            <Eye className="w-5 h-5" />
          </button>
        )}

        {/* Export Button */}
        {showExport && onExportClick && (
          <button
            onClick={onExportClick}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/80 backdrop-blur-sm border border-white/40 text-gray-700 font-medium text-sm hover:bg-white/90 transition-all duration-300 shadow-md whitespace-nowrap"
            title={exportTitle}
          >
            <Download className="w-4 h-4" />
            <span className="hidden lg:inline">{exportTitle}</span>
          </button>
        )}
      </div>
    </div>
  )
}

export default TabsWithActions
