'use client'

import { AppPageHeader } from '@webfudge/ui'
import mockNotificationService from '../../lib/mockNotificationService'
import HRGlobalSearchModal from '../GlobalSearchModal'

export default function HRPageHeader(props) {
  return (
    <AppPageHeader
      {...props}
      notificationService={mockNotificationService}
      searchPlaceholder={props.searchPlaceholder || 'Search employees, modules…'}
      renderGlobalSearchModal={({ isOpen, onClose, initialQuery }) => (
        <HRGlobalSearchModal isOpen={isOpen} onClose={onClose} initialQuery={initialQuery} />
      )}
    />
  )
}
