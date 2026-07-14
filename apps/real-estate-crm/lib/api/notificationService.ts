// Notification service for the Real Estate CRM header bell.
// Mirrors apps/crm/lib/api/notificationService.js against the org-scoped Strapi client.
import strapiClient from '../strapiClient'
import { transformNotificationForDisplay } from '@webfudge/ui/utils/notificationDisplay'

type RawNotification = Record<string, any>

function formatTime(timestamp?: string | null): string {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes} min ago`
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`
  return date.toLocaleDateString()
}

class NotificationService {
  getNotifications = async (userId: string | number, options: { pageSize?: number } = {}): Promise<RawNotification[]> => {
    try {
      const userIdNum = typeof userId === 'string' ? parseInt(userId, 10) : userId
      const params: Record<string, unknown> = {
        pagination: { pageSize: options.pageSize || 100 },
        sort: 'createdAt:desc',
        populate: ['user'],
      }

      if (!Number.isNaN(userIdNum) && userIdNum > 0) {
        params['filters'] = { user: { id: { $eq: userIdNum } } }
      } else {
        params['filters'] = { user: { documentId: { $eq: String(userId) } } }
      }

      const response = await strapiClient.get('/notifications', params)

      if (response?.data && Array.isArray(response.data)) return response.data
      if (response?.data?.data && Array.isArray(response.data.data)) return response.data.data
      if (Array.isArray(response)) return response
      return []
    } catch (error: any) {
      const is404 = error?.message?.includes('404') || error?.message?.includes('Not Found')
      if (is404) return []
      console.error('Error fetching notifications:', error)
      return []
    }
  }

  getUnreadCount = async (userId: string | number): Promise<number> => {
    try {
      const notifications = await this.getNotifications(userId)
      return notifications.filter((n) => !n.isRead).length
    } catch (error) {
      console.error('Error fetching unread count:', error)
      return 0
    }
  }

  markAsRead = async (notificationId: string | number): Promise<boolean> => {
    try {
      await strapiClient.put(`/notifications/${notificationId}`, {
        data: { isRead: true, readAt: new Date().toISOString() },
      })
      return true
    } catch (error) {
      console.error('Error marking notification as read:', error)
      return false
    }
  }

  markAllAsRead = async (userId: string | number): Promise<boolean> => {
    try {
      const notifications = await this.getNotifications(userId)
      const unread = notifications.filter((n) => !n.isRead)
      await Promise.all(unread.map((n) => this.markAsRead(n.id)))
      return true
    } catch (error) {
      console.error('Error marking all as read:', error)
      return false
    }
  }

  formatTime = formatTime

  transformNotification = (notification: RawNotification) =>
    transformNotificationForDisplay(notification, (ts: string) => formatTime(ts))
}

const notificationService = new NotificationService()

export default notificationService
