'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Loads one vendor API resource. `refresh()` re-fetches bypassing the server's short cache.
 * @param {(opts: {fresh?: string}) => Promise<any>} fetcher
 * @param {any[]} deps
 */
export function useVendorQuery(fetcher, deps = []) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const latest = useRef(0)

  const run = useCallback(
    async (fresh = false) => {
      const id = ++latest.current
      if (fresh) setRefreshing(true)
      else setLoading(true)
      try {
        const result = await fetcher(fresh ? { fresh: '1' } : {})
        if (id === latest.current) {
          setData(result)
          setError(null)
        }
      } catch (err) {
        if (id === latest.current) setError(err)
      } finally {
        if (id === latest.current) {
          setLoading(false)
          setRefreshing(false)
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    deps
  )

  useEffect(() => {
    run(false)
  }, [run])

  return { data, error, loading, refreshing, refresh: () => run(true), setData }
}

export default useVendorQuery
