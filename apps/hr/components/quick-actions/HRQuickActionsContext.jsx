'use client'

import { createContext, useCallback, useContext, useMemo, useState } from 'react'

const HRQuickActionsContext = createContext(null)

export function HRQuickActionsProvider({ children }) {
  const [activeAction, setActiveAction] = useState(null)

  const openQuickAction = useCallback((actionId) => {
    setActiveAction(actionId)
  }, [])

  const closeQuickAction = useCallback(() => {
    setActiveAction(null)
  }, [])

  const value = useMemo(
    () => ({
      activeAction,
      openQuickAction,
      closeQuickAction,
      isOpen: Boolean(activeAction),
    }),
    [activeAction, openQuickAction, closeQuickAction]
  )

  return (
    <HRQuickActionsContext.Provider value={value}>{children}</HRQuickActionsContext.Provider>
  )
}

export function useHRQuickActions() {
  const ctx = useContext(HRQuickActionsContext)
  if (!ctx) {
    throw new Error('useHRQuickActions must be used within HRQuickActionsProvider')
  }
  return ctx
}

/** Safe hook for optional usage outside provider (returns no-ops). */
export function useHRQuickActionsOptional() {
  return useContext(HRQuickActionsContext)
}
