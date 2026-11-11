'use client'

import { useEffect, useMemo, useState } from 'react'
import { Search, Loader2, Check } from 'lucide-react'
import { Select, Input } from '@webfudge/ui'
import { investApi } from '../lib/api'
import { KIND_LABELS } from '../lib/format'
import { useInvest } from './InvestDataProvider'

/**
 * Pick an instrument we already track, or search NSE/BSE symbols and AMFI schemes to add one.
 * Calls onChange({ instrumentId }) or onChange({ newInstrument }).
 */
export default function InstrumentPicker({ value, onChange, defaultKind = 'stock', lockedInstrumentId }) {
  const { instruments } = useInvest()
  const [mode, setMode] = useState(instruments.length && !lockedInstrumentId ? 'existing' : lockedInstrumentId ? 'existing' : 'search')
  const [kind, setKind] = useState(defaultKind)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState(null)
  const [manual, setManual] = useState({ name: '', symbol: '', schemeCode: '', exchange: 'NSE', lastPrice: '' })

  const options = useMemo(
    () =>
      [...instruments]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((i) => ({ value: String(i.id), label: `${i.name}${i.symbol ? ` · ${i.symbol}` : ''} (${KIND_LABELS[i.kind]})` })),
    [instruments]
  )

  useEffect(() => {
    if (mode !== 'search' || kind === 'other') return
    const q = query.trim()
    if (q.length < 2) {
      setResults([])
      return
    }
    let cancelled = false
    setSearching(true)
    setSearchError(null)
    const t = setTimeout(() => {
      investApi
        .lookup(kind === 'mutual_fund' ? 'mutual_fund' : 'stock', q)
        .then((res) => {
          if (cancelled) return
          setResults(res?.data || [])
          if (res?.error) setSearchError(res.error)
        })
        .catch((err) => !cancelled && setSearchError(err.message))
        .finally(() => !cancelled && setSearching(false))
    }, 300)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [query, kind, mode])

  if (lockedInstrumentId) {
    const inst = instruments.find((i) => i.id === Number(lockedInstrumentId))
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800">
        {inst ? inst.name : 'Instrument'}
      </div>
    )
  }

  const selectedKey = value?.newInstrument ? `${value.newInstrument.symbol || ''}|${value.newInstrument.schemeCode || ''}|${value.newInstrument.exchange || ''}` : null

  return (
    <div className="space-y-3">
      <div className="inline-flex rounded-lg border border-gray-200 p-0.5 text-sm">
        {instruments.length ? (
          <button type="button" onClick={() => setMode('existing')} className={`rounded-md px-3 py-1 ${mode === 'existing' ? 'bg-orange-500 text-white' : 'text-gray-600'}`}>
            Already tracked
          </button>
        ) : null}
        <button type="button" onClick={() => setMode('search')} className={`rounded-md px-3 py-1 ${mode === 'search' ? 'bg-orange-500 text-white' : 'text-gray-600'}`}>
          Add new
        </button>
      </div>

      {mode === 'existing' ? (
        <Select
          label="Instrument"
          required
          options={options}
          value={value?.instrumentId ? String(value.instrumentId) : ''}
          onChange={(v) => onChange(v ? { instrumentId: Number(v) } : null)}
          placeholder="Choose a stock or fund"
          searchable
        />
      ) : (
        <div className="space-y-3">
          <Select
            label="Type"
            allowEmpty={false}
            options={[
              { value: 'stock', label: 'Stock (NSE/BSE)' },
              { value: 'etf', label: 'ETF (NSE/BSE)' },
              { value: 'mutual_fund', label: 'Mutual fund (AMFI)' },
              { value: 'other', label: 'Other (manual price)' },
            ]}
            value={kind}
            onChange={(v) => {
              setKind(v)
              setResults([])
              onChange(null)
            }}
          />
          {kind === 'other' ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input
                label="Name"
                required
                value={manual.name}
                onChange={(e) => {
                  const next = { ...manual, name: e.target.value }
                  setManual(next)
                  onChange(next.name ? { newInstrument: { kind: 'other', exchange: 'OTHER', name: next.name, lastPrice: next.lastPrice || undefined } } : null)
                }}
                placeholder="e.g. Fixed deposit, unlisted share"
              />
              <Input
                label="Current price per unit (₹)"
                type="number"
                step="any"
                min="0"
                value={manual.lastPrice}
                onChange={(e) => {
                  const next = { ...manual, lastPrice: e.target.value }
                  setManual(next)
                  if (next.name) onChange({ newInstrument: { kind: 'other', exchange: 'OTHER', name: next.name, lastPrice: next.lastPrice || undefined } })
                }}
              />
            </div>
          ) : (
            <>
              <Input
                label={kind === 'mutual_fund' ? 'Search fund name' : 'Search company or symbol'}
                icon={Search}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={kind === 'mutual_fund' ? 'e.g. Parag Parikh Flexi Cap Direct Growth' : 'e.g. Infosys or INFY'}
              />
              <div className="max-h-56 overflow-y-auto rounded-lg border border-gray-100">
                {searching ? (
                  <p className="flex items-center gap-2 px-3 py-3 text-sm text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" /> Searching…
                  </p>
                ) : results.length ? (
                  <ul>
                    {results.map((r) => {
                      const key = `${r.symbol || ''}|${r.schemeCode || ''}|${r.exchange || ''}`
                      const selected = key === selectedKey
                      return (
                        <li key={key}>
                          <button
                            type="button"
                            onClick={() =>
                              onChange({
                                newInstrument: { kind: kind === 'etf' && r.kind === 'stock' ? 'etf' : r.kind, name: r.name, symbol: r.symbol, schemeCode: r.schemeCode, exchange: r.exchange, isin: r.isin },
                              })
                            }
                            className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-orange-50 ${selected ? 'bg-orange-50' : ''}`}
                          >
                            <span className="min-w-0">
                              <span className="block truncate text-gray-900">{r.name}</span>
                              <span className="text-xs text-gray-500">{r.schemeCode ? `AMFI ${r.schemeCode}` : `${r.exchange} · ${r.symbol}`}</span>
                            </span>
                            {selected ? <Check className="h-4 w-4 shrink-0 text-orange-600" /> : null}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                ) : (
                  <p className="px-3 py-3 text-sm text-gray-500">{searchError || (query.trim().length >= 2 ? 'No matches. Try the exact symbol below.' : 'Type at least two letters.')}</p>
                )}
              </div>
              <details className="text-sm">
                <summary className="cursor-pointer text-gray-500 hover:text-gray-800">Can&apos;t find it? Enter the {kind === 'mutual_fund' ? 'AMFI scheme code' : 'symbol'} yourself</summary>
                <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {kind === 'mutual_fund' ? (
                    <Input
                      label="AMFI scheme code"
                      value={manual.schemeCode}
                      onChange={(e) => {
                        const next = { ...manual, schemeCode: e.target.value.trim() }
                        setManual(next)
                        onChange(next.schemeCode ? { newInstrument: { kind: 'mutual_fund', schemeCode: next.schemeCode } } : null)
                      }}
                      placeholder="e.g. 122639"
                    />
                  ) : (
                    <>
                      <Input
                        label="Symbol"
                        value={manual.symbol}
                        onChange={(e) => {
                          const next = { ...manual, symbol: e.target.value.toUpperCase() }
                          setManual(next)
                          onChange(next.symbol ? { newInstrument: { kind, symbol: next.symbol, exchange: next.exchange, name: next.symbol } } : null)
                        }}
                        placeholder="e.g. INFY"
                      />
                      <Select
                        label="Exchange"
                        allowEmpty={false}
                        options={[
                          { value: 'NSE', label: 'NSE' },
                          { value: 'BSE', label: 'BSE' },
                        ]}
                        value={manual.exchange}
                        onChange={(v) => {
                          const next = { ...manual, exchange: v }
                          setManual(next)
                          if (next.symbol) onChange({ newInstrument: { kind, symbol: next.symbol, exchange: v, name: next.symbol } })
                        }}
                      />
                    </>
                  )}
                </div>
              </details>
            </>
          )}
        </div>
      )}
    </div>
  )
}
