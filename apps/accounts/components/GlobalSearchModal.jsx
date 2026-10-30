'use client'

import { useEffect, useRef, useState } from 'react'
import { Search } from 'lucide-react'
import { EmptyState, WorkspaceSearchModal } from '@webfudge/ui'

export default function GlobalSearchModal({ isOpen, onClose, initialQuery = '' }) {
  const [query, setQuery] = useState(initialQuery)
  const inputRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      setQuery(initialQuery)
      const t = setTimeout(() => inputRef.current?.focus(), 50)
      return () => clearTimeout(t)
    }
    return undefined
  }, [isOpen, initialQuery])

  return (
    <WorkspaceSearchModal
      isOpen={isOpen}
      onClose={onClose}
      query={query}
      onQueryChange={setQuery}
      placeholder="Search users, roles, departments…"
      inputRef={inputRef}
      footer={
        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
          <span>
            <kbd className="rounded-md border border-gray-300 bg-white px-1.5 py-0.5 font-sans text-[11px]">Esc</kbd>{' '}
            to close
          </span>
        </div>
      }
    >
      <EmptyState
        icon={Search}
        title="Search is coming soon"
        description="Global search wiring will use the same backend pattern as CRM/PM."
      />
    </WorkspaceSearchModal>
  )
}
