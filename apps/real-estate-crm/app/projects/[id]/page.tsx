'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  Activity,
  Building2,
  CalendarCheck,
  CalendarClock,
  CalendarPlus,
  ClipboardCheck,
  Download,
  Edit,
  ExternalLink,
  FileText,
  Flame,
  Globe,
  IndianRupee,
  Layers,
  MapPin,
  Share2,
  Tag,
  Trash2,
  TrendingUp,
  Users,
} from 'lucide-react'
import {
  ActivitiesTimeline,
  Badge,
  Button,
  Card,
  EmptyState,
  InfoRow,
  InfoSection,
  Input,
  KPICard,
  LoadingSpinner,
  Modal,
  Select,
  TabsWithActions,
  Textarea,
} from '@webfudge/ui'
import {
  getProject,
  listProjectActivities,
  updateProject,
  type ProjectActivity,
} from '../../../lib/api/projectService'
import { listLeads } from '../../../lib/api/leadService'
import {
  createSiteVisit,
  deleteSiteVisit,
  listSiteVisits,
  updateSiteVisit,
} from '../../../lib/api/siteVisitService'
import TierPill from '../../../components/TierPill'
import EstatePageHeader from '../../../components/EstatePageHeader'
import LeadsWorkspace from '../../../components/LeadsWorkspace'
import { formatDate, formatDateTime, formatInr } from '../../../lib/format'
import {
  PROJECT_STATUSES,
  PROJECT_STATUS_LABELS,
  type LeadTier,
  type ProjectStatus,
  type RealEstateLead,
  type RealEstateProject,
  type SiteVisit,
} from '../../../lib/types'

const TIERS: LeadTier[] = ['hot', 'warm', 'cold']

const TIER_BAR_COLORS: Record<LeadTier, string> = {
  hot: 'bg-red-500',
  warm: 'bg-amber-500',
  cold: 'bg-gray-400',
}

const STATUS_PILL: Record<ProjectStatus, string> = {
  active: 'border-emerald-300/90 bg-gradient-to-br from-emerald-50 via-emerald-50 to-emerald-100/90 text-emerald-900 ring-emerald-200/70',
  upcoming: 'border-sky-300/90 bg-gradient-to-br from-sky-50 via-sky-50 to-sky-100/90 text-sky-900 ring-sky-200/70',
  sold_out: 'border-orange-300/90 bg-gradient-to-br from-orange-50 via-orange-50 to-orange-100/90 text-orange-900 ring-orange-200/70',
  archived: 'border-gray-300/90 bg-gradient-to-br from-gray-50 via-gray-50 to-gray-100/90 text-gray-700 ring-gray-200/70',
}

const headerIconBtnClass =
  'p-2.5 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl hover:bg-white/20 hover:border-white/30 transition-all duration-300 shadow-lg text-brand-text-light'

const OUTCOME_OPTIONS = [
  { value: 'visited_interested', label: 'Visited — interested' },
  { value: 'visited_not_interested', label: 'Visited — not interested' },
  { value: 'no_show', label: 'No show' },
  { value: 'rescheduled', label: 'Rescheduled' },
]

const OUTCOME_LABELS: Record<string, string> = Object.fromEntries(
  OUTCOME_OPTIONS.map((o) => [o.value, o.label])
)

const normalizeUrl = (url?: string | null) =>
  url ? (url.startsWith('http') ? url : `https://${url}`) : ''

interface InfoDraft {
  developerName: string
  location: string
  minPrice: string
  maxPrice: string
  configurations: string
  possessionDate: string
  status: ProjectStatus
  landingPageUrl: string
  metaCampaignId: string
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [project, setProject] = useState<RealEstateProject | null>(null)
  const [leads, setLeads] = useState<RealEstateLead[]>([])
  const [totalLeads, setTotalLeads] = useState(0)
  const [visits, setVisits] = useState<SiteVisit[]>([])
  const [projectActivities, setProjectActivities] = useState<ProjectActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [detailTab, setDetailTab] = useState('overview')

  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [scheduleAt, setScheduleAt] = useState('')
  const [scheduleLeadId, setScheduleLeadId] = useState('')
  const [scheduleNotes, setScheduleNotes] = useState('')
  const [scheduleBusy, setScheduleBusy] = useState(false)

