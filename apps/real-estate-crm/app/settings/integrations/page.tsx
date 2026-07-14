'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Check, Copy, ExternalLink, Plug, X } from 'lucide-react'
import { Badge, Button, Card, Input, LoadingSpinner } from '@webfudge/ui'
import { listProjects, updateProject } from '../../../lib/api/projectService'
import EstatePageHeader from '../../../components/EstatePageHeader'
import type { RealEstateProject } from '../../../lib/types'

interface MetaStatus {
  appConfigured: boolean
  accessTokenConfigured: boolean
  verifyTokenConfigured: boolean
  webhookSecretConfigured: boolean
  pixelConfigured: boolean
}

function StatusRow({ label, ok, hint }: { label: string; ok: boolean; hint: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div>
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-xs text-gray-500">{hint}</p>
      </div>
      <Badge variant={ok ? 'success' : 'default'} size="sm">
        <span className="flex items-center gap-1">
          {ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
          {ok ? 'Configured' : 'Not set'}
        </span>
      </Badge>
    </div>
  )
}

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div>
      <p className="mb-1 text-sm font-medium text-gray-700">{label}</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 truncate rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700">
          {value}
        </code>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            navigator.clipboard.writeText(value)
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
          }}
        >
          <span className="flex items-center gap-1.5">
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </span>
        </Button>
      </div>
    </div>
  )
}

export default function IntegrationsPage() {
  const [status, setStatus] = useState<MetaStatus | null>(null)
  const [projects, setProjects] = useState<RealEstateProject[]>([])
  const [loading, setLoading] = useState(true)
  const [campaignDrafts, setCampaignDrafts] = useState<Record<string, string>>({})
  const [savingId, setSavingId] = useState<string | null>(null)

  const reload = useCallback(() => {
    Promise.all([
      fetch('/api/integrations/meta/status')
        .then((r) => r.json())
        .catch(() => null),
      listProjects(),
    ]).then(([statusData, projectRes]) => {
      setStatus(statusData)
      setProjects(projectRes.data)
      setCampaignDrafts(
        Object.fromEntries(projectRes.data.map((p) => [String(p.id), p.metaCampaignId || '']))
      )
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  const webhookUrl = useMemo(() => {
    if (typeof window === 'undefined') return ''
    return `${window.location.origin}/api/webhooks/meta`
  }, [])

  const landingUrl = useMemo(() => {
    if (typeof window === 'undefined') return ''
    return `${window.location.origin}/api/webhooks/landing`
  }, [])

  const connected = Boolean(status?.appConfigured && status?.accessTokenConfigured)

  const saveCampaign = async (project: RealEstateProject) => {
    const value = (campaignDrafts[String(project.id)] || '').trim()
    setSavingId(String(project.id))
    await updateProject(project.id, { metaCampaignId: value || null })
    setSavingId(null)
    reload()
  }

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="max-w-3xl space-y-6 p-6 lg:p-8">
      <EstatePageHeader
        title="Integrations"
        subtitle="Connect your Meta Ads account and wire campaigns to projects."
        breadcrumb={[
          { label: 'Dashboard', href: '/' },
          { label: 'Settings', href: '/settings' },
          { label: 'Integrations', href: '/settings/integrations' },
        ]}
      />

      <Card
        title="Meta Ads"
        subtitle="Lead ads, campaign insights, and Conversions API"
        actions={
          <Badge variant={connected ? 'success' : 'warning'} size="sm">
            {connected ? 'Connected' : 'Setup required'}
          </Badge>
        }
      >
        <div className="divide-y divide-gray-100">
          <StatusRow
            label="Meta app credentials"
            ok={Boolean(status?.appConfigured)}
            hint="META_APP_ID and META_APP_SECRET in the app environment"
          />
          <StatusRow
            label="System user access token"
            ok={Boolean(status?.accessTokenConfigured)}
            hint="META_ACCESS_TOKEN — used to fetch full lead data when webhooks arrive"
          />
          <StatusRow
            label="Webhook verify token"
            ok={Boolean(status?.verifyTokenConfigured)}
            hint="META_VERIFY_TOKEN — Meta echoes this during webhook subscription"
          />
          <StatusRow
            label="Backend webhook secret"
            ok={Boolean(status?.webhookSecretConfigured)}
            hint="RE_WEBHOOK_SECRET — authenticates this app to the Strapi backend"
          />
          <StatusRow
            label="Pixel / Conversions API"
            ok={Boolean(status?.pixelConfigured)}
            hint="META_PIXEL_ID — optional, sends qualified-lead events back to Meta"
          />
        </div>
        <p className="mt-3 text-xs text-gray-500">
          Secrets are configured on the server (never in the browser). See{' '}
          <code className="rounded bg-gray-100 px-1 py-0.5">docs/META_ADS_INTEGRATION.md</code> for
          the full setup guide.
        </p>
      </Card>

      <Card title="Webhook endpoints" subtitle="Paste these into your Meta app and landing pages">
        <div className="space-y-4">
          <CopyField label="Meta leadgen webhook (subscribe in Meta App Dashboard)" value={webhookUrl} />
          <CopyField label="Landing page enrichment endpoint" value={landingUrl} />
        </div>
      </Card>

      <Card
        title="Campaign → project mapping"
        subtitle="Leads from a campaign are routed to its mapped project and scored against its price band"
      >
        {projects.length === 0 ? (
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-gray-500">No projects yet — create one first.</p>
            <Link href="/projects">
              <Button variant="secondary" size="sm">
                <span className="flex items-center gap-1.5">
                  Go to projects <ExternalLink className="h-3.5 w-3.5" />
                </span>
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {projects.map((project) => {
              const draft = campaignDrafts[String(project.id)] ?? ''
              const dirty = draft.trim() !== (project.metaCampaignId || '')
              return (
                <div key={project.id} className="flex items-end gap-3">
                  <div className="w-48 shrink-0 pb-2">
                    <p className="truncate text-sm font-medium text-gray-900">{project.name}</p>
                    <p className="truncate text-xs text-gray-500">{project.location || '—'}</p>
                  </div>
                  <div className="flex-1">
                    <Input
                      label="Meta campaign ID"
                      value={draft}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setCampaignDrafts((d) => ({ ...d, [String(project.id)]: e.target.value }))
                      }
                      placeholder="1203981234567"
                    />
                  </div>
                  <Button
                    variant={dirty ? 'primary' : 'outline'}
                    size="sm"
                    className="mb-0.5"
                    disabled={!dirty || savingId === String(project.id)}
                    onClick={() => saveCampaign(project)}
                  >
                    {savingId === String(project.id) ? 'Saving…' : 'Save'}
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      <Card title="Form field mapping" subtitle="How Meta instant form answers map to lead fields">
        <div className="flex items-start gap-3 text-gray-600">
          <Plug className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="text-sm">
            Standard fields (name, phone, email, budget, timeline, purpose, configuration) are
            mapped automatically. Custom question mappings can be set per project via the{' '}
            <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">metaFormFieldMapping</code>{' '}
            field on the project API.
          </p>
        </div>
      </Card>
    </div>
  )
}
