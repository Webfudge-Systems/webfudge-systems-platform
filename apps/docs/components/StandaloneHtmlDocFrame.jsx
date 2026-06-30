import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Boxes,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Code2,
  Database,
  FileCode2,
  KanbanSquare,
  PanelTop,
  Rocket,
  Sparkles,
  Target,
  UsersRound,
  Workflow,
} from 'lucide-react';

const DOCS = {
  crm: {
    shortName: 'Grow',
    label: 'Revenue OS',
    accent: 'orange',
    gradient: 'from-orange-500 via-amber-400 to-yellow-300',
    glow: 'bg-orange-500/25',
    text: 'text-orange-600',
    darkText: 'dark:text-orange-300',
    ring: 'ring-orange-500/20',
    border: 'border-orange-500/20',
    title: 'Sales operations manual for Fudge Grow',
    subtitle:
      'A structured operating guide for capturing demand, qualifying pipeline, managing activity, and turning customer context into revenue decisions.',
    promise: 'Move every lead from signal to signed deal without losing ownership, context, or next action.',
    stats: [
      ['5', 'Pipeline stages'],
      ['6', 'Core modules'],
      ['4h', 'Response SLA'],
    ],
    workflow: ['Capture', 'Qualify', 'Engage', 'Forecast', 'Close'],
    modules: [
      ['Lead intake', 'Create and assign demand from forms, campaigns, referrals, imports, or manual entry.'],
      ['Pipeline board', 'Track opportunities by stage, owner, value, close date, confidence, and risk.'],
      ['Contact intelligence', 'Connect people, companies, meetings, notes, proposals, and activity in one profile.'],
      ['Follow-up queue', 'Prioritize overdue tasks, next actions, calls, meetings, and customer replies.'],
      ['Proposal tracking', 'Monitor commercial documents from draft to send, review, negotiation, and acceptance.'],
      ['Manager reporting', 'Summarize pipeline health, owner performance, stuck deals, and forecast movement.'],
    ],
    objects: [
      ['Lead', 'A new sales signal with source, owner, score, status, and next action.'],
      ['Contact', 'A person connected to companies, deals, activities, and proposals.'],
      ['Company', 'The account-level profile for relationship and commercial context.'],
      ['Deal', 'A revenue opportunity with stage, value, probability, close date, and activity.'],
      ['Activity', 'A call, note, email, meeting, reminder, or logged sales touchpoint.'],
    ],
    api: `await grow.leads.create({
  source: 'website-demo',
  owner: 'sales@webfudge.com',
  company: 'Acme Manufacturing',
  nextAction: 'Schedule discovery call'
});`,
    launch: [
      'Define pipeline stages, qualification rules, and stage-exit criteria.',
      'Import companies, contacts, and leads with clean ownership fields.',
      'Configure follow-up reminders, proposal statuses, and reporting views.',
      'Review sales roles, customer visibility, and activity audit expectations.',
    ],
  },
  pm: {
    shortName: 'Flow',
    label: 'Delivery OS',
    accent: 'indigo',
    gradient: 'from-indigo-500 via-violet-500 to-fuchsia-400',
    glow: 'bg-indigo-500/25',
    text: 'text-indigo-600',
    darkText: 'dark:text-indigo-300',
    ring: 'ring-indigo-500/20',
    border: 'border-indigo-500/20',
    title: 'Project delivery manual for Fudge Flow',
    subtitle:
      'A practical guide for planning work, assigning ownership, sequencing dependencies, tracking execution, and closing launches with fewer surprises.',
    promise: 'Turn scattered project updates into one delivery system that shows scope, status, blockers, and handoff readiness.',
    stats: [
      ['4', 'Delivery lanes'],
      ['6', 'Workspace modules'],
      ['24h', 'Risk review'],
    ],
    workflow: ['Scope', 'Sequence', 'Execute', 'Review', 'Release'],
    modules: [
      ['Delivery dashboard', 'See project health, milestone drift, blocked work, velocity, and upcoming commitments.'],
      ['Task board', 'Run work through kanban stages with owners, priority, due dates, comments, and checklists.'],
      ['Calendar and timeline', 'Plan milestones, meetings, releases, dependencies, and sprint commitments.'],
      ['Team inbox', 'Centralize mentions, decisions, files, updates, and delivery conversations around the work.'],
      ['Risk radar', 'Surface overdue dependencies, stale work, capacity pressure, and blocked milestones.'],
      ['Resource planning', 'Understand ownership gaps, workload pressure, and active delivery allocation.'],
    ],
    objects: [
      ['Project', 'The container for scope, owners, client context, timeline, status, and budget.'],
      ['Task', 'A trackable unit of work with assignee, priority, due date, status, and comments.'],
      ['Milestone', 'A checkpoint that groups tasks and shows whether delivery is on pace.'],
      ['Meeting', 'A scheduled collaboration event with participants, outcomes, and follow-ups.'],
      ['Risk', 'A blocker or signal that requires manager attention before delivery slips.'],
    ],
    api: `await flow.tasks.create({
  projectId: 'proj_launch_42',
  title: 'Build milestone health widget',
  assignee: 'delivery@webfudge.com',
  priority: 'high',
  dueDate: '2026-07-18'
});`,
    launch: [
      'Create project roles for admins, managers, delivery owners, and contributors.',
      'Define task stages, priority rules, milestone names, and blocked-work handling.',
      'Prepare templates for discovery, implementation, QA, launch, and support.',
      'Connect calendar, inbox, and task notification flows before inviting live users.',
    ],
  },
  accounts: {
    shortName: 'Base',
    label: 'Control OS',
    accent: 'emerald',
    gradient: 'from-emerald-500 via-cyan-400 to-sky-300',
    glow: 'bg-emerald-500/25',
    text: 'text-emerald-600',
    darkText: 'dark:text-emerald-300',
    ring: 'ring-emerald-500/20',
    border: 'border-emerald-500/20',
    title: 'Administration manual for Fudge Base',
    subtitle:
      'A control-plane guide for managing organizations, users, roles, permissions, security policy, billing state, and audit evidence across Webfudge.',
    promise: 'Keep identity, access, subscription state, and audit history aligned before connected apps scale.',
    stats: [
      ['5', 'Admin roles'],
      ['99.9%', 'Audit readiness'],
      ['38k', 'Policy checks'],
    ],
    workflow: ['Authenticate', 'Authorize', 'Entitle', 'Record', 'Review'],
    modules: [
      ['Organization registry', 'Manage company profile, departments, workspace defaults, and connected apps.'],
      ['User lifecycle', 'Invite, activate, suspend, transfer ownership, and maintain identity records.'],
      ['Access policies', 'Control role scopes, permission bundles, 2FA posture, sessions, and admin delegation.'],
      ['Billing operations', 'Track plan state, seats, invoices, payment methods, usage, and renewal visibility.'],
      ['Audit evidence', 'Record account changes, security decisions, billing updates, and admin activity.'],
      ['Platform settings', 'Configure API keys, integrations, notification policies, and compliance defaults.'],
    ],
    objects: [
      ['Organization', 'The tenant profile for departments, billing, settings, and connected apps.'],
      ['User', 'A person with identity, role, status, department, and application access.'],
      ['Role', 'A bundle of permissions that controls what a user can view or change.'],
      ['Policy', 'A rule for authentication, authorization, session behavior, or entitlement.'],
      ['Audit event', 'An immutable record of who changed what, when, where, and why.'],
    ],
    api: `await base.users.invite({
  email: 'ops@acme.example',
  role: 'Manager',
  department: 'Operations',
  apps: ['crm', 'pm', 'books'],
  requireTwoFactor: true
});`,
    launch: [
      'Confirm organization profile, primary admin ownership, and billing contact.',
      'Create role bundles for executives, finance, operations, managers, and auditors.',
      'Enable 2FA, session timeout, SSO rules, API key rotation, and recovery procedures.',
      'Review audit exports, subscription usage, permission drift, and admin changes.',
    ],
  },
};

