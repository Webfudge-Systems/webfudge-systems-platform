'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@webfudge/auth'
import {
  Card,
  EmptyState,
  Badge,
  Button,
  LoadingSpinner,
} from '@webfudge/ui'
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Search,
  RefreshCw,
  Info,
  AlertTriangle,
  AlertCircle,
  MessageSquare,
} from 'lucide-react'
import PMPageHeader from '../../components/PMPageHeader'
import notificationService from '../../lib/api/notificationService'

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'read', label: 'Read' },
]

function getNotificationIcon(type) {
  const map = {
    info: <Info className="w-4 h-4 text-blue-500" />,
    warning: <AlertTriangle className="w-4 h-4 text-yellow-500" />,
    error: <AlertCircle className="w-4 h-4 text-red-500" />,
    message: <MessageSquare className="w-4 h-4 text-purple-500" />,
    success: <Check className="w-4 h-4 text-green-500" />,
  }
  return map[(type || '').toLowerCase()] || <Bell className="w-4 h-4 text-gray-400" />
}

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000)
  if (diff < 60) return 'Just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function InboxPage() {
  const { user } = useAuth()

  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [markingRead, setMarkingRead] = useState(false)

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true)
      const res = await notificationService.getNotifications({ pageSize: 100 })
      setNotifications(res?.data || [])
    } catch {
      setNotifications([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadNotifications()
    const interval = setInterval(loadNotifications, 15000)
    return () => clearInterval(interval)
  }, [loadNotifications])

  const handleMarkRead = async (id) => {
    try {
      setMarkingRead(true)
      await notificationService.markAsRead(id)
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, attributes: { ...n.attributes, read: true, isRead: true } } : n))
      )
    } catch {}
    finally { setMarkingRead(false) }
  }

  const handleMarkAllRead = async () => {
    try {
      setMarkingRead(true)
      await notificationService.markAllAsRead()
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, attributes: { ...n.attributes, read: true, isRead: true } }))
      )
    } catch {}
    finally { setMarkingRead(false) }
  }

  const filtered = notifications.filter((n) => {
    const attrs = n.attributes || n
    const isRead = attrs.read || attrs.isRead
    if (activeTab === 'unread' && isRead) return false
    if (activeTab === 'read' && !isRead) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return (
        (attrs.title || '').toLowerCase().includes(q) ||
        (attrs.message || attrs.body || '').toLowerCase().includes(q)
      )
    }
    return true
  })

  const unreadCount = notifications.filter((n) => {
    const attrs = n.attributes || n
    return !attrs.read && !attrs.isRead
  }).length

  const tabsWithBadges = TABS.map((t) => ({
    ...t,
    badge: t.id === 'unread' ? unreadCount : t.id === 'all' ? notifications.length : undefined,
  }))

  const selectedNotification = selectedId ? filtered.find((n) => n.id === selectedId) : null

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PMPageHeader
        title="Inbox"
        subtitle="Your notifications and updates"
        showProfile
        actions={
          unreadCount > 0 ? (
            <Button variant="outline" size="sm" onClick={handleMarkAllRead} disabled={markingRead}>
              <CheckCheck className="w-4 h-4 mr-2" />
              Mark All Read
            </Button>
          ) : null
        }
      />

      {/* Tabs */}
      <div className="flex items-center gap-2">
        {tabsWithBadges.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-orange-500 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab.label}
            {tab.badge !== undefined && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                activeTab === tab.id ? 'bg-white/30 text-white' : 'bg-gray-300 text-gray-700'
              }`}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
        <div className="ml-auto">
          <Button variant="ghost" size="sm" onClick={loadNotifications} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Notification List */}
        <div className="lg:col-span-2">
          <Card padding={false} variant="default">
            {/* Search */}
            <div className="p-3 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search notifications..."
                  className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-48">
                <LoadingSpinner size="md" message="Loading..." />
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={BellOff}
                  title="No notifications"
                  description={
                    activeTab === 'unread'
                      ? "You're all caught up!"
                      : 'No notifications found.'
                  }
                />
              </div>
            ) : (
              <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto">
                {filtered.map((notification) => {
                  const attrs = notification.attributes || notification
                  const isRead = attrs.read || attrs.isRead
                  const isSelected = selectedId === notification.id
                  return (
                    <button
                      key={notification.id}
                      onClick={() => {
                        setSelectedId(notification.id)
                        if (!isRead) handleMarkRead(notification.id)
                      }}
                      className={`w-full text-left p-4 transition-colors ${
                        isSelected
                          ? 'bg-orange-50 border-r-2 border-orange-500'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          isRead ? 'bg-gray-100' : 'bg-orange-100'
                        }`}>
                          {getNotificationIcon(attrs.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className={`text-sm font-medium truncate ${isRead ? 'text-gray-600' : 'text-gray-900'}`}>
                              {attrs.title || 'Notification'}
                            </p>
                            {!isRead && (
                              <span className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5 truncate">
                            {attrs.message || attrs.body || ''}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {timeAgo(attrs.createdAt)}
                          </p>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Detail Panel */}
        <div className="lg:col-span-3">
          {selectedNotification ? (
            <Card variant="default">
              {(() => {
                const attrs = selectedNotification.attributes || selectedNotification
                const isRead = attrs.read || attrs.isRead
                return (
                  <>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                          {getNotificationIcon(attrs.type)}
                        </div>
                        <div>
                          <h2 className="text-lg font-semibold text-gray-900">
                            {attrs.title || 'Notification'}
                          </h2>
                          <p className="text-sm text-gray-500">{timeAgo(attrs.createdAt)}</p>
                        </div>
                      </div>
                      {!isRead && (
                        <Badge variant="warning" dot>Unread</Badge>
                      )}
                    </div>
                    <p className="text-gray-700 leading-relaxed">
                      {attrs.message || attrs.body || 'No content available.'}
                    </p>
                    {attrs.link && (
                      <a
                        href={attrs.link}
                        className="mt-4 inline-flex items-center gap-2 text-sm text-orange-600 hover:underline"
                      >
                        View details →
                      </a>
                    )}
                    {!isRead && (
                      <div className="mt-6 pt-4 border-t border-gray-100">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleMarkRead(selectedNotification.id)}
                          disabled={markingRead}
                        >
                          <Check className="w-4 h-4 mr-2" />
                          Mark as Read
                        </Button>
                      </div>
                    )}
                  </>
                )
              })()}
            </Card>
          ) : (
            <Card variant="default" className="h-full min-h-[300px] flex items-center justify-center">
              <EmptyState
                icon={Bell}
                title="Select a notification"
                description="Click a notification from the list to view its details."
              />
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
