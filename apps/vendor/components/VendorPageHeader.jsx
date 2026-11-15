'use client'

import { usePathname } from 'next/navigation'
import { AppPageHeader } from '@webfudge/ui'

/** The vendor portal has no in-app notifications yet; the header bell stays empty. */
const noNotifications = {
  getNotifications: async () => [],
  transformNotification: (n) => n,
  markAsRead: async () => {},
  markAllAsRead: async () => {},
}

export default function VendorPageHeader({ showBack, ...props }) {
  const pathname = usePathname()
  return (
    <AppPageHeader
      {...props}
      showBack={showBack ?? pathname !== '/'}
      notificationService={noNotifications}
    />
  )
}
