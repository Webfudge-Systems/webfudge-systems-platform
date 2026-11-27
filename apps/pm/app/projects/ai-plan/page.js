'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@webfudge/auth'
import {
  Card,
  Button,
  Input,
  Textarea,
  Select,
  LoadingSpinner,
  UpgradePrompt,
  planErrorDetails,
  IS_SAAS_PLATFORM,
} from '@webfudge/ui'
import {
  ArrowLeft,
  Sparkles,
  FileText,
  Upload,
  X,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Users,
  AlertTriangle,
  Link2,
} from 'lucide-react'
import PMPageHeader from '../../../components/PMPageHeader'
import aiPlannerService from '../../../lib/api/aiPlannerService'
import useWorkspaces from '../../../lib/useWorkspaces'
import { fetchProjectClientOptions, mapProjectClientSelectOptions } from '../../../lib/api/projectClientOptions'
import { fetchProjectDirectoryUsers } from '../../../lib/api/messageService'
import { transformUser } from '../../../lib/api/dataTransformers'
import { getPmOrgRoleKind } from '../../../lib/pmOrgRoles'
import { TASK_TYPE_OPTIONS, reflow, nextRef, allTasks, dayToDate } from '../../../lib/aiPlan'

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'Hindi (हिन्दी)' },
  { value: 'mr', label: 'Marathi (मराठी)' },
]
const INVOICE_OPTIONS = [
  { value: 'full', label: 'Draft invoice for the full deal value' },
  { value: 'split50', label: 'Two drafts: 50% advance now, 50% on delivery' },
  { value: 'none', label: 'No invoice' },
]
const ACCEPT = '.pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain'
const MAX_FILE_MB = 10

const today = () => new Date().toISOString().slice(0, 10)
const cellCls =
  'w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-900 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 disabled:bg-gray-50'
const numCls = `${cellCls} text-right tabular-nums`

function errorView(err) {
  const plan = planErrorDetails(err)
  if (plan) return { plan }
  const code = err?.details?.code
  if (code === 'AI_DISABLED') return { message: 'Fudge AI is not switched on for this workspace yet.' }
  if (code === 'AI_NOT_CONFIGURED') return { message: 'Fudge AI is not set up on this server yet (no AI provider key). Ask your administrator.' }
  if (code === 'AI_TIMEOUT') return { message: 'Fudge AI took too long to answer. Try again, or shorten the brief.' }
  return { message: err?.message || 'Something went wrong. Please try again.' }
}

