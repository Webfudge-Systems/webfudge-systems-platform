'use client'

import { AppPageHeader } from '@webfudge/ui'
import mockNotificationService from '../../lib/mockNotificationService'

export default function HRPageHeader(props) {
  return (
    <AppPageHeader
      {...props}
      notificationService={mockNotificationService}
      searchPlaceholder={props.searchPlaceholder || 'Search anything…'}
    />
  )
}
