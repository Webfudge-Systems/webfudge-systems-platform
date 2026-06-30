'use client';

import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  Activity,
  ArrowRight,
  Blocks,
  CalendarDays,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Code2,
  Copy,
  GitBranch,
  KanbanSquare,
  Layers3,
  MessageSquareText,
  Milestone,
  PanelTop,
  Radar,
  Route,
  Sparkles,
  Target,
  UsersRound,
  Workflow,
  Zap,
} from 'lucide-react';

const navItems = [
  { label: 'Overview', href: '#overview' },
  { label: 'Delivery Map', href: '#delivery-map' },
  { label: 'Workspace', href: '#workspace' },
  { label: 'Data Model', href: '#data-model' },
  { label: 'Launch', href: '#launch' },
];

const deliveryStages = [
  {
    label: 'Scope',
    title: 'Shape the work',
    detail: 'Capture goals, constraints, owners, acceptance criteria, and expected delivery windows before a sprint begins.',
    icon: Target,
    pct: 96,
  },
  {
    label: 'Sequence',
    title: 'Plan dependencies',
    detail: 'Connect tasks, milestones, blockers, and handoffs so teams can see what must move first.',
    icon: GitBranch,
    pct: 82,
  },
  {
    label: 'Execute',
    title: 'Run the sprint',
    detail: 'Track assignments, priority, progress, comments, files, and time logs from one delivery surface.',
    icon: KanbanSquare,
    pct: 64,
  },
  {
    label: 'Release',
    title: 'Close the loop',
    detail: 'Review QA status, delivery notes, client feedback, overdue work, and launch readiness before handoff.',
    icon: ClipboardCheck,
    pct: 38,
  },
];

const sprintLanes = [
  {
    label: 'Ready',
    color: 'from-slate-400 to-slate-500',
    cards: [
      ['Client reporting filters', 'Owner: Maya', 'medium'],
      ['QA checklist template', 'Owner: Arjun', 'low'],
    ],
  },
  {
    label: 'In progress',
    color: 'from-indigo-500 to-violet-500',
    cards: [
      ['Calendar sync timeline', 'Owner: Priya', 'high'],
      ['Milestone risk scoring', 'Owner: Kabir', 'high'],
    ],
  },
  {
    label: 'Review',
    color: 'from-amber-400 to-orange-500',
    cards: [
      ['Project health summary', 'Owner: Nia', 'medium'],
    ],
  },
  {
    label: 'Shipped',
    color: 'from-emerald-400 to-teal-500',
    cards: [
      ['Team inbox mentions', 'Owner: Dev', 'done'],
      ['Task dependency graph', 'Owner: Isha', 'done'],
    ],
  },
];

const modules = [
  {
    icon: PanelTop,
    title: 'Delivery dashboard',
    body: 'A high-level view of project health, velocity, overdue work, blocked tasks, milestone drift, and upcoming commitments.',
  },
  {
    icon: KanbanSquare,
    title: 'Task board',
    body: 'Kanban-style task execution with priority, owners, progress, due dates, checklists, comments, and status transitions.',
  },
  {
    icon: CalendarDays,
    title: 'Calendar and timeline',
    body: 'Project calendars, milestone windows, meeting context, release dates, and sprint commitments in a single schedule.',
  },
  {
    icon: MessageSquareText,
    title: 'Team inbox',
    body: 'Centralize mentions, task updates, client context, internal notes, and delivery conversations around the work itself.',
  },
  {
    icon: Radar,
    title: 'Risk radar',
    body: 'Surface delivery risk from overdue dependencies, capacity pressure, stale tasks, and blocked milestone progress.',
  },
  {
    icon: UsersRound,
    title: 'Resource planning',
    body: 'Understand team allocation, ownership gaps, workload pressure, and who is carrying the most active delivery load.',
  },
];

const dataObjects = [
  ['Project', 'The delivery container for scope, owners, timeline, client context, status, budget, and milestones.'],
  ['Task', 'A trackable unit of work with assignee, priority, progress, status, due date, comments, and attachments.'],
  ['Milestone', 'A delivery checkpoint that groups tasks and signals whether a project is on pace or drifting.'],
  ['Activity', 'A note, comment, file, status change, mention, time log, or project event recorded in the timeline.'],
  ['Meeting', 'A scheduled sync tied to projects, tasks, participants, outcomes, and follow-up commitments.'],
  ['Risk', 'A computed or manually flagged blocker that helps managers prioritize intervention before deadlines slip.'],
];

