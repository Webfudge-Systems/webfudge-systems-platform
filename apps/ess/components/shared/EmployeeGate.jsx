'use client'

import { UserX } from 'lucide-react'
import { EmptyState, PageLoader } from '@webfudge/ui'
import { useCurrentEmployee } from '../../hooks/useCurrentEmployee'

export default function EmployeeGate({ children }) {
  const { loading, notOnboarded, error } = useCurrentEmployee()

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <PageLoader message="Loading your profile..." />
      </div>
    )
  }

  if (notOnboarded) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-6">
        <EmptyState
          icon={UserX}
          title="Profile setup in progress"
          description={
            error ||
            'Your profile is being set up by HR. Check back soon once your employee record has been created.'
          }
        />
      </div>
    )
  }

  return children
}