const nav = [
  ['overview', 'Cover'],
  ['workflow', 'Workflow'],
  ['modules', 'Modules'],
  ['data', 'Data'],
  ['launch', 'Launch'],
];

const growStages = [
  {
    label: 'Capture',
    title: 'Catch every buying signal',
    body: 'Website forms, referrals, campaigns, imports, and manual entries land in one owner-ready queue.',
    metric: '100%',
  },
  {
    label: 'Qualify',
    title: 'Score fit before handoff',
    body: 'Source, urgency, company profile, contact quality, expected value, and next action shape lead priority.',
    metric: '82',
  },
  {
    label: 'Engage',
    title: 'Move the relationship',
    body: 'Calls, emails, meetings, notes, reminders, and proposals stay attached to the same account memory.',
    metric: '4h',
  },
  {
    label: 'Forecast',
    title: 'Read pipeline health',
    body: 'Stage quality, weighted value, stuck deals, close dates, and owner activity become manager signals.',
    metric: '$1.8M',
  },
  {
    label: 'Close',
    title: 'Convert without losing context',
    body: 'Won deals turn into customer records, delivery handoffs, tasks, and future follow-up trails.',
    metric: 'Won',
  },
];

const growCommandCards = [
  [Target, 'Demand radar', 'Lead sources, campaign quality, response SLA, and owner coverage.'],
  [UsersRound, 'Account room', 'Company profile, stakeholders, relationship history, notes, and active deals.'],
  [KanbanSquare, 'Pipeline theater', 'Stage board, confidence, proposal status, close date, and risk flags.'],
  [CalendarClock, 'Follow-up engine', 'Overdue tasks, meeting prep, call reminders, and next-best actions.'],
  [BarChart3, 'Forecast desk', 'Weighted value, conversion quality, stage movement, and rep performance.'],
  [Activity, 'Activity stream', 'Logged calls, emails, notes, proposal events, and timeline evidence.'],
];