export default function AiProjectPlannerPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const dealId = searchParams.get('deal') || ''
  const { user: authUser } = useAuth()
  const currentUserId = useMemo(() => {
    const u = authUser?.attributes || authUser
    return u?.id ?? authUser?.id ?? null
  }, [authUser])

  // Input
  const [brief, setBrief] = useState('')
  const [file, setFile] = useState(null)
  const [language, setLanguage] = useState('en')
  const fileRef = useRef(null)

  // Result
  const [plan, setPlan] = useState(null)
  const [meta, setMeta] = useState(null) // { model, creditsUsed, credits, source }
  const [generating, setGenerating] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState(null)

  // Project settings
  const [project, setProject] = useState({
    name: '',
    startDate: searchParams.get('startDate') || today(),
    workspaceId: '',
    clientId: searchParams.get('clientAccount') || '',
    projectManagerId: '',
  })
  const [invoicePlan, setInvoicePlan] = useState(searchParams.get('invoicePlan') || 'full')
  const [roleAssignments, setRoleAssignments] = useState({})

  // Directory data
  const [users, setUsers] = useState([])
  const [clientOptions, setClientOptions] = useState([])
  const { workspaces, activeId: activeWorkspaceId } = useWorkspaces()

  useEffect(() => {
    if (!dealId && getPmOrgRoleKind() === 'member') router.replace('/projects')
  }, [dealId, router])

  useEffect(() => {
    fetchProjectDirectoryUsers()
      .then((raw) => setUsers((raw || []).map(transformUser).filter(Boolean)))
      .catch(() => setUsers([]))
    if (!dealId) {
      fetchProjectClientOptions()
        .then((rows) => setClientOptions(mapProjectClientSelectOptions(rows)))
        .catch(() => setClientOptions([]))
    }
  }, [dealId])

  useEffect(() => {
    if (currentUserId != null) setProject((p) => (p.projectManagerId ? p : { ...p, projectManagerId: String(currentUserId) }))
  }, [currentUserId])

  useEffect(() => {
    if (project.workspaceId || !workspaces.length) return
    const preferred = workspaces.find((w) => String(w.id) === String(activeWorkspaceId)) || workspaces.find((w) => w.isDefault) || workspaces[0]
    if (preferred) setProject((p) => ({ ...p, workspaceId: String(preferred.id) }))
  }, [workspaces, activeWorkspaceId, project.workspaceId])

  const userOptions = useMemo(
    () => users.map((u) => ({ value: String(u.id), label: u.name || u.username || u.email || `User ${u.id}` })),
    [users]
  )
  const workspaceOptions = useMemo(
    () => workspaces.map((w) => ({ value: String(w.id), label: w.membersMode === 'restricted' ? `${w.name} (restricted)` : w.name })),
    [workspaces]
  )

  // ---------- generate ----------

  const generate = useCallback(
    async ({ auto = false } = {}) => {
      if (!auto && !dealId && !brief.trim() && !file) {
        setError({ message: 'Paste a brief or upload the SOW first.' })
        return
      }
      setGenerating(true)
      setError(null)
      try {
        const data = await aiPlannerService.generatePlan({
          brief: brief.trim() || undefined,
          file: file || undefined,
          dealId: dealId || undefined,
          startDate: project.startDate,
          language,
        })
        const next = reflow(data.plan)
        setPlan(next)
        setMeta({ model: data.model, creditsUsed: data.creditsUsed, credits: data.credits, source: data.source })
        setProject((p) => ({ ...p, name: p.name || next.projectName || '' }))
      } catch (err) {
        setError(errorView(err))
      } finally {
        setGenerating(false)
      }
    },
    [brief, file, dealId, project.startDate, language]
  )

  // Deal handoff: plan straight away from the deal and its proposals (SOW).
  const autoRan = useRef(false)
  useEffect(() => {
    if (!IS_SAAS_PLATFORM || !dealId || autoRan.current) return
    autoRan.current = true
    generate({ auto: true })
  }, [dealId, generate])

  // ---------- edit ----------

  const update = (fn) => setPlan((prev) => reflow(fn(JSON.parse(JSON.stringify(prev)))))

  const setTask = (pi, ti, patch) =>
    update((p) => {
      Object.assign(p.phases[pi].tasks[ti], patch)
      return p
    })

  const removeTask = (pi, ti) =>
    update((p) => {
      const [gone] = p.phases[pi].tasks.splice(ti, 1)
      for (const t of allTasks(p)) t.dependsOn = (t.dependsOn || []).filter((r) => r !== gone.ref)
      if (!p.phases[pi].tasks.length) p.phases.splice(pi, 1)
      return p
    })

  const addTask = (pi) =>
    update((p) => {
      const prev = p.phases[pi].tasks[p.phases[pi].tasks.length - 1]
      p.phases[pi].tasks.push({
        ref: nextRef(p),
        name: 'New task',
        description: '',
        role: prev?.role || 'Project manager',
        type: 'task',
        estimateHours: 4,
        startDay: prev ? prev.startDay : 0,
        durationDays: 1,
        dependsOn: [],
      })
      return p
    })

  const moveTask = (pi, ti, dir) =>
    update((p) => {
      const list = p.phases[pi].tasks
      const j = ti + dir
      if (j < 0 || j >= list.length) return p
      ;[list[ti], list[j]] = [list[j], list[ti]]
      return p
    })

  const addPhase = () =>
    update((p) => {
      const ref = nextRef(p)
      p.phases.push({
        name: `Phase ${p.phases.length + 1}`,
        tasks: [{ ref, name: 'New task', description: '', role: 'Project manager', type: 'task', estimateHours: 4, startDay: p.totals?.durationDays || 0, durationDays: 1, dependsOn: [] }],
      })
      return p
    })

  const removePhase = (pi) =>
    update((p) => {
      const gone = new Set(p.phases[pi].tasks.map((t) => t.ref))
      p.phases.splice(pi, 1)
      for (const t of allTasks(p)) t.dependsOn = (t.dependsOn || []).filter((r) => !gone.has(r))
      return p
    })

  const movePhase = (pi, dir) =>
    update((p) => {
      const j = pi + dir
      if (j < 0 || j >= p.phases.length) return p
      ;[p.phases[pi], p.phases[j]] = [p.phases[j], p.phases[pi]]
      return p
    })

  const roleLabels = useMemo(() => [...new Set(allTasks(plan).map((t) => t.role).filter(Boolean))], [plan])
  const taskByRef = useMemo(() => new Map(allTasks(plan).map((t) => [t.ref, t])), [plan])

  // ---------- create ----------

  const assignmentsPayload = () => {
    const out = {}
    for (const r of plan?.roles || []) {
      const v = roleAssignments[r.key] ?? (r.key === 'projectManager' ? project.projectManagerId : '')
      if (v) out[r.key] = Number(v)
    }
    return out
  }

  const create = async () => {
    if (!plan) return
    if (!project.name.trim()) {
      setError({ message: 'Give the project a name.' })
      return
    }
    if (!plan.totals?.tasks) {
      setError({ message: 'The plan has no tasks. Add at least one.' })
      return
    }
    setCreating(true)
    setError(null)
    try {
      const res = dealId
        ? await aiPlannerService.createDealProject(dealId, {
            plan,
            projectName: project.name.trim(),
            startDate: project.startDate,
            roleAssignments: assignmentsPayload(),
            invoicePlan,
          })
        : await aiPlannerService.createProject({
            plan,
            project: {
              name: project.name.trim(),
              startDate: project.startDate,
              description: plan.summary || undefined,
              workspace: project.workspaceId ? Number(project.workspaceId) : undefined,
              clientAccount: project.clientId ? Number(project.clientId) : undefined,
              projectManager: project.projectManagerId ? Number(project.projectManagerId) : undefined,
            },
            roleAssignments: assignmentsPayload(),
          })
      const id = res?.data?.id
      router.push(id ? `/projects/${id}` : '/projects')
    } catch (err) {
      setError(errorView(err))
      setCreating(false)
    }
  }

  // ---------- render ----------

  const header = (
    <PMPageHeader
      title="Plan a project with AI"
      subtitle={dealId ? 'Fudge AI drafted a delivery plan from the won deal and its proposal. Edit it, then create the project.' : 'Paste a brief or upload the SOW. Fudge AI proposes phases, tasks, owners and estimates; you edit before anything is created.'}
      showProfile
      breadcrumb={[
        { label: 'Dashboard', href: '/' },
        { label: 'Projects', href: '/projects' },
        { label: 'Plan with AI', href: '#' },
      ]}
    />
  )

  if (!IS_SAAS_PLATFORM) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        {header}
        <Card>
          <p className="text-sm text-gray-600">The AI project planner is part of Fudge Work on webfudgesystems.in.</p>
          <Button className="mt-4" variant="outline" onClick={() => router.push('/projects/add')}>
            Create a project instead
          </Button>
        </Card>
      </div>
    )
  }

  const busy = generating || creating

  return (
    <div className="p-4 md:p-6 space-y-6">
      {header}

      {error?.plan ? <UpgradePrompt compact {...error.plan} /> : null}
      {error?.message ? (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
          <span>{error.message}</span>
        </div>
      ) : null}

      {/* Input */}
      {dealId ? (
        <Card>
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-100 text-orange-600">
              <Link2 className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900">From won deal #{dealId}</p>
              <p className="text-xs text-gray-500">
                The deal and its proposals (SOW) are the scope
                {meta?.source?.proposals?.length ? ` · ${meta.source.proposals.length} proposal${meta.source.proposals.length > 1 ? 's' : ''} read` : ''}. Add notes
                below to steer the plan.
              </p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
            <Textarea label="Extra notes (optional)" value={brief} onChange={(e) => setBrief(e.target.value)} rows={2} placeholder="e.g. Client wants launch before Diwali; we have no in-house videographer." disabled={busy} />
            <Button variant="outline" onClick={() => generate()} disabled={busy}>
              <Sparkles className="mr-2 h-4 w-4" aria-hidden="true" />
              {plan ? 'Regenerate' : 'Generate plan'}
            </Button>
          </div>
        </Card>
      ) : (
        <Card
          title={
            <span className="inline-flex items-center gap-3">
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-orange-500">
                <FileText className="h-4 w-4 text-white" />
              </span>
              <span>Brief or SOW</span>
            </span>
          }
          subtitle="Nothing is created until you review the plan"
        >
          <div className="space-y-4">
            <Textarea
              label="Project brief"
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              rows={plan ? 3 : 7}
              placeholder="What is the client buying? Pages, deliverables, channels, deadlines, who is involved…"
              disabled={busy}
            />
            <div className="flex flex-wrap items-center gap-3">
              <input
                ref={fileRef}
                type="file"
                accept={ACCEPT}
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0] || null
                  e.target.value = ''
                  if (f && f.size > MAX_FILE_MB * 1024 * 1024) {
                    setError({ message: `That file is larger than ${MAX_FILE_MB} MB. Upload a smaller file or paste the scope.` })
                    return
                  }
                  setFile(f)
                }}
              />
              {file ? (
                <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-800">
                  <FileText className="h-4 w-4 flex-shrink-0 text-gray-500" aria-hidden="true" />
                  <span className="truncate">{file.name}</span>
                  <button type="button" onClick={() => setFile(null)} className="rounded-full p-0.5 text-gray-500 hover:bg-gray-200" aria-label="Remove file" disabled={busy}>
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ) : (
                <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} disabled={busy}>
                  <Upload className="mr-2 h-4 w-4" aria-hidden="true" />
                  Upload SOW
                </Button>
              )}
              <span className="text-xs text-gray-500">PDF, Word (.docx) or text, up to {MAX_FILE_MB} MB</span>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:items-end">
              <Input label="Start date" type="date" value={project.startDate} onChange={(e) => setProject((p) => ({ ...p, startDate: e.target.value }))} disabled={busy} />
              <Select label="Plan language" value={language} options={LANGUAGE_OPTIONS} onChange={(v) => setLanguage(v || 'en')} allowEmpty={false} disabled={busy} />
              <Button variant="primary" onClick={() => generate()} disabled={busy} className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600">
                <Sparkles className="mr-2 h-4 w-4" aria-hidden="true" />
                {plan ? 'Regenerate plan' : 'Generate plan'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {generating ? (
        <Card>
          <div className="flex items-center gap-3 py-6" role="status" aria-live="polite">
            <LoadingSpinner size="md" />
            <div>
              <p className="text-sm font-semibold text-gray-900">Fudge AI is reading the scope and drafting the plan…</p>
              <p className="text-xs text-gray-500">A full plan can take up to a minute.</p>
            </div>
          </div>
        </Card>
      ) : null}

      {plan && !generating ? (
        <>
          {/* Summary + project settings */}
          <Card
            title={
              <span className="inline-flex items-center gap-3">
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-500">
                  <Sparkles className="h-4 w-4 text-white" />
                </span>
                <span>Proposed plan</span>
              </span>
            }
            subtitle={`${plan.phases.length} phases · ${plan.totals.tasks} tasks · ${plan.totals.hours} h estimated · about ${plan.totals.durationDays} days${meta?.creditsUsed ? ` · ${meta.creditsUsed} AI credit${meta.creditsUsed > 1 ? 's' : ''} used` : ''}`}
          >
            <div className="space-y-4">
              {plan.summary ? <p className="text-sm leading-relaxed text-gray-700">{plan.summary}</p> : null}
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Input label="Project name" required value={project.name} onChange={(e) => setProject((p) => ({ ...p, name: e.target.value }))} disabled={creating} />
                <Input label="Start date" type="date" value={project.startDate} onChange={(e) => setProject((p) => ({ ...p, startDate: e.target.value }))} disabled={creating} />
                {dealId ? (
                  <Select label="Invoice" value={invoicePlan} options={INVOICE_OPTIONS} onChange={(v) => setInvoicePlan(v || 'full')} allowEmpty={false} disabled={creating} />
                ) : (
                  <>
                    {workspaceOptions.length ? (
                      <Select label="Workspace" value={project.workspaceId} options={workspaceOptions} onChange={(v) => setProject((p) => ({ ...p, workspaceId: v ?? '' }))} allowEmpty={false} disabled={creating} />
                    ) : null}
                    <Select
                      label="Client"
                      value={project.clientId}
                      options={[{ value: '', label: 'No client' }, ...clientOptions]}
                      onChange={(v) => setProject((p) => ({ ...p, clientId: v ?? '' }))}
                      allowEmpty={false}
                      searchable
                      disabled={creating}
                    />
                    <Select
                      label="Project manager"
                      value={project.projectManagerId}
                      options={[{ value: '', label: 'Not assigned' }, ...userOptions]}
                      onChange={(v) => setProject((p) => ({ ...p, projectManagerId: v ?? '' }))}
                      disabled={creating}
                    />
                  </>
                )}
              </div>
            </div>
          </Card>

          {/* Owners by role */}
          <Card
            title={
              <span className="inline-flex items-center gap-3">
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500">
                  <Users className="h-4 w-4 text-white" />
                </span>
                <span>Owners by role</span>
              </span>
            }
            subtitle="Pick who does each role. Their tasks are assigned to them and they join the project team."
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {plan.roles.map((r) => (
                <label key={r.key} className="flex flex-col gap-1 rounded-xl border border-gray-200 p-3">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-semibold text-gray-900">{r.label}</span>
                    <span className="text-xs tabular-nums text-gray-500">
                      {r.taskCount} task{r.taskCount === 1 ? '' : 's'} · {Math.round(r.hours * 10) / 10} h
                    </span>
                  </span>
                  <select
                    className={cellCls}
                    value={roleAssignments[r.key] ?? (r.key === 'projectManager' && !dealId ? project.projectManagerId : '')}
                    onChange={(e) => setRoleAssignments((prev) => ({ ...prev, [r.key]: e.target.value }))}
                    disabled={creating}
                  >
                    <option value="">{r.key === 'projectManager' && dealId ? 'Deal owner (project manager)' : 'Unassigned'}</option>
                    {userOptions.map((u) => (
                      <option key={u.value} value={u.value}>
                        {u.label}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </Card>

          {/* Phases and tasks */}
          <datalist id="ai-plan-roles">
            {roleLabels.map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
          {plan.phases.map((phase, pi) => (
            <Card key={`${pi}-${phase.tasks[0]?.ref}`}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase text-gray-400">Phase {pi + 1}</span>
                <input
                  className="min-w-0 flex-1 rounded-lg border border-transparent px-2 py-1 text-base font-semibold text-gray-900 hover:border-gray-200 focus:border-orange-500 focus:outline-none"
                  value={phase.name}
                  onChange={(e) => update((p) => ((p.phases[pi].name = e.target.value), p))}
                  aria-label={`Phase ${pi + 1} name`}
                  disabled={creating}
                />
                <span className="text-xs tabular-nums text-gray-500">
                  {phase.tasks.length} tasks · {Math.round(phase.tasks.reduce((s, t) => s + (Number(t.estimateHours) || 0), 0) * 10) / 10} h
                </span>
                <div className="flex items-center">
                  <button type="button" className="rounded p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-30" onClick={() => movePhase(pi, -1)} disabled={creating || pi === 0} aria-label="Move phase up">
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button type="button" className="rounded p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-30" onClick={() => movePhase(pi, 1)} disabled={creating || pi === plan.phases.length - 1} aria-label="Move phase down">
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  <button type="button" className="rounded p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600" onClick={() => removePhase(pi)} disabled={creating} aria-label={`Remove phase ${phase.name}`}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mt-3 hidden grid-cols-[2.25rem_minmax(0,2.4fr)_minmax(0,1.3fr)_7.5rem_4.5rem_6.5rem_4.5rem_minmax(0,1.3fr)_4.5rem] gap-2 px-1 text-xs font-medium text-gray-500 xl:grid">
                <span>#</span>
                <span>Task</span>
                <span>Owner role</span>
                <span>Type</span>
                <span className="text-right">Hours</span>
                <span className="text-right">Start</span>
                <span className="text-right">Days</span>
                <span>Waits for</span>
                <span />
              </div>
              <div className="mt-2 divide-y divide-gray-100">
                {phase.tasks.map((t, ti) => {
                  const earlier = allTasks({ phases: plan.phases.slice(0, pi + 1).map((p, i) => (i === pi ? { ...p, tasks: p.tasks.slice(0, ti) } : p)) })
                  const choices = earlier.filter((e) => !t.dependsOn.includes(e.ref))
                  return (
                    <div key={t.ref} className="grid grid-cols-2 gap-2 py-2 sm:grid-cols-4 xl:grid-cols-[2.25rem_minmax(0,2.4fr)_minmax(0,1.3fr)_7.5rem_4.5rem_6.5rem_4.5rem_minmax(0,1.3fr)_4.5rem] xl:items-center">
                      <span className="col-span-2 text-xs font-semibold text-gray-400 sm:col-span-4 xl:col-span-1">{t.ref}</span>
                      <div className="col-span-2 sm:col-span-4 xl:col-span-1">
                        <input className={cellCls} value={t.name} onChange={(e) => setTask(pi, ti, { name: e.target.value })} aria-label={`${t.ref} task name`} disabled={creating} />
                        {t.description ? <p className="mt-1 line-clamp-2 px-1 text-xs text-gray-500">{t.description}</p> : null}
                      </div>
                      <input className={`${cellCls} col-span-2 sm:col-span-2 xl:col-span-1`} list="ai-plan-roles" value={t.role} onChange={(e) => setTask(pi, ti, { role: e.target.value })} aria-label={`${t.ref} owner role`} disabled={creating} />
                      <select className={`${cellCls} sm:col-span-2 xl:col-span-1`} value={t.type} onChange={(e) => setTask(pi, ti, { type: e.target.value })} aria-label={`${t.ref} type`} disabled={creating}>
                        {TASK_TYPE_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                      <input className={numCls} type="number" min="0" step="0.5" value={t.estimateHours} onChange={(e) => setTask(pi, ti, { estimateHours: e.target.value })} aria-label={`${t.ref} estimate in hours`} disabled={creating || t.type === 'milestone'} />
                      <label className="flex items-center gap-1">
                        <span className="w-12 flex-shrink-0 text-right text-xs text-gray-500">{dayToDate(project.startDate, t.startDay)}</span>
                        <input className={numCls} type="number" min="0" value={t.startDay} onChange={(e) => setTask(pi, ti, { startDay: e.target.value })} aria-label={`${t.ref} start day`} disabled={creating} />
                      </label>
                      <input className={numCls} type="number" min="0" value={t.durationDays} onChange={(e) => setTask(pi, ti, { durationDays: e.target.value })} aria-label={`${t.ref} duration in days`} disabled={creating || t.type === 'milestone'} />
                      <div className="col-span-2 flex flex-wrap items-center gap-1 sm:col-span-3 xl:col-span-1">
                        {t.dependsOn.map((r) => (
                          <span key={r} className="inline-flex items-center gap-0.5 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700" title={taskByRef.get(r)?.name}>
                            {r}
                            <button type="button" className="rounded-full text-gray-400 hover:text-gray-700" onClick={() => setTask(pi, ti, { dependsOn: t.dependsOn.filter((x) => x !== r) })} aria-label={`Remove dependency on ${r}`} disabled={creating}>
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                        {choices.length ? (
                          <select
                            className="rounded-full border border-dashed border-gray-300 bg-white px-2 py-0.5 text-xs text-gray-500"
                            value=""
                            onChange={(e) => e.target.value && setTask(pi, ti, { dependsOn: [...t.dependsOn, e.target.value] })}
                            aria-label={`${t.ref} add dependency`}
                            disabled={creating}
                          >
                            <option value="">+ waits for</option>
                            {choices.map((c) => (
                              <option key={c.ref} value={c.ref}>
                                {c.ref} · {c.name.slice(0, 40)}
                              </option>
                            ))}
                          </select>
                        ) : null}
                      </div>
                      <div className="flex items-center justify-end">
                        <button type="button" className="rounded p-1 text-gray-400 hover:bg-gray-100 disabled:opacity-30" onClick={() => moveTask(pi, ti, -1)} disabled={creating || ti === 0} aria-label={`Move ${t.ref} up`}>
                          <ChevronUp className="h-4 w-4" />
                        </button>
                        <button type="button" className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600" onClick={() => removeTask(pi, ti)} disabled={creating} aria-label={`Remove ${t.ref}`}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
              <button type="button" className="mt-2 inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-medium text-orange-600 hover:bg-orange-50" onClick={() => addTask(pi)} disabled={creating}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add task
              </button>
            </Card>
          ))}

          <button type="button" className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-orange-600 hover:bg-orange-50" onClick={addPhase} disabled={creating}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add phase
          </button>

          {plan.assumptions?.length || plan.risks?.length ? (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {plan.assumptions?.length ? (
                <Card title="Assumptions to confirm">
                  <ul className="list-disc space-y-1 pl-5 text-sm text-gray-700">
                    {plan.assumptions.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </Card>
              ) : null}
              {plan.risks?.length ? (
                <Card title="Delivery risks">
                  <ul className="list-disc space-y-1 pl-5 text-sm text-gray-700">
                    {plan.risks.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </Card>
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button type="button" variant="outline" onClick={() => router.push('/projects')} disabled={creating}>
          <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
          Cancel
        </Button>
        {plan && !generating ? (
          <Button type="button" variant="primary" rounded="pill" onClick={create} disabled={busy} className="bg-gradient-to-r from-orange-500 to-pink-500 px-6 shadow-lg hover:from-orange-600 hover:to-pink-600">
            {creating ? (
              <>
                <LoadingSpinner size="sm" />
                <span className="ml-2">Creating project…</span>
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                Create project with {plan.totals.tasks} tasks
              </>
            )}
          </Button>
        ) : null}
      </div>
    </div>
  )
}
