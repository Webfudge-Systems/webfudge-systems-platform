'use client';

import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Copy,
  Database,
  FileText,
  KanbanSquare,
  LayoutDashboard,
  MailCheck,
  MessageSquareText,
  PanelTop,
  ShieldCheck,
  Sparkles,
  Target,
  UserRound,
  UsersRound,
  Workflow,
  Zap,
} from 'lucide-react';

const navItems = [
  { label: 'Overview', href: '#overview' },
  { label: 'Workflow', href: '#workflow' },
  { label: 'Modules', href: '#modules' },
  { label: 'Data Model', href: '#data-model' },
  { label: 'Launch', href: '#launch' },
];

const metrics = [
  { label: 'Qualified pipeline', value: '$1.8M', note: 'weighted forecast', icon: Target },
  { label: 'Lead response SLA', value: '4h', note: 'first-touch target', icon: Zap },
  { label: 'Automation coverage', value: '68%', note: 'sample workflows', icon: Workflow },
];

const workflowStages = [
  { label: 'Capture', detail: 'Import leads from forms, referrals, campaigns, or manual entry.', pct: 100 },
  { label: 'Qualify', detail: 'Score fit, source, owner, urgency, and next best action.', pct: 78 },
  { label: 'Engage', detail: 'Run email, call, meeting, and proposal activities from one timeline.', pct: 61 },
  { label: 'Forecast', detail: 'Track weighted deal value, close date, stage confidence, and risk.', pct: 44 },
  { label: 'Win', detail: 'Convert signed deals into customer handoff records and follow-ups.', pct: 29 },
];

const modules = [
  {
    icon: LayoutDashboard,
    title: 'Executive dashboard',
    body: 'A live command center for revenue, activity, owner performance, stuck deals, and upcoming commitments.',
  },
  {
    icon: KanbanSquare,
    title: 'Pipeline board',
    body: 'A visual stage board for leads, opportunities, proposals, negotiations, and closed-won records.',
  },
  {
    icon: UserRound,
    title: 'Contact intelligence',
    body: 'Unified people and company profiles with notes, ownership, engagement history, and relationship context.',
  },
  {
    icon: CalendarClock,
    title: 'Follow-up system',
    body: 'Reminder queues, meeting prep, overdue tasks, and priority nudges for every sales owner.',
  },
  {
    icon: MailCheck,
    title: 'Outreach tracking',
    body: 'Document emails, calls, proposals, and customer responses without leaving the CRM workspace.',
  },
  {
    icon: ShieldCheck,
    title: 'Role-aware access',
    body: 'Separate owner, manager, and admin responsibilities while preserving audit-ready activity trails.',
  },
];

const dataObjects = [
  ['Lead', 'New demand captured from a campaign, form, referral, import, or manual entry.'],
  ['Contact', 'A person attached to a company, deal, activity, or customer account.'],
  ['Company', 'The organization profile that groups contacts, deals, proposals, and notes.'],
  ['Deal', 'A revenue opportunity with stage, value, probability, owner, and close date.'],
  ['Activity', 'A task, call, email, meeting, note, reminder, or logged customer touchpoint.'],
  ['Proposal', 'A commercial document linked to a deal and tracked through review, send, and sign-off.'],
];

const launchChecklist = [
  'Create sales roles for admin, manager, and member users.',
  'Define pipeline stages and stage-exit criteria before importing live data.',
  'Import companies, contacts, and leads with clean ownership fields.',
  'Configure follow-up reminders, proposal statuses, and reporting views.',
  'Review permissions, audit visibility, and customer data handling rules.',
];

const codeSample = `const lead = await crm.leads.create({
  source: 'website-demo',
  owner: 'sales@webfudge.com',
  company: 'Acme Manufacturing',
  contact: {
    name: 'Priya Shah',
    email: 'priya@acme.example'
  },
  nextAction: 'Schedule discovery call'
});`;

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
      viewport={{ once: true, amount: 0.22 }}
      className={className}
    >
      {children}
    </motion.section>
  );
}

