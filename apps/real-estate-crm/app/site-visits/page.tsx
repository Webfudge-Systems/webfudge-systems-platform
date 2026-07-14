'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CalendarCheck,
  CalendarClock,
  ClipboardCheck,
  ExternalLink,
  MoreHorizontal,
  Trash2,
} from 'lucide-react'
import {
  Badge,
  Button,
  EmptyState,
  KPICard,
  LoadingSpinner,
  Modal,
  Select,
  Table,
  TableRowActionMenuPortal,
  TabsWithActions,
  Textarea,
} from '@webfudge/ui'
import {
  deleteSiteVisit,
  listSiteVisits,
  updateSiteVisit,
} from '../../lib/api/siteVisitService'
import EstatePageHeader from '../../components/EstatePageHeader'
import { formatDateTime } from '../../lib/format'
import type { SiteVisit } from '../../lib/types'

const OUTCOME_OPTIONS = [
  { value: 'visited_interested', label: 'Visited — interested' },
  { value: 'visited_not_interested', label: 'Visited — not interested' },
  { value: 'no_show', label: 'No show' },
  { value: 'rescheduled', label: 'Rescheduled' },
]

const OUTCOME_LABELS: Record<string, string> = Object.fromEntries(
  OUTCOME_OPTIONS.map((o) => [o.value, o.label])
)

interface ActionMenuAnchor {
  id: string | number
  top: number
  left: number
  triggerEl: HTMLElement
}

