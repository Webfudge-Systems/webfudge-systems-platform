'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  Bell,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  Download,
  Filter,
  Image,
  Plus,
  Search,
  Settings,
  Share,
  Upload,
  User,
} from 'lucide-react'
import { useAuth, resolveUserDisplayName, resolveUserInitials, resolveUserRole } from '@webfudge/auth'
import { Avatar, Card } from '../index'
import LoadingSpinner from '../../feedback/LoadingSpinner'

export function WorkspaceHeader({
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
  notificationService,
  renderGlobalSearchModal,
  searchInputClassName,
  actionButtonClassName,
  notificationDropdownClassName,
  profileDropdownClassName,
}) {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const [showProfileDropdown, setShowProfileDropdown] = useState(false)
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false)
  const [showGlobalSearch, setShowGlobalSearch] = useState(false)
  const [searchInputValue, setSearchInputValue] = useState('')
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loadingNotifications, setLoadingNotifications] = useState(false)
  const notificationDropdownRef = useRef(null)

  const getCurrentUserId = () => {
    if (!user) return null
    const userData = user.attributes || user
    return userData.id || user.id || userData.documentId || user.documentId || null
  }

  useEffect(() => {
    if (!notificationService) return undefined
    const loadNotifications = async () => {
      const userId = getCurrentUserId()
      if (!userId) return
      try {
        setLoadingNotifications(true)
        const list = await notificationService.getNotifications(userId)
        const transformed = list.map(notificationService.transformNotification)
        setNotifications(transformed)
        setUnreadCount(transformed.filter((n) => !n.isRead).length)
      } catch (error) {
        console.error('Error loading notifications:', error)
      } finally {
        setLoadingNotifications(false)
      }
    }
    void loadNotifications()
    const pollInterval = setInterval(loadNotifications, 30000)
    return () => clearInterval(pollInterval)
  }, [user, notificationService])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationDropdownRef.current && !notificationDropdownRef.current.contains(event.target)) {
        setShowNotificationDropdown(false)
      }
    }
    if (showNotificationDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
    return undefined
  }, [showNotificationDropdown])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k' && showSearch) {
        e.preventDefault()
        setShowGlobalSearch(true)
      }
      if (e.key === 'Escape' && showGlobalSearch) setShowGlobalSearch(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showSearch, showGlobalSearch])

  const handleMarkAsRead = async (notificationId) => {
    if (!notificationService) return
    try {
      await notificationService.markAsRead(notificationId)
      setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n)))
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const handleMarkAllAsRead = async () => {
    if (!notificationService) return
    const userId = getCurrentUserId()
    if (!userId) return
    try {
      await notificationService.markAllAsRead(userId)
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
  }

  const breadcrumbItems =
    breadcrumb.length > 0
      ? breadcrumb.map((item) => {
          if (typeof item === 'string') {
            const segments = pathname.split('/').filter(Boolean)
            const itemIndex = breadcrumb.findIndex((b) => b === item)
            if (itemIndex >= 0 && itemIndex < segments.length) {
              const href = '/' + segments.slice(0, itemIndex + 1).join('/')
              return { label: item, href }
            }
            return { label: item, href: '#' }
          }
          const label = typeof item.label === 'string' ? item.label : 'Page'
          return { label, href: item.href || '#' }
        })
      : pathname
          .split('/')
          .filter(Boolean)
          .map((segment, index, array) => ({
            href: '/' + array.slice(0, index + 1).join('/'),
            label: segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' '),
          }))

  const resolvedActionClass =
    actionButtonClassName ||
    'p-2.5 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl hover:bg-white/20 hover:border-white/30 transition-all duration-300 shadow-lg'

  const resolvedSearchClass =
    searchInputClassName ||
    'w-64 pl-10 pr-4 py-2.5 bg-white border border-orange-500/40 rounded-full text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all duration-300 placeholder:text-gray-400 text-gray-800'

  return (
    <Card glass className="relative z-[40]">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          {breadcrumbItems.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-brand-text-light mb-2">
              {breadcrumbItems.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  {index === breadcrumbItems.length - 1 ? (
                    <span className="text-brand-foreground font-medium">{String(item.label || '')}</span>
                  ) : (
                    <Link href={item.href || '#'} className="text-brand-text-light hover:text-brand-foreground transition-colors duration-200 cursor-pointer">
                      {String(item.label || '')}
                    </Link>
                  )}
                  {index < breadcrumbItems.length - 1 && <ChevronRight className="w-4 h-4" />}
                </div>
              ))}
            </div>
          )}
          <h1 className="text-5xl font-light text-brand-foreground mb-1 tracking-tight">{title}</h1>
          {subtitle ? <p className="text-brand-text-light">{subtitle}</p> : null}
        </div>

        {(children || showSearch || showActions || actions) && (
          <div className="flex items-center gap-4 ml-4">
            {showSearch && (
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder={searchPlaceholder || 'Search... (⌘K)'}
                  value={searchInputValue}
                  onChange={(e) => {
                    const value = e.target.value
                    setSearchInputValue(value)
                    if (onSearchChange) onSearchChange(value)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !onSearchChange) {
                      e.preventDefault()
                      setShowGlobalSearch(true)
                    }
                  }}
                  className={resolvedSearchClass}
                />
              </div>
            )}

            {children || (showActions && (
              <div className="flex items-center gap-2">
                {onAddClick && <button onClick={onAddClick} className={`${resolvedActionClass} text-brand-primary`}><Plus className="w-5 h-5" /></button>}
                {onFilterClick && <button onClick={onFilterClick} className={`relative ${resolvedActionClass}`}><Filter className="w-5 h-5 text-brand-text-light" />{hasActiveFilters ? <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white/95 shadow-sm" /> : null}</button>}
                {onImportClick && <button onClick={onImportClick} className={resolvedActionClass}><Upload className="w-5 h-5 text-brand-text-light" /></button>}
                {onExportClick && <button onClick={onExportClick} className={resolvedActionClass}><Download className="w-5 h-5 text-brand-text-light" /></button>}
                {onShareImageClick && <button onClick={onShareImageClick} className={resolvedActionClass} title="Share Image"><Image className="w-5 h-5 text-brand-text-light" /></button>}
              </div>
            ))}

            {actions && (Array.isArray(actions)
              ? actions.map((action, index) => (
                  <button key={index} onClick={action.onClick} className={`${resolvedActionClass} ${action.className || ''}`}>
                    {action.icon ? <action.icon className="w-5 h-5 text-brand-text-light" /> : null}
                  </button>
                ))
              : <div className="flex items-center gap-2">{actions}</div>)}
          </div>
        )}

        {showProfile && (
          <div className="flex items-center gap-3 ml-4">
            <div className="relative" ref={notificationDropdownRef}>
              <button onClick={() => setShowNotificationDropdown(!showNotificationDropdown)} className="relative p-2.5 rounded-xl hover:bg-white/10 hover:backdrop-blur-md transition-all duration-300" title="Notifications">
                <Bell className="w-5 h-5 text-brand-text-light" />
                {unreadCount > 0 ? <span className="absolute top-1.5 right-1.5 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-white/95 shadow-sm">{unreadCount > 9 ? '9+' : unreadCount}</span> : null}
              </button>
              {showNotificationDropdown && (
                <>
                  <div className="fixed inset-0 z-[99998]" onClick={() => setShowNotificationDropdown(false)} />
                  <div className={`fixed right-6 top-20 w-96 bg-white/95 backdrop-blur-xl rounded-xl shadow-2xl border border-white/30 z-[99999] max-h-[600px] flex flex-col ${notificationDropdownClassName || ''}`}>
                    <div className="p-4 border-b border-white/20 flex items-center justify-between">
                      <h3 className="font-semibold text-brand-foreground">Notifications</h3>
                      {unreadCount > 0 ? <button onClick={handleMarkAllAsRead} className="text-xs text-brand-primary hover:text-brand-primary/80 flex items-center gap-1"><CheckCheck className="w-3 h-3" />Mark all as read</button> : null}
                    </div>
                    <div className="flex-1 overflow-y-auto">
                      {loadingNotifications ? <div className="p-8 text-center text-brand-text-light"><LoadingSpinner size="sm" message="Loading notifications..." /></div> : notifications.length === 0 ? <div className="p-8 text-center text-brand-text-light"><Bell className="w-12 h-12 mx-auto mb-2 opacity-50" /><p className="text-sm">No notifications</p></div> : (
                        <div className="divide-y divide-gray-100">
                          {notifications.map((notification) => (
                            <button key={notification.id} onClick={() => handleMarkAsRead(notification.id)} className={`w-full text-left p-4 hover:bg-brand-hover transition-colors ${!notification.isRead ? 'bg-blue-50/50' : ''}`}>
                              <div className="flex items-start gap-3">
                                <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${!notification.isRead ? 'bg-blue-500' : 'bg-transparent'}`} />
                                <div className="flex-1 min-w-0">
                                  <p className={`text-sm font-medium ${!notification.isRead ? 'text-brand-foreground' : 'text-brand-text-light'}`}>{notification.title}</p>
                                  <p className="text-xs text-brand-text-light mt-1 line-clamp-2">{notification.message}</p>
                                  <p className="text-xs text-brand-text-light mt-2">{notification.timeAgo}</p>
                                </div>
                                {!notification.isRead ? <Check className="w-4 h-4 text-blue-500 flex-shrink-0 mt-1" /> : null}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="relative">
              <button className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/10 hover:backdrop-blur-md transition-all duration-300" onMouseEnter={() => setShowProfileDropdown(true)} onMouseLeave={() => setShowProfileDropdown(false)}>
                <div className="flex items-center gap-3">
                  <Avatar fallback={resolveUserInitials(user)} alt={resolveUserDisplayName(user)} size="md" className="bg-white/10 backdrop-blur-md border border-white/20 shadow-lg text-brand-primary" />
                  <div className="text-left hidden lg:block">
                    <p className="text-sm font-semibold text-brand-foreground">{resolveUserDisplayName(user)}</p>
                    <p className="text-xs text-brand-text-light">{resolveUserRole(user)}</p>
                  </div>
                </div>
                <ChevronDown className={`w-4 h-4 text-brand-text-light transition-transform ${showProfileDropdown ? 'rotate-180' : ''}`} />
              </button>
              {showProfileDropdown && (
                <>
                  <div className="fixed inset-0 z-[99998]" onClick={() => setShowProfileDropdown(false)} />
                  <div className={`fixed right-6 top-20 w-72 bg-white/95 backdrop-blur-xl rounded-xl shadow-2xl border border-white/30 z-[99999] ${profileDropdownClassName || ''}`} onMouseEnter={() => setShowProfileDropdown(true)} onMouseLeave={() => setShowProfileDropdown(false)}>
                    <div className="p-4 border-b border-white/20">
                      <div className="flex items-center gap-3">
                        <Avatar fallback={resolveUserInitials(user)} alt={resolveUserDisplayName(user)} size="xl" className="bg-white/20 backdrop-blur-md border border-white/30 shadow-lg text-brand-primary" />
                        <div>
                          <p className="font-semibold text-brand-foreground">{resolveUserDisplayName(user)}</p>
                          <p className="text-sm text-brand-text-light">{(user?.attributes || user)?.email || user?.email}</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-2">
                      <button className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-brand-hover rounded-lg transition-colors"><User className="w-4 h-4 text-brand-text-light" /><span className="text-sm text-brand-foreground">View Profile</span></button>
                      <button className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-brand-hover rounded-lg transition-colors"><Settings className="w-4 h-4 text-brand-text-light" /><span className="text-sm text-brand-foreground">Settings</span></button>
                      <div className="h-px bg-brand-border my-2 mx-3" />
                      <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-red-50 rounded-lg transition-colors text-red-600"><Share className="w-4 h-4" /><span className="text-sm">Sign Out</span></button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {showSearch && renderGlobalSearchModal ? renderGlobalSearchModal({
        isOpen: showGlobalSearch,
        onClose: () => setShowGlobalSearch(false),
        initialQuery: searchInputValue,
      }) : null}
    </Card>
  )
}

export default WorkspaceHeader
