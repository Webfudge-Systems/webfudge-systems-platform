'use client'

import { WorkspaceHeader } from '@webfudge/ui'
import GlobalSearchModal from './GlobalSearchModal'
import notificationService from '../lib/api/notificationService'

export default function AccountsPageHeader(props) {
  return (
    <WorkspaceHeader
      {...props}
      notificationService={notificationService}
      renderGlobalSearchModal={({ isOpen, onClose, initialQuery }) => (
        <GlobalSearchModal isOpen={isOpen} onClose={onClose} initialQuery={initialQuery} />
      )}
      searchInputClassName="w-64 pl-10 pr-4 py-2.5 bg-white border border-orange-500/40 rounded-full text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all duration-300 placeholder:text-gray-400 text-gray-800"
    />
  )
}
