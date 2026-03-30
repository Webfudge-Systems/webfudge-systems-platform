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
  TabsWithActions,
  Input,
} from '@webfudge/ui'
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Search,
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

  const getCurrentUserId = () => {
    if (!user) return null
    const u = user.attributes || user
    // Prefer numeric id, fallback to documentId.
    return u.id || user.id || u.documentId || user.documentId || null
  }

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true)
      const userId = getCurrentUserId()
      const res = await notificationService.getNotifications(userId, { pageSize: 100 })
      setNotifications(Array.isArray(res) ? res : res?.data || [])
    } catch {
      setNotifications([])
    } finally {
      setLoading(false)
    }
  }, [user])

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
        prev.map((n) =>
          n.id === id
            ? {
                ...n,
                attributes: {
                  ...(n.attributes || {}),
                  read: true,
                  isRead: true,
                },
              }
            : n,
        ),
      )
    } catch {}
    finally { setMarkingRead(false) }
  }

  const handleMarkAllRead = async () => {
    try {
      setMarkingRead(true)
      const userId = getCurrentUserId()
      await notificationService.markAllAsRead(userId)
      setNotifications((prev) =>
        prev.map((n) => ({
          ...n,
          attributes: {
            ...(n.attributes || {}),
            read: true,
            isRead: true,
          },
        }))
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
    return !(attrs.read || attrs.isRead)
  }).length

  const readCount = Math.max(0, notifications.length - unreadCount)

  const tabsWithBadges = [
    { id: 'all', label: 'All', badge: notifications.length },
    { id: 'unread', label: 'Unread', badge: unreadCount },
    { id: 'read', label: 'Read', badge: readCount },
  ]

  // Keep showing the selected notification even if it falls out of the current filtered list.
  const selectedNotification = selectedId ? notifications.find((n) => n.id === selectedId) : null

  return (
    <div className="p-4 md:p-6 space-y-4">
      <PMPageHeader
        title="Inbox"
        subtitle="Stay updated with all your notifications"
        showProfile
        breadcrumb={[
          { label: 'Dashboard', href: '/' },
          { label: 'Inbox', href: '/inbox' },
        ]}
        actions={
          unreadCount > 0 ? (
            <Button variant="outline" size="sm" onClick={handleMarkAllRead} disabled={markingRead}>
              <CheckCheck className="w-4 h-4 mr-2" />
              Mark All Read
            </Button>
          ) : null
        }
      />

      {/* Tabs (matches `ref-image 2` capsule style) */}
      <TabsWithActions
        variant="modern"
        className="max-w-md"
        tabs={tabsWithBadges}
        activeTab={activeTab}
        onTabChange={(id) => setActiveTab(id)}
      />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Notification List */}
        <div className="lg:col-span-2">
          <Card padding={false} variant="elevated">
            {/* Search (hidden when there are no notifications, matching the reference empty view) */}
            {notifications.length > 0 && (
              <div className="p-3 border-b border-gray-100">
                <Input
                  icon={Search}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search notifications..."
                  className="rounded-xl"
                  containerClassName="mb-0"
                />
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center h-48">
                <LoadingSpinner size="md" message="Loading..." />
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={BellOff}
                  title="No notifications found"
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
            <Card
              variant="elevated"
              className="h-full min-h-[300px] flex items-center justify-center"
            >
              <EmptyState
                icon={Bell}
                title="No notification selected"
                description="Select a notification from the list to view details."
              />
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
