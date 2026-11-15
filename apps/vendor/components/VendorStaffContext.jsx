'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useAuth } from '@webfudge/auth'
import vendorApi from '../lib/api'

const VendorStaffContext = createContext({ status: 'checking', staff: null, error: null })

/**
 * Checks once per sign-in that the user is Webfudge staff (PLATFORM_ADMIN_EMAILS on the API).
 * status: 'checking' | 'staff' | 'denied' | 'error'
 */
export function VendorStaffProvider({ children }) {
  const { isAuthenticated, user } = useAuth()
  const [state, setState] = useState({ status: 'checking', staff: null, error: null })
  const userId = user?.id ?? user?.attributes?.id ?? null

  useEffect(() => {
    if (!isAuthenticated) {
      setState({ status: 'checking', staff: null, error: null })
      return
    }
    let cancelled = false
    setState((s) => ({ ...s, status: 'checking' }))
    vendorApi
      .me()
      .then((staff) => !cancelled && setState({ status: 'staff', staff, error: null }))
      .catch((error) => {
        if (cancelled) return
        setState({ status: error.status === 403 ? 'denied' : 'error', staff: null, error })
      })
    return () => {
      cancelled = true
    }
  }, [isAuthenticated, userId])

  return <VendorStaffContext.Provider value={state}>{children}</VendorStaffContext.Provider>
}

export const useVendorStaff = () => useContext(VendorStaffContext)