const launchChecklist = [
  'Create project roles for admins, managers, delivery owners, and contributors.',
  'Define standard project statuses, task stages, priority rules, and milestone naming conventions.',
  'Prepare workspace templates for discovery, implementation, QA, launch, and support projects.',
  'Connect meeting, calendar, inbox, and task notification flows before inviting live users.',
  'Review project visibility, client access boundaries, file handling, and audit requirements.',
];

const apiSamples = {
  task: {
    label: 'Create task',
    method: 'POST',
    code: `const task = await pm.tasks.create({
  projectId: 'proj_fudgeflow_42',
  title: 'Build milestone health widget',
  assignee: 'delivery@webfudge.com',
  priority: 'high',
  dueDate: '2026-07-18',
  checklist: ['Design states', 'Connect API', 'QA edge cases']
});`,
  },
  project: {
    label: 'Fetch project health',
    method: 'GET',
    code: `const health = await pm.projects.health('proj_fudgeflow_42');

console.log({
  status: health.status,
  velocity: health.velocity,
  blockedTasks: health.blockers.length,
  nextMilestone: health.timeline.next
});`,
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  },
};

const staggerContainer = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 18, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  },
};

function MotionSection({ children, className = '', id }) {
  return (
    <motion.section
      id={id}
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      className={className}
    >
      {children}
    </motion.section>
  );
}

function SectionHeading({ kicker, title, description }) {
  return (
    <div className="mb-6 max-w-3xl">
      <p className="mb-2 text-xs font-black uppercase tracking-[0.24em] text-indigo-600 dark:text-indigo-300">
        {kicker}
      </p>
      <h2 className="text-3xl font-black tracking-tight text-gray-950 dark:text-white md:text-4xl xl:text-5xl">
        {title}
      </h2>
      {description ? (
        <p className="mt-3 text-base leading-7 text-gray-600 dark:text-gray-300 md:text-lg">
          {description}
        </p>
      ) : null}
    </div>
  );
}

