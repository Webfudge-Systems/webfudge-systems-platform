'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { BarChart3, CalendarCheck, Flame, IndianRupee, Users } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Button,
  Card,
  DashboardChartEmpty,
  DashboardChartPanel,
  EmptyState,
  KPICard,
} from '@webfudge/ui'
import { listLeads } from '../lib/api/leadService'
import { listSiteVisits } from '../lib/api/siteVisitService'
import EstatePageHeader from '../components/EstatePageHeader'
import TierPill from '../components/TierPill'
import { formatSource, timeAgo } from '../lib/format'
import type { RealEstateLead, SiteVisit } from '../lib/types'

const TIER_COLORS = { hot: '#ef4444', warm: '#f59e0b', cold: '#9ca3af' }

/** Buckets leads by ISO week-ish label for the last 6 weeks. */
function buildTierTrend(leads: RealEstateLead[]) {
  const weeks: { start: Date; label: string; hot: number; warm: number; cold: number }[] = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const start = new Date(now)
    start.setDate(now.getDate() - now.getDay() - i * 7)
    start.setHours(0, 0, 0, 0)
    weeks.push({
      start,
      label: start.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      hot: 0,
      warm: 0,
      cold: 0,
    })
  }
  for (const lead of leads) {
    if (!lead.createdAt) continue
    const created = new Date(lead.createdAt)
    for (let w = weeks.length - 1; w >= 0; w--) {
      if (created >= weeks[w].start) {
        const tier = lead.tier || 'cold'
        weeks[w][tier] += 1
        break
      }
    }
  }
  return weeks.map(({ label, hot, warm, cold }) => ({ name: label, hot, warm, cold }))
}

export default function DashboardPage() {
  const [leads, setLeads] = useState<RealEstateLead[]>([])
  const [total, setTotal] = useState(0)
  const [visits, setVisits] = useState<SiteVisit[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      listLeads({ pageSize: 100, sort: 'createdAt:desc' }),
      listSiteVisits({ pageSize: 100 }),
    ]).then(([leadRes, visitRes]) => {
      if (cancelled) return
      setLeads(leadRes.data)
      setTotal(leadRes.meta.pagination.total)
      setVisits(visitRes.data)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const hotLeads = useMemo(
    () => leads.filter((l) => l.tier === 'hot').sort((a, b) => (b.score || 0) - (a.score || 0)),
    [leads]
  )
  const visitsBooked = useMemo(() => visits.filter((v) => !v.completedAt).length, [visits])
  const trend = useMemo(() => buildTierTrend(leads), [leads])
  const trendHasData = trend.some((w) => w.hot + w.warm + w.cold > 0)

  return (
    <div className="space-y-6 p-4 md:p-6">
      <EstatePageHeader
        title="Dashboard"
        subtitle="Lead quality at a glance — hot leads first, always."
        breadcrumb={[{ label: 'Dashboard', href: '/' }]}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KPICard
          title="Total Leads"
          value={loading ? '—' : String(total)}
          subtitle="All sources"
          icon={Users}
          colorScheme="orange"
        />
        <KPICard
          title="Hot Leads"
          value={loading ? '—' : String(hotLeads.length)}
          subtitle="Score ≥ 70"
          icon={Flame}
          colorScheme="red"
        />
        <KPICard
          title="Cost / Qualified Lead"
          value="—"
          subtitle="Connect Meta Ads"
          icon={IndianRupee}
          colorScheme="green"
        />
        <KPICard
          title="Site Visits Booked"
          value={loading ? '—' : String(visitsBooked)}
          subtitle="Upcoming"
          icon={CalendarCheck}
          colorScheme="blue"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <DashboardChartPanel
            title="Leads by tier"
            subtitle="Weekly intake for the last six weeks"
            icon={BarChart3}
            loading={loading}
            chartClassName="h-72"
          >
            {!trendHasData ? (
              <DashboardChartEmpty message="No leads in the last six weeks yet." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trend} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                  <Bar dataKey="hot" name="Hot" stackId="tier" fill={TIER_COLORS.hot} radius={[0, 0, 0, 0]} />
                  <Bar dataKey="warm" name="Warm" stackId="tier" fill={TIER_COLORS.warm} />
                  <Bar dataKey="cold" name="Cold" stackId="tier" fill={TIER_COLORS.cold} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </DashboardChartPanel>
        </div>

        <div className="lg:col-span-2">
          <Card
            title="Recent hot leads"
            subtitle="Highest score first — call these now"
            className="h-full"
          >
            {hotLeads.length === 0 ? (
              <EmptyState
                icon={Flame}
                title="No hot leads yet"
                description="Hot leads appear here as soon as scoring identifies ready-to-buy prospects."
                action={
                  <Link href="/settings/integrations">
                    <Button variant="primary">Set up integrations</Button>
                  </Link>
                }
              />
            ) : (
              <ul className="divide-y divide-gray-100">
                {hotLeads.slice(0, 8).map((lead) => (
                  <li key={lead.id}>
                    <Link
                      href={`/leads/${lead.id}`}
                      className="flex items-center justify-between gap-4 rounded-lg px-2 py-3 transition-colors hover:bg-orange-50/60"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-gray-900">{lead.name}</p>
                        <p className="truncate text-sm text-gray-500">
                          {lead.project?.name || formatSource(lead.source)} ·{' '}
                          {lead.budgetRange || 'Budget undisclosed'} · {timeAgo(lead.createdAt)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <span className="text-sm font-bold text-gray-900">{lead.score}</span>
                        <TierPill tier={lead.tier} />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