export default function SiteVisitsPage() {
  const router = useRouter()
  const [visits, setVisits] = useState<SiteVisit[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'upcoming' | 'completed'>('upcoming')

  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const searchTimer = useRef<ReturnType<typeof setTimeout>>()

  const [logging, setLogging] = useState<SiteVisit | null>(null)
  const [outcome, setOutcome] = useState('')
  const [outcomeNotes, setOutcomeNotes] = useState('')
  const [busy, setBusy] = useState(false)

  const [moreActionMenu, setMoreActionMenu] = useState<ActionMenuAnchor | null>(null)
  const [visitToDelete, setVisitToDelete] = useState<SiteVisit | null>(null)
  const [deleting, setDeleting] = useState(false)

  const reload = useCallback(() => {
    listSiteVisits({ pageSize: 100 }).then((res) => {
      setVisits(res.data)
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  useEffect(() => {
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => setDebouncedSearch(searchQuery.trim().toLowerCase()), 250)
    return () => clearTimeout(searchTimer.current)
  }, [searchQuery])

  const { upcoming, completed } = useMemo(() => {
    const up: SiteVisit[] = []
    const done: SiteVisit[] = []
    for (const v of visits) {
      if (v.completedAt) done.push(v)
      else up.push(v)
    }
    up.sort((a, b) => new Date(a.scheduledAt || 0).getTime() - new Date(b.scheduledAt || 0).getTime())
    return { upcoming: up, completed: done }
  }, [visits])

  const rows = useMemo(() => {
    const base = view === 'upcoming' ? upcoming : completed
    if (!debouncedSearch) return base
    return base.filter((v) =>
      [v.lead?.name, v.project?.name, v.notes, OUTCOME_LABELS[v.outcome || ''] || v.outcome]
        .filter(Boolean)
        .some((s) => String(s).toLowerCase().includes(debouncedSearch))
    )
  }, [view, upcoming, completed, debouncedSearch])

  const saveOutcome = async () => {
    if (!logging || !outcome) return
    setBusy(true)
    await updateSiteVisit(logging.id, {
      completedAt: new Date().toISOString(),
      outcome,
      notes: outcomeNotes.trim() || undefined,
    })
    setBusy(false)
    setLogging(null)
    setOutcome('')
    setOutcomeNotes('')
    reload()
  }

  const confirmDelete = async () => {
    if (!visitToDelete) return
    setDeleting(true)
    try {
      await deleteSiteVisit(visitToDelete.id)
      setVisitToDelete(null)
      reload()
    } finally {
      setDeleting(false)
    }
  }

  const columns = [
    {
      key: 'scheduledAt',
      label: 'Scheduled',
      render: (value: string) => (
        <span className="whitespace-nowrap font-medium text-gray-900">{formatDateTime(value)}</span>
      ),
    },
    {
      key: 'lead',
      label: 'Lead',
      render: (_: unknown, row: SiteVisit) => (
        <span className="whitespace-nowrap">{row.lead?.name || '—'}</span>
      ),
    },
    {
      key: 'project',
      label: 'Project',
      render: (_: unknown, row: SiteVisit) => (
        <span className="whitespace-nowrap">{row.project?.name || '—'}</span>
      ),
    },
    {
      key: 'notes',
      label: 'Notes',
      render: (value: string | null) => (
        <span className="line-clamp-1 max-w-xs text-gray-600">{value || '—'}</span>
      ),
    },
    ...(view === 'completed'
      ? [
          {
            key: 'outcome',
            label: 'Outcome',
            render: (value: string | null) => (
              <Badge
                variant={
                  value === 'visited_interested'
                    ? 'success'
                    : value === 'no_show'
                      ? 'danger'
                      : 'default'
                }
                size="sm"
              >
                {OUTCOME_LABELS[value || ''] || value || '—'}
              </Badge>
            ),
          },
        ]
      : []),
    {
      key: 'actions',
      label: 'Actions',
      render: (_: unknown, row: SiteVisit) => (
        <div className="flex min-w-[130px] items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="sm"
            className="p-2 text-teal-600 hover:bg-teal-50"
            title="More options"
            onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.stopPropagation()
              const r = e.currentTarget.getBoundingClientRect()
              setMoreActionMenu((prev) =>
                prev?.id === row.id
                  ? null
                  : { id: row.id, top: r.bottom + 4, left: r.left, triggerEl: e.currentTarget }
              )
            }}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
          {!row.completedAt ? (
            <Button
              variant="ghost"
              size="sm"
              className="p-2 text-emerald-600 hover:bg-emerald-50"
              title="Log outcome"
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation()
                setOutcome('')
                setOutcomeNotes('')
                setLogging(row)
              }}
            >
              <ClipboardCheck className="h-4 w-4" />
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="sm"
            className="p-2 text-red-600 hover:bg-red-50"
            title="Delete visit"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation()
              setVisitToDelete(row)
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6 p-4 md:p-6">
      <EstatePageHeader
        title="Site visits"
        subtitle="Scheduled and completed visits across all projects. Schedule new visits from a lead's page."
        breadcrumb={[
          { label: 'Dashboard', href: '/' },
          { label: 'Site visits', href: '/site-visits' },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KPICard title="Upcoming" value={String(upcoming.length)} icon={CalendarClock} colorScheme="orange" />
        <KPICard title="Completed" value={String(completed.length)} icon={CalendarCheck} colorScheme="orange" />
        <KPICard title="Total" value={String(visits.length)} icon={ClipboardCheck} colorScheme="orange" />
      </div>

      <TabsWithActions
        tabs={[
          { key: 'upcoming', label: 'Upcoming', badge: String(upcoming.length) },
          { key: 'completed', label: 'Completed', badge: String(completed.length) },
        ]}
        activeTab={view}
        onTabChange={(key: string) => setView(key as 'upcoming' | 'completed')}
        showSearch
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search lead, project, notes…"
      />

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={view === 'upcoming' ? CalendarClock : CalendarCheck}
            title={
              debouncedSearch
                ? 'No visits match your search'
                : view === 'upcoming'
                  ? 'No upcoming visits'
                  : 'No completed visits yet'
            }
            description={
              debouncedSearch
                ? 'Try a different search term.'
                : view === 'upcoming'
                  ? 'Schedule a site visit from any lead detail page.'
                  : 'Outcomes you log on upcoming visits will appear here.'
            }
          />
        ) : (
          <Table
            columns={columns}
            data={rows}
            keyField="id"
            variant="modernEmbedded"
            onRowClick={(row: SiteVisit) => {
              if (row.lead?.id) router.push(`/leads/${row.lead.id}`)
            }}
          />
        )}
      </div>

      {moreActionMenu &&
        (() => {
          const row = visits.find((v) => v.id === moreActionMenu.id)
          if (!row) return null
          return (
            <TableRowActionMenuPortal
              open
              anchor={{
                top: moreActionMenu.top,
                left: moreActionMenu.left,
                triggerEl: moreActionMenu.triggerEl,
              }}
              onClose={() => setMoreActionMenu(null)}
            >
              {row.lead?.id ? (
                <button
                  type="button"
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-teal-50 hover:text-teal-700"
                  onClick={() => {
                    setMoreActionMenu(null)
                    router.push(`/leads/${row.lead?.id}`)
                  }}
                >
                  <ExternalLink className="h-4 w-4 shrink-0 text-teal-600" />
                  Open lead
                </button>
              ) : null}
              {!row.completedAt ? (
                <button
                  type="button"
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-teal-50 hover:text-teal-700"
                  onClick={() => {
                    setMoreActionMenu(null)
                    setOutcome('')
                    setOutcomeNotes('')
                    setLogging(row)
                  }}
                >
                  <ClipboardCheck className="h-4 w-4 shrink-0 text-teal-600" />
                  Log outcome
                </button>
              ) : null}
            </TableRowActionMenuPortal>
          )
        })()}

      <Modal
        isOpen={!!visitToDelete}
        onClose={() => {
          if (!deleting) setVisitToDelete(null)
        }}
        title="Delete site visit"
        size="md"
        closeOnBackdrop={!deleting}
      >
        {visitToDelete ? (
          <div className="space-y-5">
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
              <Trash2 className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
              <p className="text-sm text-red-900">
                <span className="font-semibold">This action cannot be undone</span>
              </p>
            </div>
            <p className="text-sm text-gray-700">
              Delete the visit for{' '}
              <span className="font-semibold text-gray-900">{visitToDelete.lead?.name || 'this lead'}</span>{' '}
              scheduled {formatDateTime(visitToDelete.scheduledAt)}?
            </p>
            <div className="mt-1 flex flex-col-reverse gap-3 border-t border-gray-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <Button
                type="button"
                variant="outline"
                disabled={deleting}
                onClick={() => setVisitToDelete(null)}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                disabled={deleting}
                onClick={confirmDelete}
                className="w-full min-w-[9rem] sm:w-auto"
              >
                {deleting ? 'Deleting…' : 'Delete visit'}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        isOpen={logging !== null}
        onClose={() => setLogging(null)}
        title="Log visit outcome"
        subtitle={logging ? `${logging.lead?.name || 'Lead'} · ${formatDateTime(logging.scheduledAt)}` : undefined}
      >
        <div className="space-y-4">
          <Select
            label="Outcome"
            required
            value={outcome}
            onChange={(v: string) => setOutcome(v)}
            options={OUTCOME_OPTIONS}
            placeholder="Select an outcome…"
          />
          <Textarea
            label="Notes (optional)"
            value={outcomeNotes}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setOutcomeNotes(e.target.value)}
            rows={3}
            placeholder="Liked the 3BHK layout, wants pricing for higher floors…"
          />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setLogging(null)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={saveOutcome} disabled={busy || !outcome}>
            {busy ? 'Saving…' : 'Save outcome'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
