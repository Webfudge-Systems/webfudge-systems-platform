import { transformNotificationForDisplay } from '@webfudge/ui/utils/notificationDisplay'

const MOCK_NOTIFICATIONS = [
  {
    id: 1,
    title: 'Leave approval pending',
    message: 'Ankit Sharma requested 2 days casual leave',
    isRead: false,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    type: 'leave',
    data: { href: '/leave', priority: 'urgent' },
  },
  {
    id: 2,
    title: 'Payroll draft ready',
    message: 'June 2026 payroll is ready for review',
    isRead: false,
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    type: 'payroll',
    data: { href: '/payroll' },
  },
  {
    id: 3,
    title: 'New hire onboarded',
    message: 'Priya Nair joined Engineering',
    isRead: true,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    type: 'hire',
    data: { href: '/employees' },
  },
]

function formatTime(dateString) {
  if (!dateString) return ''
  const diff = Date.now() - new Date(dateString).getTime()
  const h = Math.floor(diff / 3600000)
  if (h < 1) return 'just now'
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

class MockNotificationService {
  async getNotifications() {
    return MOCK_NOTIFICATIONS
  }

  async getUnreadCount() {
    return MOCK_NOTIFICATIONS.filter((n) => !n.isRead).length
  }

  async markAsRead(notificationId) {
    const n = MOCK_NOTIFICATIONS.find((x) => x.id === notificationId)
    if (n) n.isRead = true
    return true
  }

  async markAllAsRead() {
    MOCK_NOTIFICATIONS.forEach((n) => {
      n.isRead = true
    })
    return true
  }

  transformNotification(notification) {
    return transformNotificationForDisplay(notification, formatTime)
  }
}

const mockNotificationService = new MockNotificationService()
export default mockNotificationService
