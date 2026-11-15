'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { investApi } from '../lib/api'
import { buildPortfolio } from '../lib/portfolio.mjs'

const InvestContext = createContext(null)

export function useInvest() {
  const ctx = useContext(InvestContext)
  if (!ctx) throw new Error('useInvest must be used inside InvestDataProvider')
  return ctx
}

/**
 * Loads the org's instruments, transactions and SIPs once, then asks the API to refresh any
 * stale prices (the API skips prices fetched in the last INVEST_PRICE_TTL_MINUTES).
 */
export function InvestDataProvider({ enabled, providers, children }) {
  const [instruments, setInstruments] = useState([])
  const [transactions, setTransactions] = useState([])
  const [sips, setSips] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [priceErrors, setPriceErrors] = useState([])
  const autoRefreshed = useRef(false)

  const refreshPrices = useCallback(async (force = false) => {
    setRefreshing(true)
    try {
      const res = await investApi.refreshPrices(force)
      if (Array.isArray(res?.data)) setInstruments(res.data)
      setPriceErrors(res?.meta?.errors || [])
      return res?.meta
    } catch (err) {
      setPriceErrors([{ id: 'all', name: 'Price refresh', error: err.message || String(err) }])
      return null
    } finally {
      setRefreshing(false)
    }
  }, [])

  const reload = useCallback(async () => {
    setError(null)
    try {
      const [inst, txs, sipRows] = await Promise.all([
        investApi.listInstruments(),
        investApi.listTransactions(),
        investApi.listSips(),
      ])
      setInstruments(inst)
      setTransactions(txs)
      setSips(sipRows)
    } catch (err) {
      setError(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!enabled) return
    reload().then(() => {
      if (!autoRefreshed.current) {
        autoRefreshed.current = true
        refreshPrices(false)
      }
    })
  }, [enabled, reload, refreshPrices])

  /** Accepts { instrumentId } or { newInstrument } from InstrumentPicker and returns an id. */
  const ensureInstrument = useCallback(async (picked) => {
    if (picked?.instrumentId) return Number(picked.instrumentId)
    if (!picked?.newInstrument) throw new Error('Choose an instrument')
    const created = await investApi.createInstrument(picked.newInstrument)
    setInstruments((prev) => (prev.some((i) => i.id === created.id) ? prev : [...prev, created]))
    // Price the new instrument straight away.
    investApi
      .refreshPrices(false)
      .then((res) => Array.isArray(res?.data) && setInstruments(res.data))
      .catch(() => {})
    return created.id
  }, [])

  const portfolio = useMemo(() => buildPortfolio(instruments, transactions), [instruments, transactions])

  const lastPriceAt = useMemo(() => {
    const times = instruments.map((i) => i.lastPriceAt && new Date(i.lastPriceAt).getTime()).filter(Boolean)
    return times.length ? new Date(Math.max(...times)).toISOString() : null
  }, [instruments])

  const value = {
    instruments,
    transactions,
    sips,
    loading,
    error,
    refreshing,
    priceErrors,
    providers,
    lastPriceAt,
    portfolio,
    reload,
    refreshPrices,
    ensureInstrument,
  }
  return <InvestContext.Provider value={value}>{children}</InvestContext.Provider>
}
