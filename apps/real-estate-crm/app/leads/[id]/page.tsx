'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  Activity,
  CalendarPlus,
  Clock,
  Download,
  Edit,
  FileText,
  Flame,
  Gauge,
  Globe,
  Mail,
  MapPin,
  Phone,
  Share2,
  StickyNote,
  Target,
  User,
} from 'lucide-react'
import {
  Button,
  Card,
  EmptyState,
  InfoRow,
  InfoSection,
  Input,
  LoadingSpinner,
  Modal,
  Select,
  TabsWithActions,
  Textarea,
  buildUserSelectOptions,
} from '@webfudge/ui'
import { getLead, updateLead, updateLeadStatus } from '../../../lib/api/leadService'
import { listLeadActivities, logActivity } from '../../../lib/api/activityService'
import { createSiteVisit, listSiteVisits } from '../../../lib/api/siteVisitService'
import { listOrgUsers, userLabel } from '../../../lib/api/userService'
import EstatePageHeader from '../../../components/EstatePageHeader'
import { formatDateTime, formatSeconds, formatSource, formatTimeline, formatPurpose, timeAgo } from '../../../lib/format'
import {
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  type LeadActivity,
  type LeadStatus,
  type OrgUser,
  type RealEstateLead,
  type SiteVisit,
} from '../../../lib/types'

const FACTOR_LABELS: Record<string, string> = {
  timeline: 'Timeline',
  budget: 'Budget',
  purpose: 'Purpose',
  config_interest: 'Configuration interest',
  page_time: 'Time on project page',
  optional_answers: 'Optional questions answered',
  asset_engagement: 'Brochure / floor plan',
}

const headerIconBtnClass =
  'p-2.5 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl hover:bg-white/20 hover:border-white/30 transition-all duration-300 shadow-lg text-brand-text-light'

const ACTIVITY_LABELS: Record<string, string> = {
  created: 'Lead created',
  status_changed: 'Status changed',
  call_logged: 'Call logged',
  note: 'Note added',
  site_visit_scheduled: 'Site visit scheduled',
  site_visit_completed: 'Site visit completed',
  page_enriched: 'Visited the project page',
  hot_lead_notification: 'Hot lead alert',
}