function SectionHeading({ kicker, title, description }) {
  return (
    <div className="mb-6 max-w-3xl">
      <p className="mb-2 text-xs font-black uppercase tracking-[0.24em] text-orange-600 dark:text-orange-400">
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

function GlassCard({ children, className = '', hover = true }) {
  return (
    <motion.div
      whileHover={hover ? { y: -4, scale: 1.01 } : undefined}
      transition={{ type: 'spring', stiffness: 260, damping: 24 }}
      className={`relative overflow-hidden rounded-[2rem] border border-white/50 bg-white/30 shadow-[0_8px_32px_rgba(0,0,0,0.08)] backdrop-blur-2xl dark:border-white/10 dark:bg-black/20 dark:shadow-[0_8px_32px_rgba(0,0,0,0.42)] ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/20 via-white/[0.06] to-transparent dark:from-white/[0.06] dark:via-transparent dark:to-transparent" />
      <div className="relative">{children}</div>
    </motion.div>
  );
}

function OperatingModelStrip() {
  const items = [
    {
      label: 'Capture',
      title: 'Centralize demand',
      text: 'Collect leads from campaigns, forms, referrals, and manual entry into one owner-ready queue.',
    },
    {
      label: 'Context',
      title: 'Enrich every record',
      text: 'Connect contacts, company notes, activities, deal value, and next actions before handoff.',
    },
    {
      label: 'Close',
      title: 'Move revenue forward',
      text: 'Track stage quality, proposal status, follow-ups, and forecast confidence in the same workflow.',
    },
  ];

  return (
    <div className="mb-5 grid gap-3 lg:grid-cols-3">
      {items.map((item, index) => (
        <motion.div
          key={item.label}
          variants={cardVariants}
          className="rounded-3xl border border-white/50 bg-white/30 p-4 shadow-[0_8px_32px_rgba(0,0,0,0.05)] backdrop-blur-2xl dark:border-white/10 dark:bg-black/20"
        >
          <div className="mb-3 flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-2xl bg-orange-500 text-xs font-black text-white">
              {index + 1}
            </span>
            <span className="text-xs font-black uppercase tracking-[0.18em] text-orange-600 dark:text-orange-300">
              {item.label}
            </span>
          </div>
          <h3 className="text-base font-black text-gray-950 dark:text-white">{item.title}</h3>
          <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">{item.text}</p>
        </motion.div>
      ))}
    </div>
  );
}

export default function CrmDocPage({ app }) {
  const [copied, setCopied] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  const copyCode = async () => {
    await navigator.clipboard.writeText(codeSample);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <article className="relative isolate w-full overflow-hidden py-8 sm:py-10">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <motion.div
          className="absolute left-1/2 top-0 h-[620px] w-[920px] -translate-x-1/2 rounded-full bg-orange-300/35 blur-[120px] dark:bg-orange-500/20"
          animate={shouldReduceMotion ? undefined : { scale: [1, 1.16, 1], opacity: [0.5, 0.82, 0.5] }}
          transition={shouldReduceMotion ? undefined : { duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute right-0 top-[34rem] h-[420px] w-[420px] rounded-full bg-amber-200/45 blur-[100px] dark:bg-amber-500/20"
          animate={shouldReduceMotion ? undefined : { x: [0, -36, 0], y: [0, 22, 0], scale: [1, 1.12, 1] }}
          transition={shouldReduceMotion ? undefined : { duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-0 left-0 h-[520px] w-[520px] rounded-full bg-slate-200/60 blur-[120px] dark:bg-white/10"
          animate={shouldReduceMotion ? undefined : { x: [0, 28, 0], opacity: [0.45, 0.72, 0.45] }}
          transition={shouldReduceMotion ? undefined : { duration: 6.5, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <div className="mx-auto flex w-full max-w-[88rem] flex-col gap-10 px-4 sm:px-6 md:gap-12 lg:px-8">
        <motion.header
          id="overview"
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="relative grid overflow-hidden rounded-[3rem] border border-white/50 bg-white/30 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.10)] backdrop-blur-2xl dark:border-white/10 dark:bg-black/20 dark:shadow-[0_8px_32px_rgba(0,0,0,0.50)] md:p-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(24rem,0.95fr)] lg:items-center lg:gap-8"
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/20 via-white/[0.06] to-transparent dark:from-white/[0.06] dark:via-transparent" />
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute -right-28 -top-28 h-72 w-72 rounded-full bg-orange-300/25 blur-3xl dark:bg-orange-500/10"
            animate={shouldReduceMotion ? undefined : { scale: [1, 1.12, 1], opacity: [0.45, 0.7, 0.45] }}
            transition={shouldReduceMotion ? undefined : { duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-amber-200/25 blur-3xl dark:bg-amber-500/10"
            animate={shouldReduceMotion ? undefined : { x: [0, 18, 0], y: [0, -12, 0] }}
            transition={shouldReduceMotion ? undefined : { duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div variants={fadeUp}>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/50 bg-white/30 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-orange-600 shadow-[0_8px_32px_rgba(0,0,0,0.06)] backdrop-blur-2xl dark:border-white/10 dark:bg-black/20 dark:text-orange-300">
              <Sparkles className="h-4 w-4" />
              CRM Fudge Grow · Ruflo-style flow
            </div>
            <h1 className="max-w-4xl text-5xl font-black tracking-[-0.06em] text-gray-950 dark:text-white md:text-7xl">
              Sales documentation that feels like a product cockpit.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-gray-600 dark:text-gray-300 md:text-xl">
              {app?.description ||
                'Fudge Grow is the CRM workspace for capturing demand, managing relationships, moving deals through pipeline stages, and giving managers a clear revenue forecast.'}
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <a
                href="#workflow"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-3 text-sm font-black text-white shadow-[0_18px_50px_rgba(245,99,15,0.35)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_60px_rgba(245,99,15,0.45)] focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black"
              >
                Start reading
                <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href="#launch"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/50 bg-white/30 px-6 py-3 text-sm font-black text-gray-900 shadow-[0_8px_32px_rgba(0,0,0,0.06)] backdrop-blur-2xl transition hover:-translate-y-0.5 hover:bg-white/45 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-white/10 dark:bg-black/20 dark:text-white dark:hover:bg-white/[0.08] dark:focus-visible:ring-offset-black"
              >
                Launch checklist
                <ClipboardList className="h-4 w-4" />
              </a>
            </div>
            <motion.div
              className="mt-6 grid gap-3 sm:grid-cols-3"
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              {['Lead captured', 'Deal advanced', 'Forecast refreshed'].map((item, index) => (
                <motion.div
                  key={item}
                  variants={cardVariants}
                  whileHover={{ y: -4, scale: 1.03 }}
                  className="rounded-2xl border border-white/50 bg-white/30 px-4 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.06)] backdrop-blur-2xl dark:border-white/10 dark:bg-black/20"
                >
                  <motion.span
                    className="mb-2 block h-1.5 rounded-full bg-gradient-to-r from-orange-500 to-amber-300"
                    initial={{ width: 0 }}
                    animate={{ width: `${92 - index * 17}%` }}
                    transition={{ delay: 0.55 + index * 0.12, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                  />
                  <span className="text-xs font-black uppercase tracking-[0.16em] text-gray-700 dark:text-orange-100">
                    {item}
                  </span>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          <motion.div variants={fadeUp}>
            <motion.div
              className="relative"
              animate={shouldReduceMotion ? undefined : { y: [0, -8, 0] }}
              transition={shouldReduceMotion ? undefined : { duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            >
              <motion.div
                className="absolute -inset-6 rounded-[2.5rem] border border-orange-300/30"
                animate={shouldReduceMotion ? undefined : { rotate: 360 }}
                transition={shouldReduceMotion ? undefined : { duration: 18, repeat: Infinity, ease: 'linear' }}
              />
              <motion.div
                className="absolute -right-3 top-8 z-20 h-8 w-8 rounded-full bg-orange-400 shadow-[0_0_35px_rgba(251,146,60,0.95)]"
                animate={shouldReduceMotion ? undefined : { scale: [1, 1.45, 1], opacity: [0.65, 1, 0.65] }}
                transition={shouldReduceMotion ? undefined : { duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
              />
              <motion.div
                className="absolute -bottom-4 left-10 z-20 h-5 w-5 rounded-full bg-amber-300 shadow-[0_0_30px_rgba(252,211,77,0.9)]"
                animate={shouldReduceMotion ? undefined : { y: [0, -18, 0], x: [0, 10, 0] }}
                transition={shouldReduceMotion ? undefined : { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
              />
          <GlassCard className="p-5 md:p-6" hover={false}>
            <div className="rounded-[1.5rem] border border-gray-950/5 bg-gray-950 p-4 text-white shadow-2xl dark:border-white/10">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-300">Revenue command</p>
                  <h2 className="mt-1 text-2xl font-black">Pipeline Health</h2>
                </div>
                <span className="rounded-full bg-emerald-400/[0.15] px-3 py-1 text-xs font-bold text-emerald-300">
                  Live-ready
                </span>
              </div>

              <motion.div
                className="grid gap-3 sm:grid-cols-3"
                variants={staggerContainer}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.4 }}
              >
                {metrics.map((metric) => (
                  <motion.div
                    key={metric.label}
                    variants={cardVariants}
                    whileHover={{ y: -3, backgroundColor: 'rgba(255,255,255,0.11)' }}
                    className="rounded-2xl border border-white/10 bg-white/[0.07] p-4"
                  >
                    <metric.icon className="mb-5 h-5 w-5 text-orange-300" />
                    <p className="text-2xl font-black">{metric.value}</p>
                    <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/[0.45]">{metric.label}</p>
                    <p className="mt-2 text-xs text-white/[0.55]">{metric.note}</p>
                  </motion.div>
                ))}
              </motion.div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                <div className="mb-4 flex items-center justify-between text-xs font-bold uppercase tracking-[0.18em] text-white/50">
                  <span>Stage velocity</span>
                  <span>Q2 sample</span>
                </div>
                <div className="space-y-3">
                  {workflowStages.slice(0, 4).map((stage, index) => (
                    <div key={stage.label} className="grid grid-cols-[5.5rem_1fr_2.5rem] items-center gap-3 text-sm">
                      <span className="font-semibold text-white/75">{stage.label}</span>
                      <div className="relative h-2 overflow-hidden rounded-full bg-white/10">
                        <motion.div
                          className="relative h-full overflow-hidden rounded-full bg-gradient-to-r from-orange-400 to-amber-300"
                          initial={{ width: 0 }}
                          whileInView={{ width: `${stage.pct}%` }}
                          viewport={{ once: true, amount: 0.8 }}
                          transition={{ duration: 0.8, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
                        >
                          <motion.span
                            className="absolute inset-y-0 -left-8 w-8 bg-white/60 blur-sm"
                            animate={shouldReduceMotion ? undefined : { x: [0, 180] }}
                            transition={shouldReduceMotion ? undefined : { duration: 1.25, delay: 0.9 + index * 0.1, repeat: Infinity, repeatDelay: 1.2, ease: 'easeInOut' }}
                          />
                        </motion.div>
                      </div>
                      <span className="text-right font-mono text-white/[0.45]">{stage.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </GlassCard>
          </motion.div>
          </motion.div>
        </motion.header>

        <motion.nav
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.35, ease: 'easeOut' }}
          className="sticky top-4 z-20 -mt-3 hidden max-w-full self-start overflow-x-auto rounded-2xl border border-white/50 bg-white/30 p-2 shadow-[0_8px_32px_rgba(0,0,0,0.08)] backdrop-blur-2xl dark:border-white/10 dark:bg-black/20 md:flex md:w-auto md:items-center md:gap-1"
        >
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-xl px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-gray-500 transition hover:bg-orange-500 hover:text-white dark:text-gray-300"
            >
              {item.label}
            </a>
          ))}
        </motion.nav>

        <MotionSection id="workflow" className="-mt-4 scroll-mt-24 md:-mt-6">
          <SectionHeading
            kicker="Operating workflow"
            title="From first signal to closed revenue."
            description="Use Fudge Grow as the source of truth for lead intake, qualification, engagement, proposal tracking, and sales handoff."
          />
          <GlassCard className="p-5 md:p-6">
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.25 }}
            >
              <OperatingModelStrip />
            </motion.div>
            <motion.div
              className="grid gap-3 md:grid-cols-2 xl:grid-cols-5"
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
            >
              {workflowStages.map((stage, index) => (
                <motion.div
                  key={stage.label}
                  variants={cardVariants}
                  whileHover={{ y: -6, scale: 1.02 }}
                  whileTap={{ scale: 0.99 }}
                  className="group relative rounded-3xl border border-white/50 bg-white/30 p-5 shadow-[0_8px_32px_rgba(0,0,0,0.05)] backdrop-blur-2xl transition-colors hover:border-orange-300/80 hover:bg-white/45 dark:border-white/10 dark:bg-black/20 dark:hover:border-orange-300/40 dark:hover:bg-white/[0.08]"
                >
                  <div className="mb-5 flex items-center justify-between">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-500 text-sm font-black text-white shadow-lg shadow-orange-500/25 transition group-hover:rotate-3 group-hover:scale-105">
                      {index + 1}
                    </span>
                    <ChevronRight className="hidden h-4 w-4 text-orange-500 transition group-hover:translate-x-1 lg:block" />
                  </div>
                  <h3 className="text-lg font-black text-gray-950 dark:text-white">{stage.label}</h3>
                  <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300">{stage.detail}</p>
                  <div className="mt-6 h-2 overflow-hidden rounded-full bg-gray-950/10 dark:bg-white/10">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400"
                      initial={{ width: 0 }}
                      whileInView={{ width: `${stage.pct}%` }}
                      viewport={{ once: true, amount: 0.8 }}
                      transition={{ duration: 0.75, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </GlassCard>
        </MotionSection>

        <MotionSection id="modules" className="scroll-mt-24">
          <SectionHeading
            kicker="Core modules"
            title="Everything a sales team needs on one surface."
            description="The documentation below is structured around the product areas users will see when they open CRM Fudge Grow."
          />
          <motion.div
            className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.12 }}
          >
            {modules.map((module) => (
              <motion.div key={module.title} variants={cardVariants}>
              <GlassCard className="group p-6 transition duration-300 hover:border-orange-300/70">
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-600 transition group-hover:bg-orange-500 group-hover:text-white dark:text-orange-300">
                  <module.icon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-black text-gray-950 dark:text-white">{module.title}</h3>
                <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300">{module.body}</p>
              </GlassCard>
              </motion.div>
            ))}
          </motion.div>
        </MotionSection>

        <MotionSection id="data-model" className="grid scroll-mt-24 gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(24rem,0.95fr)] lg:items-start">
          <div>
            <SectionHeading
              kicker="Data model"
              title="A clean CRM foundation."
              description="These records create the documentation backbone for admins, developers, and sales operators."
            />
            <GlassCard className="p-6">
              <div className="flex items-center gap-3">
                <Database className="h-5 w-5 text-orange-600 dark:text-orange-300" />
                <p className="text-sm font-black uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                  Primary objects
                </p>
              </div>
              <div className="mt-5 divide-y divide-gray-950/10 dark:divide-white/10">
                {dataObjects.map(([name, description]) => (
                  <div key={name} className="grid gap-2 py-4 sm:grid-cols-[8rem_1fr]">
                    <p className="font-black text-gray-950 dark:text-white">{name}</p>
                    <p className="text-sm leading-6 text-gray-600 dark:text-gray-300">{description}</p>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>

          <GlassCard className="p-5">
            <div className="rounded-[1.5rem] border border-gray-950/10 bg-[#101010] p-5 text-white shadow-2xl dark:border-white/10">
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-red-400" />
                  <span className="h-3 w-3 rounded-full bg-amber-300" />
                  <span className="h-3 w-3 rounded-full bg-emerald-400" />
                </div>
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-white/[0.35]">lead-create.js</span>
              </div>
              <pre className="overflow-x-auto rounded-2xl bg-white/[0.06] p-5 text-sm leading-7 text-orange-100">
                <code>{codeSample}</code>
              </pre>
              <button
                type="button"
                onClick={copyCode}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-white/80 transition hover:bg-white/20"
              >
                <Copy className="h-4 w-4" />
                {copied ? 'Copied' : 'Copy example'}
              </button>
            </div>
          </GlassCard>
        </MotionSection>

        <MotionSection id="launch" className="grid scroll-mt-24 gap-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(22rem,0.92fr)] lg:items-stretch">
          <GlassCard className="p-7 md:p-9">
            <SectionHeading
              kicker="Launch checklist"
              title="Prepare the CRM before real users arrive."
              description="Use this checklist as the first admin handoff document for CRM Fudge Grow."
            />
            <div className="space-y-4">
              {launchChecklist.map((item, index) => (
                <motion.div
                  key={item}
                  initial={{ opacity: 0, x: -12 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.7 }}
                  transition={{ duration: 0.35, delay: index * 0.06, ease: 'easeOut' }}
                  className="flex gap-3 rounded-2xl border border-white/50 bg-white/30 p-4 shadow-[0_8px_32px_rgba(0,0,0,0.05)] backdrop-blur-2xl transition hover:border-orange-300/70 hover:bg-white/45 dark:border-white/10 dark:bg-black/20 dark:hover:bg-white/[0.08]"
                >
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-orange-600 dark:text-orange-300" />
                  <p className="text-sm leading-6 text-gray-700 dark:text-gray-200">{item}</p>
                </motion.div>
              ))}
            </div>
          </GlassCard>

          <div className="grid gap-5">
            {[
              { icon: UsersRound, title: 'For sales reps', text: 'Log leads, track calls, update stages, and protect every next action.' },
              { icon: BarChart3, title: 'For managers', text: 'Review pipeline risk, rep activity, conversion quality, and forecast movement.' },
              { icon: PanelTop, title: 'For admins', text: 'Tune roles, data fields, imports, automations, and workspace settings.' },
              { icon: FileText, title: 'For operators', text: 'Use this documentation as the handoff guide for training and rollout.' },
            ].map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.35, delay: index * 0.06, ease: 'easeOut' }}
              >
              <GlassCard className="p-5">
                <div className="flex gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-lg shadow-orange-500/25">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-gray-950 dark:text-white">{item.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-300">{item.text}</p>
                  </div>
                </div>
              </GlassCard>
              </motion.div>
            ))}
          </div>
        </MotionSection>

        <GlassCard className="p-8 md:p-10">
          <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <div className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-[0.2em] text-orange-600 dark:text-orange-300">
                <MessageSquareText className="h-4 w-4" />
                Documentation note
              </div>
              <h2 className="text-3xl font-black tracking-tight text-gray-950 dark:text-white">
                This page is now the CRM documentation destination.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600 dark:text-gray-300">
                The application hub&apos;s View Documentation button already points here: <span className="font-mono text-orange-600 dark:text-orange-300">/applications/crm/docs</span>.
              </p>
            </div>
            <a
              href="#overview"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-orange-500/30 bg-orange-500/10 px-6 py-3 text-sm font-black text-orange-700 transition hover:-translate-y-0.5 hover:bg-orange-500 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:text-orange-200 dark:focus-visible:ring-offset-black"
            >
              Back to top
              <ArrowRight className="h-4 w-4 -rotate-90" />
            </a>
          </div>
        </GlassCard>
      </div>
    </article>
  );
}
