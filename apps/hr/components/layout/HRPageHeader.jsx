'use client'

import { usePathname } from 'next/navigation'
import { AppPageHeader } from '@webfudge/ui'
import mockNotificationService from '../../lib/mockNotificationService'
import HRGlobalSearchModal from '../GlobalSearchModal'

export default function HRPageHeader({ showBack, ...props }) {
  const pathname = usePathname()
  const isDashboard = pathname === '/dashboard' || pathname === '/'
  const defaultShowBack = !isDashboard

  return (
    <AppPageHeader
      {...props}
      showBack={showBack ?? defaultShowBack}
      notificationService={mockNotificationService}
      searchPlaceholder={props.searchPlaceholder ?? 'Search anything...'}
      renderGlobalSearchModal={({ isOpen, onClose, initialQuery }) => (
        <HRGlobalSearchModal isOpen={isOpen} onClose={onClose} initialQuery={initialQuery} />
      )}
    />
  )
}