function activitySummary(activity: LeadActivity): string {
  const p = (activity.payload || {}) as Record<string, unknown>
  switch (activity.type) {
    case 'status_changed':
      return `${LEAD_STATUS_LABELS[p.from as LeadStatus] || p.from || '—'} → ${LEAD_STATUS_LABELS[p.to as LeadStatus] || p.to || '—'}`
    case 'created':
      return `Source: ${formatSource(String(p.source || ''))}`
    case 'page_enriched':
      return p.pageTimeSeconds != null ? `Spent ${formatSeconds(Number(p.pageTimeSeconds))} on page` : ''
    case 'call_logged':
    case 'note':
      return String(p.note || '')
    default:
      return ''
  }
}

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [lead, setLead] = useState<RealEstateLead | null>(null)
  const [activities, setActivities] = useState<LeadActivity[]>([])
  const [visits, setVisits] = useState<SiteVisit[]>([])
  const [orgUsers, setOrgUsers] = useState<OrgUser[]>([])
  const [loading, setLoading] = useState(true)

  const [noteModal, setNoteModal] = useState<null | 'note' | 'call'>(null)
  const [noteText, setNoteText] = useState('')
  const [visitModal, setVisitModal] = useState(false)
  const [visitAt, setVisitAt] = useState('')
  const [visitNotes, setVisitNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [detailTab, setDetailTab] = useState('overview')
  const [editingInfo, setEditingInfo] = useState(false)
  const [savingInfo, setSavingInfo] = useState(false)
  const [infoDraft, setInfoDraft] = useState({
    phone: '',
    email: '',
    budgetRange: '',
    timeline: '',
    purpose: '',
    configInterest: '',
  })

  const reload = useCallback(() => {
    if (!id) return
    getLead(id).then(setLead)
    listLeadActivities(id).then(setActivities)
    listSiteVisits({ lead: id }).then((res) => setVisits(res.data))
  }, [id])

  useEffect(() => {
    if (!id) return
    let cancelled = false
    Promise.all([getLead(id), listLeadActivities(id), listSiteVisits({ lead: id })]).then(
      ([leadData, acts, visitRes]) => {
        if (cancelled) return
        setLead(leadData)
        setActivities(acts)
        setVisits(visitRes.data)
        setLoading(false)
      }
    )
    listOrgUsers().then(setOrgUsers)
    return () => {
      cancelled = true
    }
  }, [id])

  const userOptions = useMemo(() => buildUserSelectOptions(orgUsers), [orgUsers])

  const handleShare = useCallback(async () => {
    const url = typeof window !== 'undefined' ? window.location.href : ''
    try {
      if (navigator.share) {
        await navigator.share({ title: lead?.name || 'Lead', url })
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url)
      }
    } catch {
      /* ignore */
    }
  }, [lead?.name])

  const handleDownload = useCallback(() => {
    if (!lead || typeof window === 'undefined') return
    const blob = new Blob([JSON.stringify(lead, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `real-estate-lead-${lead.id || id}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }, [lead, id])

  const openInfoEdit = () => {
    if (!lead) return
    setInfoDraft({
      phone: lead.phone || '',
      email: lead.email || '',
      budgetRange: lead.budgetRange || '',
      timeline: lead.timeline || '',
      purpose: lead.purpose || '',
      configInterest: lead.configInterest || '',
    })
    setEditingInfo(true)
  }

  const setInfoField = (key: keyof typeof infoDraft, value: string) =>
    setInfoDraft((prev) => ({ ...prev, [key]: value }))

  const saveInfoEdit = async () => {
    if (!lead) return
    setSavingInfo(true)
    try {
      await updateLead(lead.id, {
        phone: infoDraft.phone.trim(),
        email: infoDraft.email.trim(),
        budgetRange: infoDraft.budgetRange.trim(),
        timeline: (infoDraft.timeline || null) as any,
        purpose: (infoDraft.purpose || null) as any,
        configInterest: infoDraft.configInterest.trim(),
      })
      setEditingInfo(false)
      reload()
    } finally {
      setSavingInfo(false)
    }
  }

  const changeStatus = async (status: string) => {
    if (!lead || !status || status === lead.status) return
    await updateLeadStatus(lead.id, status as LeadStatus)
    reload()
  }

  const reassign = async (userId: string) => {
    if (!lead || !userId) return
    await updateLead(lead.id, { assignedTo: Number(userId) })
    reload()
  }

  const saveNote = async () => {
    if (!lead || !noteText.trim()) return
    setBusy(true)
    const type = noteModal === 'call' ? 'call_logged' : 'note'
    await logActivity(lead.id, type, { note: noteText.trim() })
    if (noteModal === 'call') {
      await updateLead(lead.id, { lastContactedAt: new Date().toISOString() } as Partial<RealEstateLead>)
    }
    setBusy(false)
    setNoteModal(null)
    setNoteText('')
    reload()
  }

  const scheduleVisit = async () => {
    if (!lead || !visitAt) return
    setBusy(true)
    await createSiteVisit({
      lead: lead.id,
      project: lead.project?.id,
      scheduledAt: new Date(visitAt).toISOString(),
      notes: visitNotes.trim() || undefined,
    })
    if (lead.status === 'new' || lead.status === 'contacted') {
      await updateLeadStatus(lead.id, 'site_visit_scheduled')
    }
    setBusy(false)
    setVisitModal(false)
    setVisitAt('')
    setVisitNotes('')
    reload()
  }

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <LoadingSpinner />
      </div>
    )
  }

  if (!lead) {
    return (
      <div className="p-8">
        <EmptyState
          icon={Flame}
          title="Lead not found"
          description="This lead may have been deleted or belongs to another organization."
          action={
            <Link href="/leads">
              <Button variant="secondary">Back to leads</Button>
            </Link>
          }
        />
      </div>
    )
  }

  const breakdown = lead.scoreBreakdown || []
  const totalPoints = breakdown.reduce((sum, f) => sum + (f.points || 0), 0)

  return (
    <div className="space-y-6 p-4 md:p-6">
      <EstatePageHeader
        title={lead.name}
        subtitle={`${formatSource(lead.source)} • ${LEAD_STATUS_LABELS[lead.status]} lead`}
        breadcrumb={[
          { label: 'Dashboard', href: '/' },
          { label: 'Leads', href: '/leads' },
          { label: lead.name, href: `/leads/${lead.id}` },
        ]}
        onBack={() => router.push('/leads')}
        showProfile
      >
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Link href={`/leads/${lead.id}/edit`} className={headerIconBtnClass} title="Edit">
            <Edit className="h-5 w-5" />
          </Link>
          <button type="button" className={headerIconBtnClass} title="Share" onClick={handleShare}>
            <Share2 className="h-5 w-5" />
          </button>
          <button type="button" className={headerIconBtnClass} title="Download" onClick={handleDownload}>
            <Download className="h-5 w-5" />
          </button>
        </div>
      </EstatePageHeader>

      {/* Quick actions */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
        <Button variant="secondary" size="sm" onClick={() => setNoteModal('call')}>
          <span className="flex items-center gap-1.5">
            <Phone className="h-4 w-4" /> Log call
          </span>
        </Button>
        <Button variant="secondary" size="sm" onClick={() => setVisitModal(true)}>
          <span className="flex items-center gap-1.5">
            <CalendarPlus className="h-4 w-4" /> Schedule site visit
          </span>
        </Button>
        <Button variant="secondary" size="sm" onClick={() => setNoteModal('note')}>
          <span className="flex items-center gap-1.5">
            <StickyNote className="h-4 w-4" /> Add note
          </span>
        </Button>
        <div className="ml-auto flex flex-wrap items-center gap-3">
          <div className="w-44">
            <Select
              value={lead.status}
              onChange={changeStatus}
              options={LEAD_STATUSES.map((s) => ({ value: s, label: LEAD_STATUS_LABELS[s] }))}
              placeholder="Change status"
            />
          </div>
          <div className="w-44">
            <Select
              value={lead.assignedTo ? String(lead.assignedTo.id) : ''}
              onChange={reassign}
              options={userOptions}
              placeholder="Reassign"
            />
          </div>
        </div>
      </div>

      <TabsWithActions
        variant="pill"
        tabs={[
          { key: 'overview', label: 'Overview' },
          {
            key: 'activity',
            label: 'Activity',
            badge: activities.length ? String(activities.length) : undefined,
          },
          {
            key: 'visits',
            label: 'Site visits',
            badge: visits.length ? String(visits.length) : undefined,
          },
        ]}
        activeTab={detailTab}
        onTabChange={setDetailTab}
      />

      {detailTab === 'overview' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card variant="elevated" className="rounded-xl">
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1 pr-2">
                  <h2 className="text-xl font-semibold text-gray-900">Lead information</h2>
                  <p className="mt-1.5 text-base text-gray-500">
                    Form answers, engagement, and how to reach this lead.
                  </p>
                </div>
                <div
                  className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-start sm:justify-end sm:gap-2.5"
                  role="group"
                  aria-label="Lead source and score"
                >
                  <span
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-orange-300/90 bg-gradient-to-br from-orange-50 via-orange-50 to-orange-100/90 px-4 py-2.5 text-sm font-bold uppercase tracking-widest text-orange-900 shadow-md ring-2 ring-orange-200/70"
                    title="Lead source"
                  >
                    <Target className="h-5 w-5 shrink-0 text-orange-600" strokeWidth={2.25} aria-hidden />
                    {formatSource(lead.source)}
                  </span>
                  <span
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-300/90 bg-gradient-to-br from-amber-50 via-amber-50 to-amber-100/90 px-4 py-2.5 text-sm font-bold uppercase tracking-widest text-amber-950 shadow-md ring-2 ring-amber-200/70"
                    title="Lead score"
                  >
                    <Gauge className="h-5 w-5 shrink-0 text-amber-600" strokeWidth={2.25} aria-hidden />
                    Score {lead.score}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <InfoSection title="Meta form answers" icon={FileText} isFirst>
                  {editingInfo ? (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Input
                        label="Budget"
                        value={infoDraft.budgetRange}
                        onChange={(e: any) => setInfoField('budgetRange', e.target.value)}
                        placeholder="e.g. ₹80L – ₹1.2Cr"
                      />
                      <Select
                        label="Timeline"
                        value={infoDraft.timeline}
                        onChange={(v: string) => setInfoField('timeline', v)}
                        options={[
                          { value: 'immediate', label: 'Immediate' },
                          { value: 'three_to_six_months', label: '3–6 months' },
                          { value: 'browsing', label: 'Browsing' },
                        ]}
                        placeholder="Select timeline"
                      />
                      <Select
                        label="Purpose"
                        value={infoDraft.purpose}
                        onChange={(v: string) => setInfoField('purpose', v)}
                        options={[
                          { value: 'own_use', label: 'Own use' },
                          { value: 'investment', label: 'Investment' },
                        ]}
                        placeholder="Select purpose"
                      />
                      <Input
                        label="Configuration interest"
                        value={infoDraft.configInterest}
                        onChange={(e: any) => setInfoField('configInterest', e.target.value)}
                        placeholder="e.g. 3 BHK"
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                      <InfoRow label="Budget" value={lead.budgetRange} emphasize />
                      <InfoRow label="Timeline" value={formatTimeline(lead.timeline)} />
                      <InfoRow label="Purpose" value={formatPurpose(lead.purpose)} />
                      <InfoRow label="Configuration interest" value={lead.configInterest} />
                    </div>
                  )}
                </InfoSection>

                <InfoSection title="Landing page engagement" icon={Globe}>
                  {lead.pageVisited ? (
                    <InfoRow
                      label="Time on project page"
                      icon={Clock}
                      value={lead.pageTimeSeconds != null ? formatSeconds(lead.pageTimeSeconds) : '—'}
                    />
                  ) : (
                    <div className="flex items-center gap-3 rounded-xl bg-gradient-to-br from-slate-50 to-gray-50/90 p-4 text-gray-500 ring-1 ring-gray-100">
                      <Globe className="h-5 w-5 shrink-0" />
                      <p className="text-sm">
                        Did not visit the project page. This is neutral — the lead is scored fully on
                        their form answers.
                      </p>
                    </div>
                  )}
                </InfoSection>

                <InfoSection title="Contact" icon={Phone}>
                  {editingInfo ? (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Input
                        label="Phone"
                        value={infoDraft.phone}
                        onChange={(e: any) => setInfoField('phone', e.target.value)}
                        placeholder="Phone number"
                      />
                      <Input
                        label="Email"
                        type="email"
                        value={infoDraft.email}
                        onChange={(e: any) => setInfoField('email', e.target.value)}
                        placeholder="name@example.com"
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                      <InfoRow label="Phone" icon={Phone} value={lead.phone} />
                      <InfoRow label="Email" icon={Mail} value={lead.email} />
                      <InfoRow label="Source" icon={Target} value={formatSource(lead.source)} />
                      <InfoRow
                        label="Last contacted"
                        icon={Clock}
                        value={lead.lastContactedAt ? timeAgo(lead.lastContactedAt) : 'Never'}
                      />
                    </div>
                  )}
                </InfoSection>
              </div>

              {editingInfo ? (
                <div className="mt-4 flex flex-wrap items-center justify-center gap-3 border-t border-gray-100 pt-4">
                  <Button variant="primary" onClick={saveInfoEdit} disabled={savingInfo}>
                    {savingInfo ? 'Saving…' : 'Save changes'}
                  </Button>
                  <Button variant="secondary" onClick={() => setEditingInfo(false)} disabled={savingInfo}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <p className="mt-4 border-t border-gray-100 pt-3 text-center text-sm text-gray-500">
                  <button
                    type="button"
                    onClick={openInfoEdit}
                    className="font-medium text-orange-600 hover:underline"
                  >
                    Edit lead details
                  </button>
                  <span className="mx-2 text-gray-300" aria-hidden>
                    ·
                  </span>
                  <Link
                    href={`/leads/${lead.id}/edit`}
                    className="font-medium text-gray-500 hover:text-orange-600 hover:underline"
                  >
                    Full edit page
                  </Link>
                </p>
              )}
            </Card>
          </div>

          <div className="space-y-6 lg:col-span-1">
            <Card variant="elevated" className="rounded-xl">
              <div className="mb-4 flex items-center justify-between gap-3 border-b border-gray-100 pb-4">
                <div className="flex items-center gap-2">
                  <Gauge className="h-5 w-5 shrink-0 text-orange-500" aria-hidden />
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
                    Lead score
                  </h3>
                </div>
                <span className="text-2xl font-bold text-gray-900">{lead.score}</span>
              </div>
              {breakdown.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No score breakdown yet — scoring runs automatically when leads arrive from Meta or
                  the landing page.
                </p>
              ) : (
                <>
                  <ul className="space-y-3">
                    {breakdown.map((factor, i) => (
                      <li key={i} className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            {FACTOR_LABELS[factor.factor] || factor.factor}
                          </p>
                          <p className="text-xs text-gray-500">{factor.reason}</p>
                        </div>
                        <span className="shrink-0 text-sm font-bold text-brand-primary">
                          +{factor.points}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Total
                    </span>
                    <span className="text-sm font-bold text-gray-900">
                      {totalPoints > 100 ? `${totalPoints} → capped at 100` : totalPoints}
                    </span>
                  </div>
                </>
              )}
            </Card>

            <Card variant="elevated" className="rounded-xl">
              <div className="mb-4 flex items-center gap-2">
                <User className="h-5 w-5 shrink-0 text-orange-500" aria-hidden />
                <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
                  Assignment
                </h3>
              </div>
              <div className="space-y-4">
                <InfoRow
                  label="Assigned to"
                  icon={User}
                  value={lead.assignedTo ? userLabel(lead.assignedTo as OrgUser) : 'Unassigned'}
                />
                <InfoRow label="Project" icon={MapPin} value={lead.project?.name} />
                <InfoRow
                  label="Created"
                  icon={Clock}
                  value={lead.createdAt ? formatDateTime(lead.createdAt) : '—'}
                />
              </div>
            </Card>
          </div>
        </div>
      )}

      {detailTab === 'activity' && (
        <Card variant="elevated" className="rounded-xl">
          <div className="mb-5 flex items-center gap-2">
            <Activity className="h-5 w-5 shrink-0 text-orange-500" aria-hidden />
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
                Activity timeline
              </h3>
              <p className="text-xs text-gray-400">Every event on this lead, newest first</p>
            </div>
          </div>
          {activities.length === 0 ? (
            <p className="text-sm text-gray-500">No activity yet.</p>
          ) : (
            <ol className="relative ml-2 space-y-5 border-l border-gray-200 pl-5">
              {activities.map((activity) => (
                <li key={activity.id} className="relative">
                  <span className="absolute -left-[26px] top-1 h-2.5 w-2.5 rounded-full bg-brand-primary" />
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-sm font-medium text-gray-900">
                      {ACTIVITY_LABELS[activity.type] || activity.type.replace(/_/g, ' ')}
                    </p>
                    <span className="shrink-0 text-xs text-gray-400">{timeAgo(activity.createdAt)}</span>
                  </div>
                  {activitySummary(activity) && (
                    <p className="mt-0.5 text-xs text-gray-500">{activitySummary(activity)}</p>
                  )}
                </li>
              ))}
            </ol>
          )}
        </Card>
      )}

      {detailTab === 'visits' && (
        <Card variant="elevated" className="rounded-xl">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CalendarPlus className="h-5 w-5 shrink-0 text-orange-500" aria-hidden />
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
                Site visits
              </h3>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setVisitModal(true)}>
              <span className="flex items-center gap-1.5">
                <CalendarPlus className="h-4 w-4" /> Schedule
              </span>
            </Button>
          </div>
          {visits.length === 0 ? (
            <p className="text-sm text-gray-500">No site visits yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {visits.map((v) => (
                <li key={v.id} className="flex items-start justify-between gap-3 py-3 first:pt-0">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900">{formatDateTime(v.scheduledAt)}</p>
                    <p className="text-xs text-gray-500">
                      {v.completedAt
                        ? `Completed — ${v.outcome || 'no outcome recorded'}`
                        : 'Scheduled'}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {/* Note / call modal */}
      <Modal
        isOpen={noteModal !== null}
        onClose={() => setNoteModal(null)}
        title={noteModal === 'call' ? 'Log a call' : 'Add a note'}
      >
        <Textarea
          label={noteModal === 'call' ? 'Call summary' : 'Note'}
          value={noteText}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNoteText(e.target.value)}
          rows={4}
          placeholder={noteModal === 'call' ? 'Spoke about pricing, wants a 3BHK…' : 'Add context for the team…'}
        />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setNoteModal(null)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={saveNote} disabled={busy || !noteText.trim()}>
            {busy ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </Modal>

      {/* Schedule site visit modal */}
      <Modal isOpen={visitModal} onClose={() => setVisitModal(false)} title="Schedule site visit">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Date &amp; time</label>
            <input
              type="datetime-local"
              value={visitAt}
              onChange={(e) => setVisitAt(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
          </div>
          <Textarea
            label="Notes (optional)"
            value={visitNotes}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setVisitNotes(e.target.value)}
            rows={3}
            placeholder="Meeting point, preferences…"
          />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setVisitModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={scheduleVisit} disabled={busy || !visitAt}>
            {busy ? 'Scheduling…' : 'Schedule'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