function GlassPanel({ children, className = '', hover = true }) {
  return (
    <motion.div
      whileHover={hover ? { y: -4, scale: 1.01 } : undefined}
      transition={{ type: 'spring', stiffness: 260, damping: 24 }}
      className={`glass-panel relative overflow-hidden rounded-[2rem] ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/25 via-white/[0.07] to-transparent dark:from-white/[0.06] dark:via-transparent" />
      <div className="relative">{children}</div>
    </motion.div>
  );
}

function DeliveryConstellation() {
  return (
    <div className="relative min-h-[25rem] overflow-hidden rounded-[2rem] border border-white/40 bg-slate-950 p-5 text-white shadow-2xl dark:border-white/10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_28%_22%,rgba(129,140,248,0.35),transparent_30%),radial-gradient(circle_at_80%_70%,rgba(168,85,247,0.24),transparent_34%)]" />
      <div className="relative mb-5 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-indigo-200/70">Delivery cockpit</p>
          <h3 className="mt-1 text-xl font-black">Q3 platform rollout</h3>
        </div>
        <span className="rounded-full border border-emerald-300/25 bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-200">
          On track
        </span>
      </div>

      <div className="relative grid gap-3 sm:grid-cols-2">
        {[
          ['Velocity', '142 pts', '+12%', Activity],
          ['Blocked work', '3', 'needs triage', Zap],
          ['Capacity', '78%', 'healthy load', UsersRound],
          ['Next launch', 'Jul 18', 'QA freeze', CalendarDays],
        ].map(([label, value, note, Icon], index) => (
          <motion.div
            key={label}
            variants={cardVariants}
            className="rounded-3xl border border-white/10 bg-white/[0.07] p-4 backdrop-blur-xl"
          >
            <Icon className="mb-5 h-5 w-5 text-indigo-200" />
            <p className="text-2xl font-black">{value}</p>
            <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.16em] text-white/45">{label}</p>
            <p className="mt-2 text-xs text-white/60">{note}</p>
            <span className="mt-4 block h-1.5 overflow-hidden rounded-full bg-white/10">
              <motion.span
                className="block h-full rounded-full bg-gradient-to-r from-indigo-300 to-violet-300"
                initial={{ width: 0 }}
                whileInView={{ width: `${88 - index * 12}%` }}
                viewport={{ once: true, amount: 0.8 }}
                transition={{ delay: 0.2 + index * 0.08, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              />
            </span>
          </motion.div>
        ))}
      </div>

      <div className="relative mt-4 rounded-3xl border border-white/10 bg-black/20 p-4">
        <div className="mb-4 flex items-center justify-between text-xs font-bold uppercase tracking-[0.16em] text-white/45">
          <span>Milestone path</span>
          <span>Live sample</span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {['Scope', 'Build', 'QA', 'Launch'].map((step, index) => (
            <div key={step} className="relative">
              <div className="mb-2 h-2 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className="h-full rounded-full bg-indigo-300"
                  initial={{ width: 0 }}
                  whileInView={{ width: index < 2 ? '100%' : index === 2 ? '64%' : '20%' }}
                  viewport={{ once: true, amount: 0.9 }}
                  transition={{ delay: 0.45 + index * 0.12, duration: 0.7 }}
                />
              </div>
              <p className="text-[10px] font-bold text-white/65">{step}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DeliveryMap() {
  return (
    <div className="grid gap-4 lg:grid-cols-4">
      {deliveryStages.map((stage, index) => (
        <motion.div key={stage.label} variants={cardVariants} className="relative">
          {index < deliveryStages.length - 1 ? (
            <div className="pointer-events-none absolute left-[calc(100%-0.5rem)] top-12 z-0 hidden h-px w-6 bg-gradient-to-r from-indigo-300/80 to-transparent lg:block" />
          ) : null}
          <GlassPanel className="h-full p-5">
            <div className="mb-5 flex items-start justify-between gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500 text-white shadow-[0_16px_40px_rgba(99,102,241,0.32)]">
                <stage.icon className="h-5 w-5" />
              </span>
              <span className="rounded-full bg-indigo-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-300">
                {stage.label}
              </span>
            </div>
            <h3 className="text-lg font-black text-gray-950 dark:text-white">{stage.title}</h3>
            <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300">{stage.detail}</p>
            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between text-[11px] font-bold text-gray-500 dark:text-gray-400">
                <span>Sample maturity</span>
                <span>{stage.pct}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-indigo-950/10 dark:bg-white/10">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
                  initial={{ width: 0 }}
                  whileInView={{ width: `${stage.pct}%` }}
                  viewport={{ once: true, amount: 0.8 }}
                  transition={{ delay: 0.25 + index * 0.08, duration: 0.8 }}
                />
              </div>
            </div>
          </GlassPanel>
        </motion.div>
      ))}
    </div>
  );
}

function DependencyFlowGraph() {
  const nodes = [
    { id: 'scope', label: 'Scope', sub: 'goals + constraints', icon: Target, className: 'left-[4%] top-[10%]' },
    { id: 'milestone', label: 'Milestone', sub: 'delivery checkpoints', icon: Milestone, className: 'left-[37%] top-[8%]' },
    { id: 'tasks', label: 'Tasks', sub: 'owners + priority', icon: KanbanSquare, className: 'right-[4%] top-[20%]' },
    { id: 'blockers', label: 'Blockers', sub: 'risk signals', icon: Radar, className: 'left-[16%] bottom-[12%]' },
    { id: 'qa', label: 'QA Review', sub: 'acceptance gates', icon: CheckCircle2, className: 'left-[48%] bottom-[8%]' },
    { id: 'release', label: 'Release', sub: 'handoff ready', icon: RocketIcon, className: 'right-[8%] bottom-[18%]' },
  ];

  const paths = [
    'M130 92 C230 34 302 40 382 92',
    'M450 104 C540 94 615 116 704 174',
    'M704 226 C650 304 582 340 498 356',
    'M430 358 C342 356 278 330 204 300',
    'M178 258 C158 202 132 160 130 92',
    'M236 286 C360 228 512 214 676 218',
  ];

  return (
    <GlassPanel className="mt-5 p-5 md:p-6" hover={false}>
      <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-300">
            Dependency graph
          </p>
          <h3 className="mt-1 text-2xl font-black text-gray-950 dark:text-white">
            See how delivery risk travels through the work.
          </h3>
        </div>
        <p className="max-w-md text-sm leading-6 text-gray-600 dark:text-gray-300">
          This visual mirrors how Fudge Flow links scope, milestones, task ownership, blockers, QA gates, and release readiness.
        </p>
      </div>

      <div className="relative min-h-[27rem] overflow-hidden rounded-[1.75rem] border border-white/50 bg-white/25 p-4 backdrop-blur-2xl dark:border-white/10 dark:bg-black/20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_35%_25%,rgba(99,102,241,0.18),transparent_35%),radial-gradient(circle_at_72%_70%,rgba(168,85,247,0.16),transparent_34%)]" />
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox="0 0 820 420"
          fill="none"
          preserveAspectRatio="none"
          aria-hidden
        >
          {paths.map((path, index) => (
            <motion.path
              key={path}
              d={path}
              stroke="url(#flowGradient)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray="8 10"
              initial={{ pathLength: 0, opacity: 0 }}
              whileInView={{ pathLength: 1, opacity: 1 }}
              viewport={{ once: true, amount: 0.45 }}
              transition={{ delay: 0.18 + index * 0.08, duration: 1.1, ease: 'easeInOut' }}
            />
          ))}
          <defs>
            <linearGradient id="flowGradient" x1="0" y1="0" x2="820" y2="420" gradientUnits="userSpaceOnUse">
              <stop stopColor="#6366f1" stopOpacity="0.85" />
              <stop offset="0.55" stopColor="#a855f7" stopOpacity="0.75" />
              <stop offset="1" stopColor="#22c55e" stopOpacity="0.7" />
            </linearGradient>
          </defs>
        </svg>

        {nodes.map((node, index) => (
          <motion.div
            key={node.id}
            initial={{ opacity: 0, scale: 0.88, y: 12 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true, amount: 0.45 }}
            transition={{ delay: 0.25 + index * 0.08, duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
            className={`absolute z-10 w-[11rem] rounded-3xl border border-white/60 bg-white/55 p-4 shadow-[0_18px_48px_rgba(79,70,229,0.12)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/55 ${node.className}`}
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-500 text-white shadow-[0_12px_32px_rgba(99,102,241,0.35)]">
                <node.icon className="h-5 w-5" />
              </span>
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.85)]" />
            </div>
            <p className="font-black text-gray-950 dark:text-white">{node.label}</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">
              {node.sub}
            </p>
          </motion.div>
        ))}
      </div>
    </GlassPanel>
  );
}

function RocketIcon(props) {
  return <Zap {...props} />;
}

function SprintBoard() {
  return (
    <div className="grid gap-3 lg:grid-cols-4">
      {sprintLanes.map((lane, laneIndex) => (
        <motion.div key={lane.label} variants={cardVariants} className="rounded-3xl border border-white/40 bg-white/25 p-3 backdrop-blur-2xl dark:border-white/10 dark:bg-black/20">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-gray-600 dark:text-gray-300">{lane.label}</p>
            <span className={`h-2.5 w-2.5 rounded-full bg-gradient-to-br ${lane.color}`} />
          </div>
          <div className="space-y-2">
            {lane.cards.map(([title, owner, priority], cardIndex) => (
              <motion.div
                key={title}
                className="rounded-2xl border border-white/50 bg-white/45 p-3 shadow-[0_8px_24px_rgba(0,0,0,0.05)] dark:border-white/10 dark:bg-white/[0.05]"
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.6 }}
                transition={{ delay: 0.15 + laneIndex * 0.08 + cardIndex * 0.05, duration: 0.35 }}
              >
                <p className="text-sm font-bold text-gray-950 dark:text-white">{title}</p>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">{owner}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${
                    priority === 'high'
                      ? 'bg-red-500/10 text-red-600 dark:text-red-300'
                      : priority === 'done'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300'
                        : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-300'
                  }`}>
                    {priority}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function DataModelGrid() {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {dataObjects.map(([name, description], index) => (
        <motion.div
          key={name}
          variants={cardVariants}
          className="group rounded-3xl border border-white/50 bg-white/30 p-5 backdrop-blur-2xl transition hover:border-indigo-300/80 hover:bg-white/45 dark:border-white/10 dark:bg-black/20 dark:hover:border-indigo-300/40"
        >
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-indigo-500/10 text-xs font-black text-indigo-600 dark:bg-indigo-400/10 dark:text-indigo-300">
              {String(index + 1).padStart(2, '0')}
            </span>
            <h3 className="font-black text-gray-950 dark:text-white">{name}</h3>
          </div>
          <p className="text-sm leading-6 text-gray-600 dark:text-gray-300">{description}</p>
        </motion.div>
      ))}
    </div>
  );
}

export default function PmDocPage({ app }) {
  const [activeApi, setActiveApi] = useState('task');
  const [copied, setCopied] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  const handleCopy = async () => {
    await navigator.clipboard.writeText(apiSamples[activeApi].code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleDeliveryMapScroll = (event) => {
    event.preventDefault();
    document.querySelector('#delivery-map')?.scrollIntoView({
      behavior: shouldReduceMotion ? 'auto' : 'smooth',
      block: 'start',
    });
  };

  return (
    <article className="relative isolate w-full overflow-hidden py-8 sm:py-10">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <motion.div
          className="absolute left-[8%] top-10 h-[520px] w-[520px] rounded-full bg-indigo-300/35 blur-[120px] dark:bg-indigo-500/15"
          animate={shouldReduceMotion ? undefined : { scale: [1, 1.13, 1], opacity: [0.45, 0.75, 0.45] }}
          transition={shouldReduceMotion ? undefined : { duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute right-[4%] top-[32rem] h-[440px] w-[440px] rounded-full bg-violet-200/55 blur-[120px] dark:bg-violet-500/15"
          animate={shouldReduceMotion ? undefined : { x: [0, -34, 0], y: [0, 18, 0] }}
          transition={shouldReduceMotion ? undefined : { duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <div className="mx-auto flex w-full max-w-[88rem] flex-col gap-10 px-4 sm:px-6 md:gap-12 lg:px-8">
        <motion.header
          id="overview"
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="grid gap-7 lg:grid-cols-[minmax(0,0.98fr)_minmax(25rem,1.02fr)] lg:items-center"
        >
          <motion.div variants={fadeUp}>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/50 bg-white/30 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-indigo-600 shadow-[0_8px_32px_rgba(0,0,0,0.06)] backdrop-blur-2xl dark:border-white/10 dark:bg-black/20 dark:text-indigo-300">
              <Sparkles className="h-4 w-4" />
              PM Fudge Flow · Delivery operating system
            </div>
            <h1 className="max-w-5xl text-5xl font-black tracking-[-0.06em] text-gray-950 dark:text-white md:text-7xl">
              Project documentation that moves like a release plan.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-gray-600 dark:text-gray-300 md:text-xl">
              {app?.description ||
                'Fudge Flow is the project delivery workspace for planning timelines, assigning tasks, tracking progress, managing blockers, and keeping every handoff visible until launch.'}
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <a
                href="#delivery-map"
                onClick={handleDeliveryMapScroll}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-500 px-6 py-3 text-sm font-black text-white shadow-[0_18px_50px_rgba(99,102,241,0.34)] transition hover:-translate-y-0.5"
              >
                Explore delivery map
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </motion.div>

          <motion.div variants={fadeUp}>
            <DeliveryConstellation />
          </motion.div>
        </motion.header>

        <motion.nav
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.35, ease: 'easeOut' }}
          className="sticky top-4 z-20 -mt-3 hidden max-w-full self-start overflow-x-auto rounded-2xl border border-white/50 bg-white/30 p-2 shadow-[0_8px_32px_rgba(0,0,0,0.06)] backdrop-blur-2xl md:flex md:w-auto md:items-center md:gap-1 dark:border-white/10 dark:bg-black/20"
        >
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-xl px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-gray-500 transition hover:bg-indigo-500 hover:text-white dark:text-gray-400"
            >
              {item.label}
            </a>
          ))}
        </motion.nav>

        <MotionSection id="delivery-map" className="-mt-4 scroll-mt-24 md:-mt-6">
          <SectionHeading
            kicker="Delivery map"
            title="From scoped idea to shipped outcome."
            description="Fudge Flow documentation follows the way delivery teams actually work: define scope, sequence dependencies, execute in visible lanes, and close the loop with launch readiness."
          />
          <DeliveryMap />
          <DependencyFlowGraph />
        </MotionSection>

        <MotionSection id="workspace" className="scroll-mt-24">
          <SectionHeading
            kicker="Workspace anatomy"
            title="A PM cockpit instead of a static manual."
            description="The core surfaces below are designed for project managers, delivery owners, and contributors who need visibility without losing task-level detail."
          />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {modules.map((module) => (
              <motion.div key={module.title} variants={cardVariants}>
                <GlassPanel className="h-full p-5">
                  <module.icon className="mb-5 h-6 w-6 text-indigo-600 dark:text-indigo-300" />
                  <h3 className="text-lg font-black text-gray-950 dark:text-white">{module.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300">{module.body}</p>
                </GlassPanel>
              </motion.div>
            ))}
          </div>
          <GlassPanel className="mt-5 p-4 md:p-5" hover={false}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 px-1">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-300">Sprint board sample</p>
                <h3 className="mt-1 text-2xl font-black text-gray-950 dark:text-white">Track work by lane, owner, and risk.</h3>
              </div>
              <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-600 dark:text-emerald-300">
                5/7 moving
              </span>
            </div>
            <SprintBoard />
          </GlassPanel>
        </MotionSection>

        <MotionSection id="data-model" className="scroll-mt-24">
          <SectionHeading
            kicker="Data model and API"
            title="Project context stays connected."
            description="Fudge Flow treats project delivery as a connected graph of projects, milestones, tasks, meetings, risks, and timeline activity."
          />
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(23rem,0.78fr)]">
            <DataModelGrid />
            <GlassPanel className="bg-slate-950 p-5 text-white dark:bg-slate-950" hover={false}>
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Code2 className="h-5 w-5 text-indigo-300" />
                  <h3 className="font-black">API examples</h3>
                </div>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs font-bold transition hover:bg-white/15"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <div className="mb-4 flex rounded-2xl border border-white/10 bg-white/[0.04] p-1">
                {Object.entries(apiSamples).map(([key, sample]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveApi(key)}
                    className={`flex-1 rounded-xl px-3 py-2 text-left text-xs font-black transition ${
                      activeApi === key ? 'bg-indigo-500 text-white' : 'text-white/55 hover:text-white'
                    }`}
                  >
                    <span className="mr-2 text-[10px] text-emerald-200">{sample.method}</span>
                    {sample.label}
                  </button>
                ))}
              </div>
              <AnimatePresence mode="wait">
                <motion.pre
                  key={activeApi}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18 }}
                  className="overflow-x-auto rounded-2xl border border-white/10 bg-black/35 p-4 text-sm leading-7 text-indigo-50/85"
                >
                  {apiSamples[activeApi].code}
                </motion.pre>
              </AnimatePresence>
            </GlassPanel>
          </div>
        </MotionSection>

        <MotionSection id="launch" className="scroll-mt-24">
          <GlassPanel className="p-6 md:p-8" hover={false}>
            <div className="grid gap-7 lg:grid-cols-[minmax(0,0.72fr)_minmax(20rem,0.48fr)] lg:items-start">
              <div>
                <SectionHeading
                  kicker="Launch checklist"
                  title="Prepare Fudge Flow for real delivery teams."
                  description="Use this checklist as the first admin handoff before teams move live projects, tasks, and client delivery commitments into the workspace."
                />
                <div className="space-y-3">
                  {launchChecklist.map((item, index) => (
                    <motion.div
                      key={item}
                      variants={cardVariants}
                      className="flex gap-3 rounded-3xl border border-white/50 bg-white/30 p-4 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04]"
                    >
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-2xl bg-indigo-500 text-xs font-black text-white">
                        {index + 1}
                      </span>
                      <p className="text-sm leading-6 text-gray-700 dark:text-gray-200">{item}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
              <div className="rounded-[2rem] border border-indigo-200/70 bg-indigo-950 p-5 text-white shadow-2xl dark:border-white/10">
                <Route className="mb-6 h-7 w-7 text-indigo-200" />
                <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-200/70">Admin handoff</p>
                <h3 className="mt-2 text-3xl font-black tracking-tight">Delivery-ready means fewer surprises.</h3>
                <p className="mt-4 text-sm leading-7 text-indigo-100/75">
                  Fudge Flow is strongest when roles, templates, statuses, dependencies, meetings, and notification rules are prepared before the first live project arrives.
                </p>
                <div className="mt-6 grid grid-cols-2 gap-3 text-center">
                  {[
                    ['4', 'core roles'],
                    ['6', 'workspace modules'],
                    ['24h', 'risk review SLA'],
                    ['1', 'source of truth'],
                  ].map(([value, label]) => (
                    <div key={label} className="rounded-2xl bg-white/10 p-3">
                      <p className="text-2xl font-black">{value}</p>
                      <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </GlassPanel>
        </MotionSection>
      </div>
    </article>
  );
}
