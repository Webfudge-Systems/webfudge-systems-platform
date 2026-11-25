'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check, Loader2, Mail, RefreshCw, Sparkles, X } from 'lucide-react'

/**
 * Fudge AI approval queue (P5). Outbound messages the AI drafts (emails today; WhatsApp/SMS later)
 * wait here until a person approves or rejects them. Used by Accounts and Fudge Grow.
 *
 *   <AiApprovalQueue request={(path, { method, body }) => fetchJson(path, ...)} app="crm" />
 *
 * `request` calls the Webfudge API with the user's token and organization and returns parsed JSON
 * (throwing an Error with a readable message on failure). Paths are like '/api/ai/actions'.
 */

const STATUS_TABS = [
  { key: 'pending_approval', label: 'Waiting for approval' },
  { key: 'executed', label: 'Sent / done' },
  { key: 'rejected', label: 'Rejected' },
]

function when(value) {
  if (!value) return ''
  try {
    return new Date(value).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

function Draft({ input }) {
  if (!input) return null
  if (input.subject || input.body) {
    return (
      <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm">
        {input.to && (
          <p className="text-gray-500">
            To: <span className="text-gray-800">{input.to}</span>
          </p>
        )}
        {input.subject && <p className="mt-1 font-semibold text-gray-900">{input.subject}</p>}
        {input.body && <p className="mt-2 whitespace-pre-wrap leading-relaxed text-gray-700">{input.body}</p>}
      </div>
    )
  }
  return null
}

export function AiApprovalQueue({ request, app, className = '' }) {
  const [status, setStatus] = useState('pending_approval')
  const [rows, setRows] = useState(null)
  const [meta, setMeta] = useState({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')

  const load = useCallback(async () => {
    setError('')
    try {
      const q = new URLSearchParams({ status, ...(app ? { app } : {}) })
      const res = await request(`/api/ai/actions?${q}`)
      setRows(res?.data || [])
      setMeta(res?.meta || {})
    } catch (e) {
      setError(e?.message || 'Could not load the approval queue.')
      setRows([])
    }
  }, [request, status, app])

  useEffect(() => {
    setRows(null)
    load()
  }, [load])

  const decide = async (row, verb) => {
    let body
    if (verb === 'reject') {
      const reason = typeof window !== 'undefined' ? window.prompt('Why are you rejecting this draft? (optional)') : ''
      if (reason === null) return
      body = reason ? { reason } : {}
    }
    setBusy(`${verb}-${row.id}`)
    setError('')
    try {
      await request(`/api/ai/actions/${row.id}/${verb}`, { method: 'POST', body })
      await load()
    } catch (e) {
      setError(e?.message || 'That did not work. Please try again.')
    } finally {
      setBusy('')
    }
  }

  if (meta.enabled === false) {
    return (
      <div className={`rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-600 ${className}`}>
        Fudge AI is not switched on for this workspace yet.
      </div>
    )
  }

  return (
    <section className={`rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 ${className}`} aria-labelledby="ai-queue-title">
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FFF1E8] text-[#F5630F]">
          <Sparkles className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="ai-queue-title" className="text-base font-semibold text-gray-900">
            AI approval queue
          </h2>
          <p className="text-sm text-gray-500">
            Messages Fudge AI drafted. Nothing is sent until someone approves it.
            {meta.canSeeAll === false ? ' You see the drafts made for you.' : ''}
          </p>
        </div>
        <button type="button" onClick={load} className="inline-flex min-h-[40px] items-center gap-2 rounded-full border border-gray-300 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50">
          <RefreshCw className="h-4 w-4" aria-hidden="true" /> Refresh
        </button>
      </div>

      <div role="tablist" aria-label="Filter by status" className="mt-4 flex flex-wrap gap-2">
        {STATUS_TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={status === t.key}
            onClick={() => setStatus(t.key)}
            className={`min-h-[36px] rounded-full px-3 text-sm font-medium ${status === t.key ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            {t.label}
            {t.key === status && meta.total != null ? ` (${meta.total})` : ''}
          </button>
        ))}
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mt-4 space-y-3">
        {rows === null && (
          <p className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading…
          </p>
        )}
        {rows?.length === 0 && !error && <p className="rounded-xl bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">Nothing here.</p>}
        {rows?.map((row) => (
          <article key={row.id} className="rounded-xl border border-gray-200 p-4">
            <div className="flex flex-wrap items-start gap-3">
              <Mail className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900">{row.summary}</p>
                <p className="mt-0.5 text-xs text-gray-500">
                  Drafted {when(row.createdAt)}
                  {row.proposedFor ? ` for ${row.proposedFor.name}` : ''}
                  {row.decidedBy ? ` · ${row.status === 'rejected' ? 'rejected' : 'approved'} by ${row.decidedBy.name} ${when(row.decidedAt)}` : ''}
                  {row.status === 'executed' && row.result?.delivered === false ? ' · email sending is not set up, so it was not delivered' : ''}
                </p>
                {row.status === 'rejected' && row.error && <p className="mt-1 text-xs text-gray-600">Reason: {row.error}</p>}
                {row.status === 'failed' && row.error && <p className="mt-1 text-xs text-red-700">{row.error}</p>}
              </div>
            </div>
            <Draft input={row.input} />
            {row.status === 'pending_approval' && (
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={Boolean(busy)}
                  onClick={() => decide(row, 'approve')}
                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full bg-[#F5630F] px-4 text-sm font-semibold text-[#0F0F0F] hover:bg-[#E85A0A] disabled:opacity-60"
                >
                  {busy === `approve-${row.id}` ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />}
                  Approve and send
                </button>
                <button
                  type="button"
                  disabled={Boolean(busy)}
                  onClick={() => decide(row, 'reject')}
                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full border border-gray-300 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                >
                  <X className="h-4 w-4" aria-hidden="true" /> Reject
                </button>
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  )
}

export default AiApprovalQueue
