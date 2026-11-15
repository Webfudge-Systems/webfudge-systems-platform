'use client'

import { usePathname } from 'next/navigation'
import { AppPageHeader } from '@webfudge/ui'
import notificationService from '../lib/notificationService'

/** Same shared header as PM / CRM (breadcrumb, actions, notifications, profile menu). */
export default function InvestPageHeader({ showBack, ...props }) {
  const pathname = usePathname()
  return <AppPageHeader {...props} showBack={showBack ?? pathname.split('/').filter(Boolean).length > 1} notificationService={notificationService} />
}