  const [loggingVisit, setLoggingVisit] = useState<SiteVisit | null>(null)
  const [outcome, setOutcome] = useState('')
  const [outcomeNotes, setOutcomeNotes] = useState('')
  const [outcomeBusy, setOutcomeBusy] = useState(false)

  const [visitToDelete, setVisitToDelete] = useState<SiteVisit | null>(null)
  const [deletingVisit, setDeletingVisit] = useState(false)

  const [editingInfo, setEditingInfo] = useState(false)
  const [savingInfo, setSavingInfo] = useState(false)
  const [infoDraft, setInfoDraft] = useState<InfoDraft>({
    developerName: '',
    location: '',
    minPrice: '',
    maxPrice: '',
    configurations: '',
    possessionDate: '',
    status: 'active',
    landingPageUrl: '',
    metaCampaignId: '',
  })

  const reloadProject = useCallback(() => {
    if (!id) return
    getProject(id).then(setProject)
    listProjectActivities(id).then(setProjectActivities)
  }, [id])

  useEffect(() => {
    if (!id) return
    let cancelled = false
    Promise.all([
      getProject(id),
      listLeads({ pageSize: 100, filters: { project: id } }),
      listSiteVisits({ project: id }),
      listProjectActivities(id),
    ]).then(([projectData, leadRes, visitRes, activityRes]) => {
      if (cancelled) return
      setProject(projectData)
      setLeads(leadRes.data)
      setTotalLeads(leadRes.meta.pagination.total)
      setVisits(visitRes.data)
      setProjectActivities(activityRes)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [id])

  const funnel = useMemo(() => {
    const byTier: Record<LeadTier, RealEstateLead[]> = { hot: [], warm: [], cold: [] }
    for (const lead of leads) {
      byTier[lead.tier || 'cold']?.push(lead)
    }
    const conversion = (tierLeads: RealEstateLead[]) => {
      if (!tierLeads.length) return null
      const booked = tierLeads.filter((l) => l.status === 'booked').length
      return Math.round((booked / tierLeads.length) * 100)
    }
    return TIERS.map((tier) => ({
      tier,
      count: byTier[tier].length,
      share: leads.length ? Math.round((byTier[tier].length / leads.length) * 100) : 0,
      conversion: conversion(byTier[tier]),
    }))
  }, [leads])

  const qualifiedCount = useMemo(
    () => leads.filter((l) => l.tier === 'hot' || l.tier === 'warm').length,
    [leads]
  )

  const bookedCount = useMemo(() => leads.filter((l) => l.status === 'booked').length, [leads])

  const activityEvents = useMemo(() => {
    const events: {
      id: string
      action: 'create' | 'update' | 'comment' | 'delete'
      summary: string
      createdAt: string
      href?: string
      actor?: ProjectActivity['actor']
      meta?: ProjectActivity['meta']
    }[] = []
    for (const activity of projectActivities) {
      events.push({
        id: `activity-${activity.id}`,
        action: activity.action,
        summary: activity.summary,
        createdAt: activity.createdAt,
        actor: activity.actor,
        meta: activity.meta,
      })
    }
    for (const lead of leads) {
      if (lead.createdAt) {
        events.push({
          id: `lead-${lead.id}`,
          action: 'create',
          summary: `${lead.name || 'New lead'} added as a lead${
            lead.tier ? ` — ${lead.tier} tier, score ${lead.score ?? 0}` : ''
          }`,
          createdAt: lead.createdAt,
          href: `/leads/${lead.id}`,
        })
      }
    }
    for (const v of visits) {
      if (v.completedAt) {
        events.push({
          id: `visit-done-${v.id}`,
          action: 'update',
          summary: `Site visit completed${v.lead?.name ? ` with ${v.lead.name}` : ''} — ${
            v.outcome || 'no outcome recorded'
          }`,
          createdAt: v.completedAt,
          href: '/site-visits',
        })
      } else if (v.scheduledAt) {
        events.push({
          id: `visit-sched-${v.id}`,
          action: 'update',
          summary: `Site visit scheduled${v.lead?.name ? ` with ${v.lead.name}` : ''} for ${formatDateTime(
            v.scheduledAt
          )}`,
          createdAt: v.scheduledAt,
          href: '/site-visits',
        })
      }
    }
    return events
      .filter((e) => e.createdAt)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 60)
  }, [leads, visits, projectActivities])

  const handleShare = useCallback(async () => {
    const url = typeof window !== 'undefined' ? window.location.href : ''
    try {
      if (navigator.share) {
        await navigator.share({ title: project?.name || 'Project', url })
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url)
      }
    } catch {
      /* ignore */
    }
  }, [project?.name])

  const handleDownload = useCallback(() => {
    if (!project || typeof window === 'undefined') return
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `real-estate-project-${project.id || id}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }, [project, id])

  const openInfoEdit = () => {
    if (!project) return
    setInfoDraft({
      developerName: project.developerName || '',
      location: project.location || '',
      minPrice: project.minPrice != null ? String(project.minPrice) : '',
      maxPrice: project.maxPrice != null ? String(project.maxPrice) : '',
      configurations: (project.configurations || []).join(', '),
      possessionDate: project.possessionDate || '',
      status: project.status || 'active',
      landingPageUrl: project.landingPageUrl || '',
      metaCampaignId: project.metaCampaignId || '',
    })
    setEditingInfo(true)
  }

  const setInfoField = (key: keyof InfoDraft, value: string) =>
    setInfoDraft((prev) => ({ ...prev, [key]: value }))

  const saveInfoEdit = async () => {
    if (!project) return
    setSavingInfo(true)
    try {
      await updateProject(project.id, {
        developerName: infoDraft.developerName.trim() || null,
        location: infoDraft.location.trim() || null,
        minPrice: infoDraft.minPrice ? Number(infoDraft.minPrice) : null,
        maxPrice: infoDraft.maxPrice ? Number(infoDraft.maxPrice) : null,
        configurations: infoDraft.configurations
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        possessionDate: infoDraft.possessionDate || null,
        status: infoDraft.status,
        landingPageUrl: infoDraft.landingPageUrl.trim() || null,
        metaCampaignId: infoDraft.metaCampaignId.trim() || null,
      })
      setEditingInfo(false)
      reloadProject()
    } finally {
      setSavingInfo(false)
    }
  }

  const reloadVisits = useCallback(() => {
    if (!id) return
    listSiteVisits({ project: id }).then((res) => setVisits(res.data))
  }, [id])

  const openScheduleVisit = () => {
    setScheduleAt('')
    setScheduleLeadId('')
    setScheduleNotes('')
    setScheduleOpen(true)
  }

  const scheduleVisit = async () => {
    if (!id || !scheduleAt) return
    setScheduleBusy(true)
    try {
      await createSiteVisit({
        project: id,
        lead: scheduleLeadId || undefined,
        scheduledAt: new Date(scheduleAt).toISOString(),
        notes: scheduleNotes.trim() || undefined,
      })
      setScheduleOpen(false)
      reloadVisits()
    } finally {
      setScheduleBusy(false)
    }
  }

  const openLogOutcome = (visit: SiteVisit) => {
    setOutcome('')
    setOutcomeNotes('')
    setLoggingVisit(visit)
  }

  const saveOutcome = async () => {
    if (!loggingVisit || !outcome) return
    setOutcomeBusy(true)
    try {
      await updateSiteVisit(loggingVisit.id, {
        completedAt: new Date().toISOString(),
        outcome,
        notes: outcomeNotes.trim() || undefined,
      })
      setLoggingVisit(null)
      reloadVisits()
    } finally {
      setOutcomeBusy(false)
    }
  }

  const confirmDeleteVisit = async () => {
    if (!visitToDelete) return
    setDeletingVisit(true)
    try {
      await deleteSiteVisit(visitToDelete.id)
      setVisitToDelete(null)
      reloadVisits()
    } finally {
      setDeletingVisit(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <LoadingSpinner />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="p-8">
        <EmptyState
          icon={Building2}
          title="Project not found"
          action={
            <Link href="/projects">
              <Button variant="secondary">Back to projects</Button>
            </Link>
          }
        />
      </div>
    )
  }

  const status = project.status || 'active'
  const priceLabel =
    project.minPrice || project.maxPrice
      ? `${formatInr(project.minPrice)} – ${formatInr(project.maxPrice)}`
      : null
  const landingUrl = normalizeUrl(project.landingPageUrl)

  return (
    <div className="space-y-6 p-4 md:p-6">
      <EstatePageHeader
        title={project.name}
        subtitle={`${[project.developerName, project.location].filter(Boolean).join(' · ') || 'No developer'}${
          project.possessionDate ? ` · Possession ${formatDate(project.possessionDate)}` : ''
        }`}
        breadcrumb={[
          { label: 'Dashboard', href: '/' },
          { label: 'Projects', href: '/projects' },
          { label: project.name, href: `/projects/${project.id}` },
        ]}
        onBack={() => router.push('/projects')}
        showProfile
      >
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button type="button" className={headerIconBtnClass} title="Edit" onClick={openInfoEdit}>
            <Edit className="h-5 w-5" />
          </button>
          <button type="button" className={headerIconBtnClass} title="Share" onClick={handleShare}>
            <Share2 className="h-5 w-5" />
          </button>
          <button type="button" className={headerIconBtnClass} title="Download" onClick={handleDownload}>
            <Download className="h-5 w-5" />
          </button>
        </div>
      </EstatePageHeader>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard title="Total leads" value={String(totalLeads)} icon={Users} colorScheme="orange" />
        <KPICard
          title="Hot leads"
          value={String(funnel.find((f) => f.tier === 'hot')?.count ?? 0)}
          icon={Flame}
          colorScheme="orange"
        />
        <KPICard
          title="Qualified"
          value={String(qualifiedCount)}
          subtitle="Hot + warm"
          icon={TrendingUp}
          colorScheme="orange"
        />
        <KPICard
          title="Site visits booked"
          value={String(visits.length)}
          icon={CalendarCheck}
          colorScheme="orange"
        />
      </div>

      <TabsWithActions
        variant="pill"
        tabs={[
          { key: 'overview', label: 'Overview' },
          {
            key: 'leads',
            label: 'Leads',
            badge: totalLeads ? String(totalLeads) : undefined,
          },
          {
            key: 'visits',
            label: 'Site visits',
            badge: visits.length ? String(visits.length) : undefined,
          },
          {
            key: 'activity',
            label: 'Activity',
            badge: activityEvents.length ? String(activityEvents.length) : undefined,
          },
          { key: 'docs', label: 'Documents' },
        ]}
        activeTab={detailTab}
        onTabChange={setDetailTab}
      />

      {detailTab === 'overview' && (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-6 lg:col-span-2">
          <Card variant="elevated" className="rounded-xl">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1 pr-2">
                <h2 className="text-xl font-semibold text-gray-900">Project information</h2>
                <p className="mt-1.5 text-base text-gray-500">
                  Pricing, configurations, and how leads route to this project.
                </p>
              </div>
              <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-start sm:justify-end sm:gap-2.5">
                {priceLabel ? (
                  <span
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-orange-300/90 bg-gradient-to-br from-orange-50 via-orange-50 to-orange-100/90 px-4 py-2.5 text-sm font-bold uppercase tracking-wide text-orange-900 shadow-md ring-2 ring-orange-200/70"
                    title="Price range"
                  >
                    <IndianRupee className="h-5 w-5 shrink-0 text-orange-600" strokeWidth={2.25} aria-hidden />
                    {priceLabel}
                  </span>
                ) : null}
                <span
                  className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold uppercase tracking-widest shadow-md ring-2 ${STATUS_PILL[status]}`}
                  title="Status"
                >
                  <Building2 className="h-5 w-5 shrink-0" strokeWidth={2.25} aria-hidden />
                  {PROJECT_STATUS_LABELS[status]}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <InfoSection title="Overview" icon={Building2} isFirst>
                {editingInfo ? (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Input
                      label="Developer"
                      value={infoDraft.developerName}
                      onChange={(e: any) => setInfoField('developerName', e.target.value)}
                      placeholder="Acme Developers"
                    />
                    <Input
                      label="Location"
                      value={infoDraft.location}
                      onChange={(e: any) => setInfoField('location', e.target.value)}
                      placeholder="Baner, Pune"
                    />
                    <Input
                      label="Min price (₹)"
                      type="number"
                      value={infoDraft.minPrice}
                      onChange={(e: any) => setInfoField('minPrice', e.target.value)}
                      placeholder="8000000"
                    />
                    <Input
                      label="Max price (₹)"
                      type="number"
                      value={infoDraft.maxPrice}
                      onChange={(e: any) => setInfoField('maxPrice', e.target.value)}
                      placeholder="15000000"
                    />
                    <Input
                      label="Configurations (comma-separated)"
                      value={infoDraft.configurations}
                      onChange={(e: any) => setInfoField('configurations', e.target.value)}
                      placeholder="2BHK, 3BHK"
                    />
                    <Select
                      label="Status"
                      value={infoDraft.status}
                      onChange={(v: string) => setInfoField('status', v)}
                      options={PROJECT_STATUSES.map((s) => ({ value: s, label: PROJECT_STATUS_LABELS[s] }))}
                    />
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">Possession date</label>
                      <input
                        type="date"
                        value={infoDraft.possessionDate}
                        onChange={(e) => setInfoField('possessionDate', e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                    <InfoRow label="Developer" icon={Building2} value={project.developerName} />
                    <InfoRow label="Location" icon={MapPin} value={project.location} />
                    <InfoRow label="Price range" icon={IndianRupee} value={priceLabel || '—'} emphasize />
                    <InfoRow
                      label="Configurations"
                      icon={Layers}
                      value={(project.configurations || []).join(', ') || '—'}
                    />
                    <InfoRow label="Possession" icon={CalendarCheck} value={formatDate(project.possessionDate)} />
                  </div>
                )}
              </InfoSection>

              <InfoSection title="Marketing & routing" icon={Globe}>
                {editingInfo ? (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Input
                      label="Landing page URL"
                      value={infoDraft.landingPageUrl}
                      onChange={(e: any) => setInfoField('landingPageUrl', e.target.value)}
                      placeholder="https://…"
                    />
                    <Input
                      label="Meta campaign ID"
                      value={infoDraft.metaCampaignId}
                      onChange={(e: any) => setInfoField('metaCampaignId', e.target.value)}
                      placeholder="1203981234567"
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                    <InfoRow label="Landing page" icon={Globe}>
                      {landingUrl ? (
                        <a
                          href={landingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 font-semibold text-orange-600 hover:underline"
                        >
                          <span className="truncate">{project.landingPageUrl}</span>
                          <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                        </a>
                      ) : (
                        <span className="text-gray-400">Not set</span>
                      )}
                    </InfoRow>
                    <InfoRow label="Meta campaign" icon={Tag}>
                      {project.metaCampaignId ? (
                        <span className="font-mono text-sm text-gray-700">{project.metaCampaignId}</span>
                      ) : (
                        <span className="text-gray-400">Not linked</span>
                      )}
                    </InfoRow>
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
                  Edit project details
                </button>
              </p>
            )}
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6 lg:col-span-1">
          <Card variant="elevated" className="rounded-xl">
            <div className="mb-4 flex items-center justify-between gap-3 border-b border-gray-100 pb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 shrink-0 text-orange-500" aria-hidden />
                <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">Lead funnel</h3>
              </div>
              <span className="text-2xl font-bold text-gray-900">{leads.length}</span>
            </div>
            {leads.length === 0 ? (
              <p className="text-sm text-gray-500">No leads to analyse yet.</p>
            ) : (
              <div className="space-y-4">
                {funnel.map(({ tier, count, share, conversion }) => (
                  <div key={tier}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <TierPill tier={tier} />
                        <span className="text-gray-600">{count}</span>
                      </span>
                      <span className="text-xs text-gray-500">
                        {conversion == null ? 'no leads' : `${conversion}% booked`}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        className={`h-full rounded-full ${TIER_BAR_COLORS[tier]}`}
                        style={{ width: `${share}%` }}
                      />
                    </div>
                  </div>
                ))}
                <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-3 text-sm">
                  <span className="font-semibold uppercase tracking-wide text-gray-500">Booked</span>
                  <span className="font-bold text-gray-900">{bookedCount}</span>
                </div>
              </div>
            )}
          </Card>

          <Card variant="elevated" className="rounded-xl">
            <div className="mb-4 flex items-center gap-2">
              <Globe className="h-5 w-5 shrink-0 text-orange-500" aria-hidden />
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">Quick actions</h3>
            </div>
            <div className="space-y-3">
              {landingUrl ? (
                <a href={landingUrl} target="_blank" rel="noopener noreferrer" className="block">
                  <Button variant="secondary" className="w-full justify-center">
                    <span className="flex items-center gap-2">
                      <ExternalLink className="h-4 w-4" />
                      View landing page
                    </span>
                  </Button>
                </a>
              ) : (
                <p className="text-sm text-gray-500">
                  Add a landing page URL to preview the page leads see.
                </p>
              )}
              <Button variant="outline" className="w-full justify-center" onClick={openInfoEdit}>
                <span className="flex items-center gap-2">
                  <Edit className="h-4 w-4" />
                  Edit project details
                </span>
              </Button>
              <div className="flex items-center justify-between border-t border-gray-100 pt-3 text-sm">
                <span className="text-gray-500">Meta campaign</span>
                <Badge variant={project.metaCampaignId ? 'success' : 'default'} size="sm">
                  {project.metaCampaignId ? 'Linked' : 'Not linked'}
                </Badge>
              </div>
            </div>
          </Card>
        </div>
      </div>
      )}

      {detailTab === 'leads' && <LeadsWorkspace lockedProjectId={project.id} showKpis={false} />}

      {detailTab === 'visits' && (
        <Card variant="elevated" className="rounded-xl" padding={false}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-6 py-4">
            <div className="flex items-center gap-2">
              <CalendarCheck className="h-5 w-5 shrink-0 text-orange-500" aria-hidden />
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
                  Site visits
                </h3>
                <p className="text-xs text-gray-400">
                  {visits.length
                    ? `${visits.length} visit${visits.length === 1 ? '' : 's'} · ${
                        visits.filter((v) => !v.completedAt).length
                      } upcoming`
                    : 'Visits booked for this project'}
                </p>
              </div>
            </div>
            <Button variant="primary" size="sm" onClick={openScheduleVisit}>
              <span className="flex items-center gap-1.5">
                <CalendarPlus className="h-4 w-4" />
                Schedule visit
              </span>
            </Button>
          </div>
          {visits.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={CalendarClock}
                title="No site visits booked yet"
                description="Schedule a site visit for a lead interested in this project. Booked visits and their outcomes show up here."
                action={
                  <Button variant="primary" onClick={openScheduleVisit}>
                    <span className="flex items-center gap-1.5">
                      <CalendarPlus className="h-4 w-4" />
                      Schedule visit
                    </span>
                  </Button>
                }
              />
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {visits.map((v) => {
                const done = !!v.completedAt
                return (
                  <li key={v.id} className="flex items-start justify-between gap-3 px-6 py-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ${
                          done
                            ? 'bg-emerald-50 text-emerald-600 ring-emerald-100'
                            : 'bg-orange-50 text-orange-600 ring-orange-100'
                        }`}
                      >
                        {done ? (
                          <ClipboardCheck className="h-5 w-5" />
                        ) : (
                          <CalendarClock className="h-5 w-5" />
                        )}
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900">{formatDateTime(v.scheduledAt)}</p>
                        <p className="truncate text-sm text-gray-500">
                          {v.lead?.id ? (
                            <Link
                              href={`/leads/${v.lead.id}`}
                              className="font-medium text-orange-600 hover:underline"
                            >
                              {v.lead.name || 'Lead'}
                            </Link>
                          ) : (
                            <span>No lead linked</span>
                          )}
                          {v.notes ? <span className="text-gray-400"> · {v.notes}</span> : null}
                        </p>
                        {done ? (
                          <span className="mt-1.5 inline-flex">
                            <Badge
                              variant={
                                v.outcome === 'visited_interested'
                                  ? 'success'
                                  : v.outcome === 'no_show'
                                    ? 'danger'
                                    : 'default'
                              }
                              size="sm"
                            >
                              {OUTCOME_LABELS[v.outcome || ''] || v.outcome || 'Completed'}
                            </Badge>
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Badge variant={done ? 'success' : 'info'} size="sm">
                        {done ? 'Completed' : 'Upcoming'}
                      </Badge>
                      {!done ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-2 text-emerald-600 hover:bg-emerald-50"
                          title="Log outcome"
                          onClick={() => openLogOutcome(v)}
                        >
                          <ClipboardCheck className="h-4 w-4" />
                        </Button>
                      ) : null}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="p-2 text-red-600 hover:bg-red-50"
                        title="Delete visit"
                        onClick={() => setVisitToDelete(v)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
      )}

      {detailTab === 'activity' && (
        <Card variant="elevated" className="rounded-xl">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex flex-1 items-center gap-1.5">
              <Activity className="h-4 w-4 shrink-0 text-orange-500" aria-hidden />
              <span className="text-sm font-semibold text-gray-700">Timeline</span>
              <span className="text-xs text-gray-400">
                ({activityEvents.length} event{activityEvents.length !== 1 ? 's' : ''})
              </span>
            </div>
          </div>
          <ActivitiesTimeline
            items={activityEvents}
            entityHrefForRow={(row: { href?: string }) => row.href || null}
          />
        </Card>
      )}

      {detailTab === 'docs' && (
        <Card variant="elevated" className="rounded-xl">
          <EmptyState
            icon={FileText}
            title="No documents yet"
            description="Brochures, floor plans, price sheets, and agreements for this project will appear here once document uploads are enabled."
          />
        </Card>
      )}

      {/* Schedule site visit */}
      <Modal
        isOpen={scheduleOpen}
        onClose={() => {
          if (!scheduleBusy) setScheduleOpen(false)
        }}
        title="Schedule site visit"
        subtitle={`Book a visit for ${project.name}`}
        closeOnBackdrop={!scheduleBusy}
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Date &amp; time</label>
            <input
              type="datetime-local"
              value={scheduleAt}
              onChange={(e) => setScheduleAt(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
          </div>
          <Select
            label="Lead (optional)"
            value={scheduleLeadId}
            onChange={(v: string) => setScheduleLeadId(v)}
            options={[
              { value: '', label: 'No lead linked' },
              ...leads.map((l) => ({ value: String(l.id), label: l.name || `Lead ${l.id}` })),
            ]}
            placeholder="Select a lead…"
          />
          <Textarea
            label="Notes (optional)"
            value={scheduleNotes}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setScheduleNotes(e.target.value)}
            rows={3}
            placeholder="Meeting point, preferred floor, requirements…"
          />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setScheduleOpen(false)} disabled={scheduleBusy}>
            Cancel
          </Button>
          <Button variant="primary" onClick={scheduleVisit} disabled={scheduleBusy || !scheduleAt}>
            {scheduleBusy ? 'Scheduling…' : 'Schedule visit'}
          </Button>
        </div>
      </Modal>

      {/* Log visit outcome */}
      <Modal
        isOpen={loggingVisit !== null}
        onClose={() => setLoggingVisit(null)}
        title="Log visit outcome"
        subtitle={
          loggingVisit
            ? `${loggingVisit.lead?.name || 'Lead'} · ${formatDateTime(loggingVisit.scheduledAt)}`
            : undefined
        }
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
          <Button variant="outline" onClick={() => setLoggingVisit(null)} disabled={outcomeBusy}>
            Cancel
          </Button>
          <Button variant="primary" onClick={saveOutcome} disabled={outcomeBusy || !outcome}>
            {outcomeBusy ? 'Saving…' : 'Save outcome'}
          </Button>
        </div>
      </Modal>

      {/* Delete visit confirmation */}
      <Modal
        isOpen={!!visitToDelete}
        onClose={() => {
          if (!deletingVisit) setVisitToDelete(null)
        }}
        title="Delete site visit"
        size="md"
        closeOnBackdrop={!deletingVisit}
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
              <span className="font-semibold text-gray-900">
                {visitToDelete.lead?.name || 'this lead'}
              </span>{' '}
              scheduled {formatDateTime(visitToDelete.scheduledAt)}?
            </p>
            <div className="mt-1 flex flex-col-reverse gap-3 border-t border-gray-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <Button
                type="button"
                variant="outline"
                disabled={deletingVisit}
                onClick={() => setVisitToDelete(null)}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                disabled={deletingVisit}
                onClick={confirmDeleteVisit}
                className="w-full min-w-[9rem] sm:w-auto"
              >
                {deletingVisit ? 'Deleting…' : 'Delete visit'}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