function FudgeGrowHtmlDoc({ app, fileName }) {
  return (
    <main className="min-h-screen overflow-hidden bg-[#160b06] text-orange-50">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-[-12rem] top-[-10rem] h-[38rem] w-[38rem] rounded-full bg-orange-500/30 blur-[120px]" />
        <div className="absolute right-[-16rem] top-[20rem] h-[42rem] w-[42rem] rounded-full bg-amber-300/18 blur-[130px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.13)_1px,transparent_0)] bg-[size:30px_30px] opacity-35" />
      </div>

      <div className="relative mx-auto w-full max-w-[96rem] px-4 py-5 sm:px-6 lg:px-8">
        <header className="mb-5 flex flex-col gap-3 rounded-[2rem] border border-orange-200/10 bg-white/[0.05] p-4 shadow-[0_24px_90px_rgba(0,0,0,0.35)] backdrop-blur-2xl md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <a
              href="/applications/crm"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-black/25 px-4 py-2.5 text-xs font-black uppercase tracking-[0.16em] text-orange-100/75 transition hover:bg-white/10 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Overview
            </a>
            <span className="rounded-2xl bg-orange-400 px-4 py-2.5 font-mono text-xs font-black uppercase tracking-[0.18em] text-[#160b06]">
              /{fileName}
            </span>
          </div>
          <nav className="flex flex-wrap gap-2 text-xs font-black uppercase tracking-[0.16em] text-orange-100/58">
            {[
              ['Brief', '#brief'],
              ['Pipeline', '#pipeline'],
              ['Command', '#command'],
              ['Data', '#data'],
              ['Launch', '#launch'],
            ].map(([label, href]) => (
              <a key={href} href={href} className="rounded-2xl px-3 py-2 transition hover:bg-white/10 hover:text-white">
                {label}
              </a>
            ))}
          </nav>
        </header>

        <section id="brief" className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_26rem]">
          <div className="relative overflow-hidden rounded-[3rem] border border-orange-200/10 bg-[#241008]/82 p-7 shadow-[0_30px_120px_rgba(0,0,0,0.42)] backdrop-blur-2xl md:p-10 xl:p-12">
            <div className="absolute right-[-8rem] top-[-8rem] h-80 w-80 rounded-full bg-orange-400/20 blur-3xl" />
            <div className="relative">
              <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-orange-200/15 bg-orange-300/10 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-orange-200">
                <Sparkles className="h-4 w-4" />
                Fudge Grow standalone revenue brief
              </div>
              <h1 className="max-w-5xl text-6xl font-black tracking-[-0.085em] text-white md:text-8xl xl:text-9xl">
                Turn sales chaos into a closed-loop revenue machine.
              </h1>
              <p className="mt-6 max-w-3xl text-lg leading-8 text-orange-100/66 md:text-xl">
                {app.description} This standalone file is designed like a CRM operating brief: pipeline-first,
                manager-readable, and focused on how leads become revenue.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a
                  href="#pipeline"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-400 px-6 py-3.5 text-sm font-black text-[#160b06] shadow-[0_18px_50px_rgba(251,146,60,0.35)] transition hover:-translate-y-0.5"
                >
                  Walk the pipeline
                  <ArrowRight className="h-4 w-4" />
                </a>
                <a
                  href="#command"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-orange-200/15 bg-white/[0.06] px-6 py-3.5 text-sm font-black text-orange-50 transition hover:-translate-y-0.5 hover:bg-white/10"
                >
                  Open command center
                  <PanelTop className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>

          <aside className="rounded-[3rem] border border-orange-200/10 bg-orange-50 p-5 text-[#251006] shadow-[0_30px_120px_rgba(0,0,0,0.25)]">
            <div className="rounded-[2.2rem] bg-[#251006] p-5 text-orange-50">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-200/50">Today&apos;s cockpit</p>
              <div className="mt-6 space-y-3">
                {[
                  ['Pipeline value', '$1.8M', 'weighted forecast'],
                  ['Response SLA', '4h', 'first touch'],
                  ['Stuck deals', '12', 'need manager review'],
                ].map(([label, value, note]) => (
                  <div key={label} className="rounded-3xl border border-white/10 bg-white/[0.07] p-4">
                    <p className="text-4xl font-black">{value}</p>
                    <p className="mt-1 text-[11px] font-black uppercase tracking-[0.18em] text-orange-100/42">{label}</p>
                    <p className="mt-2 text-sm text-orange-100/58">{note}</p>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </section>

        <section id="pipeline" className="mt-5 rounded-[3rem] border border-orange-200/10 bg-white/[0.06] p-5 shadow-[0_24px_90px_rgba(0,0,0,0.28)] backdrop-blur-2xl md:p-7">
          <div className="mb-7 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-300">Pipeline operating model</p>
              <h2 className="mt-2 text-4xl font-black tracking-[-0.06em] text-white md:text-6xl">From signal to signed deal.</h2>
            </div>
            <Workflow className="h-9 w-9 text-orange-200/35" />
          </div>
          <div className="grid gap-3 lg:grid-cols-5">
            {growStages.map((stage, index) => (
              <article key={stage.label} className="relative overflow-hidden rounded-[2rem] border border-orange-200/10 bg-[#2a1309] p-5">
                {index < growStages.length - 1 ? (
                  <div className="absolute -right-3 top-10 hidden h-1 w-6 rounded-full bg-orange-300 lg:block" />
                ) : null}
                <p className="font-mono text-xs text-orange-100/35">0{index + 1}</p>
                <div className="my-5 h-2 rounded-full bg-gradient-to-r from-orange-500 to-amber-300" />
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-orange-300">{stage.label}</p>
                <h3 className="mt-2 text-xl font-black text-white">{stage.title}</h3>
                <p className="mt-3 text-sm leading-6 text-orange-100/58">{stage.body}</p>
                <p className="mt-6 text-3xl font-black text-orange-200">{stage.metric}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="command" className="mt-5 grid gap-5 xl:grid-cols-[0.72fr_1fr]">
          <div className="rounded-[3rem] border border-orange-200/10 bg-orange-400 p-7 text-[#1a0c06] shadow-[0_24px_90px_rgba(251,146,60,0.22)]">
            <Target className="mb-8 h-9 w-9" />
            <p className="text-xs font-black uppercase tracking-[0.22em] opacity-60">CRM command center</p>
            <h2 className="mt-3 text-5xl font-black tracking-[-0.075em]">Designed around sales motion, not documentation chrome.</h2>
            <p className="mt-5 text-base leading-7 opacity-75">
              Fudge Grow documentation should feel like a revenue room: pipeline cards, customer context,
              response targets, and manager signals all visible at once.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {growCommandCards.map(([Icon, title, body]) => (
              <article key={title} className="rounded-[2rem] border border-orange-200/10 bg-white/[0.06] p-5 backdrop-blur-xl transition hover:-translate-y-1 hover:bg-white/[0.1]">
                <Icon className="mb-5 h-6 w-6 text-orange-300" />
                <h3 className="text-lg font-black text-white">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-orange-100/58">{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="data" className="mt-5 grid gap-5 xl:grid-cols-[1fr_0.8fr]">
          <div className="rounded-[3rem] border border-orange-200/10 bg-[#251006] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.25)] md:p-8">
            <div className="mb-6 flex items-center gap-3">
              <Database className="h-6 w-6 text-orange-300" />
              <h2 className="text-4xl font-black tracking-[-0.05em] text-white">CRM data map</h2>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {[
                ['Lead', 'New demand with source, score, owner, urgency, and next action.'],
                ['Contact', 'The person connected to company, deal, activity, and proposal records.'],
                ['Company', 'The account profile that stores relationship and commercial context.'],
                ['Deal', 'A revenue opportunity with stage, value, probability, close date, and risk.'],
                ['Activity', 'Calls, notes, emails, meetings, reminders, and proposal events.'],
                ['Proposal', 'A commercial document linked to opportunity state and customer decisions.'],
              ].map(([name, body]) => (
                <div key={name} className="rounded-3xl border border-orange-200/10 bg-white/[0.06] p-4">
                  <h3 className="font-black text-orange-200">{name}</h3>
                  <p className="mt-2 text-sm leading-6 text-orange-100/58">{body}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[3rem] border border-orange-200/10 bg-slate-950 p-5 text-white shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-300">API snapshot</p>
                <h3 className="mt-1 text-2xl font-black">Create lead</h3>
              </div>
              <Code2 className="h-6 w-6 text-orange-200/45" />
            </div>
            <pre className="overflow-x-auto rounded-3xl bg-white/[0.06] p-5 text-sm leading-7 text-orange-100">
              <code>{`const lead = await fudgeGrow.leads.create({
  source: 'website-demo',
  owner: 'sales@webfudge.com',
  company: 'Acme Manufacturing',
  contact: 'Priya Shah',
  score: 82,
  nextAction: 'Schedule discovery call'
});`}</code>
            </pre>
          </div>
        </section>

        <section id="launch" className="mb-6 mt-5 rounded-[3rem] border border-orange-200/10 bg-orange-50 p-7 text-[#251006] shadow-[0_24px_90px_rgba(0,0,0,0.2)] md:p-9">
          <div className="grid gap-8 xl:grid-cols-[0.55fr_1fr]">
            <div>
              <CheckCircle2 className="mb-7 h-9 w-9 text-orange-600" />
              <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-700/65">Launch checklist</p>
              <h2 className="mt-3 text-5xl font-black tracking-[-0.07em]">Prepare the revenue room before reps arrive.</h2>
            </div>
            <div className="space-y-3">
              {[
                'Define pipeline stages, owner rules, lead sources, and qualification fields.',
                'Import contacts, companies, and leads with clean relationship links.',
                'Configure reminders, proposal states, reporting views, and manager review queues.',
                'Review role permissions, customer visibility, and activity audit expectations.',
              ].map((item, index) => (
                <div key={item} className="flex gap-3 rounded-3xl border border-orange-950/10 bg-white p-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-orange-500 text-xs font-black text-white">
                    {index + 1}
                  </span>
                  <p className="text-sm leading-6 text-orange-950/72">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function StandaloneHtmlDocFrame({ app, slug, fileName }) {
  if (slug === 'crm') {
    return <FudgeGrowHtmlDoc app={app} fileName={fileName} />;
  }

  const doc = DOCS[slug] || DOCS.accounts;

  return (
    <main className="dark min-h-screen bg-[#f4efe5] text-slate-950 dark:bg-[#07090f] dark:text-white">
      <div className="relative isolate">
        <div className={`fixed left-1/2 top-[-18rem] -z-10 h-[40rem] w-[60rem] -translate-x-1/2 rounded-full blur-[120px] ${doc.glow}`} />
        <div className="fixed inset-0 -z-10 bg-[linear-gradient(rgba(15,23,42,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.07)_1px,transparent_1px)] bg-[size:44px_44px] opacity-40 dark:bg-[linear-gradient(rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.045)_1px,transparent_1px)]" />

        <div className="mx-auto grid w-full max-w-[100rem] gap-6 px-4 py-4 lg:grid-cols-[18rem_minmax(0,1fr)] lg:px-6">
          <aside className="lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)]">
            <div className="flex h-full flex-col rounded-[2rem] border border-slate-950/10 bg-white/78 p-4 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.055] dark:shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
              <a
                href={`/applications/${slug}`}
                className="mb-5 inline-flex items-center gap-2 rounded-2xl border border-slate-950/10 bg-slate-950 px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-white transition hover:-translate-y-0.5 dark:border-white/10 dark:bg-white/[0.08]"
              >
                <ArrowLeft className="h-4 w-4" />
                Overview
              </a>

              <div className={`rounded-[1.7rem] bg-gradient-to-br ${doc.gradient} p-4 text-white shadow-2xl`}>
                <FileCode2 className="mb-8 h-8 w-8" />
                <p className="font-mono text-xs font-bold opacity-80">/{fileName}</p>
                <h2 className="mt-2 text-3xl font-black tracking-[-0.06em]">{app.name}</h2>
                <p className="mt-2 text-xs font-black uppercase tracking-[0.2em] opacity-75">{doc.label}</p>
              </div>

              <nav className="mt-5 grid gap-2">
                {nav.map(([href, label], index) => (
                  <a
                    key={href}
                    href={`#${href}`}
                    className="group flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-950 hover:text-white dark:text-white/62 dark:hover:bg-white/[0.08] dark:hover:text-white"
                  >
                    <span>{label}</span>
                    <span className="font-mono text-[11px] text-slate-400 group-hover:text-white/55">
                      0{index + 1}
                    </span>
                  </a>
                ))}
              </nav>

              <div className="mt-auto hidden rounded-2xl border border-slate-950/10 bg-slate-950/[0.04] p-4 dark:border-white/10 dark:bg-black/20 lg:block">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Standalone file</p>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-white/58">
                  This route is intentionally separate from the main documentation shell.
                </p>
              </div>
            </div>
          </aside>

          <article className="overflow-hidden rounded-[2.4rem] border border-slate-950/10 bg-[#fffaf0]/88 shadow-[0_30px_110px_rgba(15,23,42,0.16)] backdrop-blur-2xl dark:border-white/10 dark:bg-[#0b0f19]/88 dark:shadow-[0_30px_110px_rgba(0,0,0,0.55)]">
            <section id="overview" className="relative overflow-hidden p-6 scroll-mt-6 sm:p-8 xl:p-12">
              <div className={`absolute right-[-8rem] top-[-10rem] h-[28rem] w-[28rem] rounded-full bg-gradient-to-br ${doc.gradient} opacity-20 blur-3xl`} />
              <div className="relative grid gap-8 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-end">
                <div>
                  <div className={`mb-6 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.2em] shadow-sm ring-1 ${doc.ring} ${doc.text} dark:bg-white/[0.08] ${doc.darkText}`}>
                    <Sparkles className="h-4 w-4" />
                    Rebuilt from scratch
                  </div>
                  <h1 className="max-w-5xl text-5xl font-black tracking-[-0.075em] text-slate-950 dark:text-white md:text-7xl xl:text-8xl">
                    {doc.title}
                  </h1>
                  <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600 dark:text-white/64 md:text-xl">
                    {doc.subtitle}
                  </p>
                  <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                    <a
                      href="#workflow"
                      className={`inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r ${doc.gradient} px-6 py-3.5 text-sm font-black text-white shadow-xl transition hover:-translate-y-0.5`}
                    >
                      Start reading
                      <ArrowRight className="h-4 w-4" />
                    </a>
                    <a
                      href="#launch"
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-950/10 bg-white px-6 py-3.5 text-sm font-black text-slate-800 transition hover:-translate-y-0.5 hover:border-slate-950/20 dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
                    >
                      Launch checklist
                      <Rocket className="h-4 w-4" />
                    </a>
                  </div>
                </div>

                <div className="rounded-[2rem] border border-slate-950/10 bg-slate-950 p-5 text-white shadow-2xl dark:border-white/10">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-white/38">Operating promise</p>
                  <p className="mt-4 text-2xl font-black leading-tight tracking-[-0.035em]">{doc.promise}</p>
                  <div className="mt-6 grid grid-cols-3 gap-2">
                    {doc.stats.map(([value, label]) => (
                      <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">
                        <p className={`text-2xl font-black ${doc.darkText}`}>{value}</p>
                        <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/42">{label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <Section id="workflow" icon={Workflow} kicker="Workflow" title="The document follows the real operating path.">
              <div className="grid gap-3 md:grid-cols-5">
                {doc.workflow.map((stage, index) => (
                  <div key={stage} className={`relative rounded-[1.7rem] border ${doc.border} bg-white/70 p-5 dark:bg-white/[0.045]`}>
                    <span className={`mb-10 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${doc.gradient} text-sm font-black text-white`}>
                      {index + 1}
                    </span>
                    <h3 className="text-xl font-black text-slate-950 dark:text-white">{stage}</h3>
                    <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-white/58">
                      Read this phase before teams move to the next operational state.
                    </p>
                  </div>
                ))}
              </div>
            </Section>

            <Section id="modules" icon={Boxes} kicker="Modules" title="Core surfaces and responsibilities.">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {doc.modules.map(([title, body]) => (
                  <div key={title} className="group rounded-[1.7rem] border border-slate-950/10 bg-white/70 p-6 transition hover:-translate-y-1 hover:shadow-xl dark:border-white/10 dark:bg-white/[0.045]">
                    <PanelTop className={`mb-5 h-6 w-6 ${doc.text} ${doc.darkText}`} />
                    <h3 className="text-xl font-black text-slate-950 dark:text-white">{title}</h3>
                    <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-white/58">{body}</p>
                  </div>
                ))}
              </div>
            </Section>

            <Section id="data" icon={Database} kicker="Data model" title="Primary records, API shape, and traceability.">
              <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_28rem]">
                <div className="rounded-[1.8rem] border border-slate-950/10 bg-white/70 dark:border-white/10 dark:bg-white/[0.045]">
                  {doc.objects.map(([name, body], index) => (
                    <div key={name} className="grid gap-2 border-b border-slate-950/10 p-5 last:border-b-0 dark:border-white/10 sm:grid-cols-[9rem_1fr]">
                      <div className="flex items-center gap-3">
                        <span className={`flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br ${doc.gradient} text-xs font-black text-white`}>
                          {index + 1}
                        </span>
                        <p className="font-black text-slate-950 dark:text-white">{name}</p>
                      </div>
                      <p className="text-sm leading-6 text-slate-600 dark:text-white/58">{body}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-[1.8rem] border border-slate-950/10 bg-slate-950 p-5 text-white shadow-2xl dark:border-white/10">
                  <div className="mb-5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Code2 className={`h-5 w-5 ${doc.darkText}`} />
                      <p className="text-sm font-black">API sample</p>
                    </div>
                    <span className="rounded-full bg-white/10 px-3 py-1 font-mono text-[11px] text-white/50">sdk.js</span>
                  </div>
                  <pre className="overflow-x-auto rounded-2xl border border-white/10 bg-black/35 p-5 text-sm leading-7 text-white/72">
                    <code>{doc.api}</code>
                  </pre>
                </div>
              </div>
            </Section>

            <Section id="launch" icon={ClipboardList} kicker="Launch" title="Production readiness checklist.">
              <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
                <div className="grid gap-3">
                  {doc.launch.map((item) => (
                    <div key={item} className="flex gap-4 rounded-[1.5rem] border border-slate-950/10 bg-white/70 p-5 dark:border-white/10 dark:bg-white/[0.045]">
                      <CheckCircle2 className={`mt-0.5 h-5 w-5 shrink-0 ${doc.text} ${doc.darkText}`} />
                      <p className="text-sm font-semibold leading-6 text-slate-700 dark:text-white/68">{item}</p>
                    </div>
                  ))}
                </div>
                <div className={`rounded-[2rem] bg-gradient-to-br ${doc.gradient} p-7 text-white shadow-2xl`}>
                  <BadgeCheck className="mb-10 h-9 w-9" />
                  <h3 className="text-3xl font-black tracking-[-0.05em]">Ready to hand off.</h3>
                  <p className="mt-4 text-sm leading-7 text-white/76">
                    Use this standalone HTML document as the operational source for admins, managers, and implementation teams.
                  </p>
                </div>
              </div>
            </Section>
          </article>
        </div>
      </div>
    </main>
  );
}

function Section({ id, icon: Icon, kicker, title, children }) {
  return (
    <section id={id} className="border-t border-slate-950/10 p-6 scroll-mt-6 dark:border-white/10 sm:p-8 xl:p-12">
      <div className="mb-7 flex max-w-4xl flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-slate-400">
            <Icon className="h-4 w-4" />
            {kicker}
          </div>
          <h2 className="text-3xl font-black tracking-[-0.055em] text-slate-950 dark:text-white md:text-5xl">
            {title}
          </h2>
        </div>
      </div>
      {children}
    </section>
  );
}
