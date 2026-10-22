'use client';

import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Building2,
  Check,
  CheckCircle2,
  CircleDollarSign,
  Code2,
  Copy,
  DatabaseZap,
  Eye,
  Fingerprint,
  Gauge,
  GitBranch,
  KeyRound,
  Layers3,
  Lock,
  Network,
  Orbit,
  Radar,
  ScrollText,
  ServerCog,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  UserCog,
  UsersRound,
} from 'lucide-react';

const navItems = [
  { label: 'Overview', href: '#overview' },
  { label: 'Control Plane', href: '#control-plane' },
  { label: 'Request Flow', href: '#request-flow' },
  { label: 'Policy Graph', href: '#policy-graph' },
  { label: 'API Surface', href: '#api-surface' },
  { label: 'Launch', href: '#launch' },
];

const controlMetrics = [
  { label: 'Provisioned users', value: '1,248', note: 'sample tenant', icon: UsersRound },
  { label: 'Policy checks', value: '38k', note: 'daily evaluated', icon: ShieldCheck },
  { label: 'Audit events', value: '99.9%', note: 'retention-ready', icon: Activity },
];

const commandPanels = [
  {
    icon: Building2,
    title: 'Organization registry',
    body: 'Company profile, departments, branded workspace settings, tenant defaults, and connected applications.',
  },
  {
    icon: UserCog,
    title: 'User lifecycle',
    body: 'Invite, activate, suspend, transfer ownership, and keep identity records synchronized across teams.',
  },
  {
    icon: Fingerprint,
    title: 'Access policies',
    body: 'Role scopes, permission bundles, 2FA rules, SSO boundaries, session controls, and admin delegation.',
  },
  {
    icon: CircleDollarSign,
    title: 'Billing operations',
    body: 'Plan state, subscription seats, invoices, payment methods, usage signals, and renewal visibility.',
  },
  {
    icon: ScrollText,
    title: 'Audit evidence',
    body: 'Tamper-aware activity trails for account changes, security decisions, billing updates, and admin actions.',
  },
  {
    icon: ServerCog,
    title: 'Platform settings',
    body: 'API keys, integration toggles, workspace defaults, notification policies, and compliance configuration.',
  },
];

const policyLanes = [
  {
    label: 'Identity',
    color: 'from-emerald-400 to-teal-400',
    items: ['SSO assertion', 'User profile', 'Department scope'],
  },
  {
    label: 'Access',
    color: 'from-cyan-400 to-sky-500',
    items: ['Role bundle', 'Permission gate', 'App boundary'],
  },
  {
    label: 'Governance',
    color: 'from-lime-300 to-emerald-500',
    items: ['Audit log', 'Billing policy', 'Security review'],
  },
];

const requestFlow = [
  {
    icon: Fingerprint,
    label: 'Authenticate',
    title: 'Verify identity',
    body: 'Confirm SSO, session state, 2FA posture, and account status before a workspace action continues.',
    signal: 'SSO + 2FA',
  },
  {
    icon: KeyRound,
    label: 'Authorize',
    title: 'Resolve access',
    body: 'Evaluate role bundle, department scope, application boundary, and delegated admin permissions.',
    signal: 'RBAC gate',
  },
  {
    icon: CircleDollarSign,
    label: 'Entitle',
    title: 'Check plan scope',
    body: 'Match the requested action against seat availability, subscription state, and enabled product modules.',
    signal: 'Plan limits',
  },
  {
    icon: ScrollText,
    label: 'Record',
    title: 'Write evidence',
    body: 'Persist actor, resource, policy result, before-and-after values, and trace metadata into audit history.',
    signal: 'Audit event',
  },
];

const roles = ['Owner', 'Admin', 'Manager', 'Member', 'Auditor'];

const permissions = [
  { label: 'Manage organization profile', owner: true, admin: true, manager: false, member: false, auditor: false },
  { label: 'Invite and suspend users', owner: true, admin: true, manager: true, member: false, auditor: false },
  { label: 'Edit roles and permission bundles', owner: true, admin: true, manager: false, member: false, auditor: false },
  { label: 'Configure SSO and 2FA policies', owner: true, admin: true, manager: false, member: false, auditor: false },
  { label: 'View billing and subscription usage', owner: true, admin: true, manager: false, member: false, auditor: true },
  { label: 'Export audit evidence', owner: true, admin: true, manager: false, member: false, auditor: true },
];

const setupChecklist = [
  'Confirm organization profile, primary admin ownership, billing contact, and workspace branding.',
  'Create role bundles for executives, finance, operations, managers, members, and read-only auditors.',
  'Turn on 2FA, session timeout, SSO rules, API key rotation, and recovery procedures before broad rollout.',
  'Invite teams in phases so departments, ownership, and app access can be verified cleanly.',
  'Review audit exports, billing usage, permission drift, and admin changes after the first week.',
];

const apiSamples = {
  invite: {
    label: 'Invite user',
    method: 'POST',
    code: `const invite = await base.users.invite({
  email: 'ops@acme.example',
  role: 'Manager',
  department: 'Operations',
  apps: ['crm', 'pm', 'books'],
  requireTwoFactor: true
});`,
  },
  audit: {
    label: 'Read audit trail',
    method: 'GET',
    code: `const events = await base.audit.list({
  actor: 'admin@acme.example',
  action: 'role.updated',
  from: '2026-06-01',
  includeEvidence: true
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
    <div className="mb-7 max-w-3xl">
      <p className="mb-2 text-xs font-black uppercase tracking-[0.24em] text-emerald-600 dark:text-emerald-300">
        {kicker}
      </p>
      <h2 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white md:text-4xl xl:text-5xl">
        {title}
      </h2>
      {description ? (
        <p className="mt-3 text-base leading-7 text-slate-600 dark:text-slate-300 md:text-lg">
          {description}
        </p>
      ) : null}
    </div>
  );
}

function BaseCard({ children, className = '', hover = true }) {
  return (
    <motion.div
      whileHover={hover ? { y: -4, scale: 1.01 } : undefined}
      transition={{ type: 'spring', stiffness: 260, damping: 24 }}
      className={`relative overflow-hidden rounded-[2rem] border border-emerald-950/10 bg-white/72 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur-2xl dark:border-emerald-300/10 dark:bg-slate-950/58 dark:shadow-[0_24px_80px_rgba(0,0,0,0.45)] ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-100/50 via-white/20 to-cyan-100/30 dark:from-emerald-400/[0.08] dark:via-white/[0.02] dark:to-cyan-400/[0.06]" />
      <div className="relative">{children}</div>
    </motion.div>
  );
}

function PermissionIcon({ allowed, active }) {
  if (allowed) {
    return (
      <span
        className={`inline-flex h-8 w-8 items-center justify-center rounded-full border ${
          active
            ? 'border-emerald-400 bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
            : 'border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-300/20 dark:bg-emerald-400/10 dark:text-emerald-300'
        }`}
      >
        <Check className="h-4 w-4" />
      </span>
    );
  }

  return (
    <span
      className={`inline-flex h-8 w-8 items-center justify-center rounded-full border ${
        active
          ? 'border-amber-300 bg-amber-100 text-amber-700 dark:border-amber-300/30 dark:bg-amber-400/10 dark:text-amber-300'
          : 'border-slate-200 bg-slate-50 text-slate-300 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-600'
      }`}
    >
      <Lock className="h-3.5 w-3.5" />
    </span>
  );
}

function BaseRequestFlow({ shouldReduceMotion }) {
  return (
    <BaseCard className="p-5 md:p-6" hover={false}>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.82fr)_minmax(22rem,0.6fr)] xl:items-stretch">
        <div className="relative overflow-hidden rounded-[1.7rem] border border-slate-950/10 bg-slate-950 p-5 text-white shadow-2xl dark:border-white/10 md:p-7">
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                'linear-gradient(rgba(52,211,153,0.16) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.14) 1px, transparent 1px)',
              backgroundSize: '34px 34px',
            }}
          />
          <motion.div
            className="absolute left-10 top-8 h-40 w-40 rounded-full bg-emerald-400/20 blur-3xl"
            animate={shouldReduceMotion ? undefined : { scale: [1, 1.18, 1], opacity: [0.35, 0.68, 0.35] }}
            transition={shouldReduceMotion ? undefined : { duration: 4.8, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute bottom-4 right-8 h-44 w-44 rounded-full bg-cyan-400/16 blur-3xl"
            animate={shouldReduceMotion ? undefined : { x: [0, -18, 0], y: [0, 12, 0] }}
            transition={shouldReduceMotion ? undefined : { duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          />

          <div className="relative z-10 mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-300">Authorization trace</p>
              <h3 className="mt-2 text-2xl font-black">How Base evaluates a workspace action</h3>
            </div>
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-xs font-bold text-cyan-100">
              <Activity className="h-3.5 w-3.5" />
              Animated flow
            </span>
          </div>

          <div className="relative z-10">
            <div className="absolute left-5 right-5 top-8 hidden h-px bg-gradient-to-r from-emerald-300/0 via-emerald-300/50 to-cyan-300/0 md:block" />
            <motion.div
              className="absolute left-5 top-[1.78rem] hidden h-2 w-2 rounded-full bg-cyan-200 shadow-[0_0_20px_rgba(103,232,249,0.95)] md:block"
              animate={shouldReduceMotion ? undefined : { x: ['0%', 'calc(100vw - 32rem)', '0%'] }}
              transition={shouldReduceMotion ? undefined : { duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
            />

            <motion.div
              className="grid gap-4 md:grid-cols-4"
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.24 }}
            >
              {requestFlow.map((step, index) => (
                <motion.div
                  key={step.label}
                  variants={cardVariants}
                  whileHover={{ y: -6, scale: 1.02 }}
                  className="relative rounded-3xl border border-white/10 bg-white/[0.07] p-4 backdrop-blur"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-300 to-cyan-300 text-slate-950 shadow-lg shadow-emerald-500/20">
                      <step.icon className="h-5 w-5" />
                    </span>
                    <span className="font-mono text-xs text-white/35">0{index + 1}</span>
                  </div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-200">{step.label}</p>
                  <h4 className="mt-2 text-lg font-black">{step.title}</h4>
                  <p className="mt-3 text-sm leading-6 text-white/58">{step.body}</p>
                  <div className="mt-5 rounded-2xl border border-white/10 bg-black/24 px-3 py-2 text-xs font-bold text-cyan-100">
                    {step.signal}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>

        <div className="grid gap-4">
          {[
            { label: 'Denied requests', value: 'Blocked before app data loads', icon: Lock },
            { label: 'Allowed requests', value: 'Forwarded with scoped claims', icon: ShieldCheck },
            { label: 'Audited requests', value: 'Stored with actor and policy result', icon: Eye },
          ].map((item, index) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, x: 14 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ delay: index * 0.08, duration: 0.38, ease: 'easeOut' }}
              className="rounded-3xl border border-slate-950/10 bg-white/60 p-5 dark:border-white/10 dark:bg-white/[0.04]"
            >
              <div className="flex gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                  <item.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{item.label}</p>
                  <p className="mt-2 text-base font-black text-slate-950 dark:text-white">{item.value}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </BaseCard>
  );
}

function PolicyGraph({ shouldReduceMotion }) {
  return (
    <div className="relative min-h-[32rem] overflow-hidden rounded-[2rem] border border-slate-950/10 bg-slate-950 p-6 text-white shadow-2xl dark:border-white/10">
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            'linear-gradient(rgba(16,185,129,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,0.18) 1px, transparent 1px)',
          backgroundSize: '36px 36px',
        }}
      />
      <motion.div
        className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald-300/25"
        animate={shouldReduceMotion ? undefined : { rotate: 360 }}
        transition={shouldReduceMotion ? undefined : { duration: 28, repeat: Infinity, ease: 'linear' }}
      />
      <motion.div
        className="absolute left-1/2 top-1/2 h-52 w-52 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-300/20"
        animate={shouldReduceMotion ? undefined : { rotate: -360 }}
        transition={shouldReduceMotion ? undefined : { duration: 22, repeat: Infinity, ease: 'linear' }}
      />

      <div className="relative z-10 flex items-center justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-300">Live authorization map</p>
          <h3 className="mt-2 text-2xl font-black">Policy Graph</h3>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-200">
          <Radar className="h-3.5 w-3.5" />
          Guarded
        </span>
      </div>

      <div className="relative z-10 mt-10 grid gap-4 md:grid-cols-3">
        {policyLanes.map((lane, index) => (
          <motion.div
            key={lane.label}
            variants={cardVariants}
            whileHover={{ y: -6, scale: 1.02 }}
            className="rounded-3xl border border-white/10 bg-white/[0.07] p-4 backdrop-blur"
          >
            <div className={`mb-4 h-2 rounded-full bg-gradient-to-r ${lane.color}`} />
            <div className="flex items-center justify-between">
              <h4 className="font-black">{lane.label}</h4>
              <span className="font-mono text-xs text-white/40">0{index + 1}</span>
            </div>
            <div className="mt-5 space-y-3">
              {lane.items.map((item, itemIndex) => (
                <motion.div
                  key={item}
                  initial={{ opacity: 0, x: -8 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.7 }}
                  transition={{ delay: 0.2 + index * 0.08 + itemIndex * 0.06, duration: 0.35 }}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-3 py-3"
                >
                  <span className={`h-2.5 w-2.5 rounded-full bg-gradient-to-r ${lane.color}`} />
                  <span className="text-sm text-white/75">{item}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div
        className="absolute bottom-8 left-1/2 z-20 flex -translate-x-1/2 items-center gap-3 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-5 py-3 text-sm font-bold text-emerald-100 backdrop-blur"
        animate={shouldReduceMotion ? undefined : { y: [0, -8, 0], opacity: [0.82, 1, 0.82] }}
        transition={shouldReduceMotion ? undefined : { duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Orbit className="h-4 w-4" />
        Every access decision resolves through Base.
      </motion.div>
    </div>
  );
}

export default function AccountsDocPage({ app }) {
  const [activeRole, setActiveRole] = useState('Admin');
  const [activeApi, setActiveApi] = useState('invite');
  const [copied, setCopied] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  const copyCode = async () => {
    await navigator.clipboard.writeText(apiSamples[activeApi].code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const scrollToControlPlane = (event) => {
    event.preventDefault();
    document.getElementById('control-plane')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  const hasPermission = (permission, role) => permission[role.toLowerCase()] === true;

  return (
    <article className="relative isolate w-full overflow-hidden py-8 sm:py-10">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <motion.div
          className="absolute left-[-10rem] top-10 h-[34rem] w-[34rem] rounded-full bg-emerald-300/35 blur-[110px] dark:bg-emerald-500/18"
          animate={shouldReduceMotion ? undefined : { scale: [1, 1.18, 1], opacity: [0.5, 0.78, 0.5] }}
          transition={shouldReduceMotion ? undefined : { duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute right-[-8rem] top-[36rem] h-[30rem] w-[30rem] rounded-full bg-cyan-300/30 blur-[110px] dark:bg-cyan-500/16"
          animate={shouldReduceMotion ? undefined : { x: [0, -28, 0], y: [0, 24, 0] }}
          transition={shouldReduceMotion ? undefined : { duration: 7.5, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div
          className="absolute inset-0 opacity-[0.22] dark:opacity-[0.12]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(15,23,42,0.22) 1px, transparent 0)',
            backgroundSize: '28px 28px',
          }}
        />
      </div>

      <div className="mx-auto flex w-full max-w-[88rem] flex-col gap-10 px-4 sm:px-6 md:gap-12 lg:px-8">
        <motion.header
          id="overview"
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="relative overflow-hidden rounded-[3rem] border border-emerald-950/10 bg-white/70 p-6 shadow-[0_30px_100px_rgba(15,23,42,0.12)] backdrop-blur-2xl dark:border-emerald-300/10 dark:bg-slate-950/60 md:p-10 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(24rem,0.92fr)] lg:items-center lg:gap-9"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.18),transparent_34%),radial-gradient(circle_at_80%_15%,rgba(34,211,238,0.16),transparent_32%)]" />

          <motion.div variants={fadeUp} className="relative z-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200/80 bg-emerald-50/80 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-emerald-700 shadow-sm backdrop-blur dark:border-emerald-300/15 dark:bg-emerald-400/10 dark:text-emerald-200">
              <Sparkles className="h-4 w-4" />
              Fudge Base · Official docs
            </div>
            <h1 className="mt-6 max-w-4xl text-5xl font-black tracking-[-0.06em] text-slate-950 dark:text-white md:text-7xl">
              The control plane for every Webfudge workspace.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300 md:text-xl">
              {app?.description ||
                'Fudge Base centralizes users, organizations, roles, security policies, billing, and audit activity across every connected Webfudge application.'}
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <a
                href="#control-plane"
                onClick={scrollToControlPlane}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-6 py-3 text-sm font-black text-white shadow-[0_18px_50px_rgba(16,185,129,0.32)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_60px_rgba(16,185,129,0.42)] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950"
              >
                Start with Base
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>

            <motion.div className="mt-7 grid gap-3 sm:grid-cols-3" variants={staggerContainer}>
              {controlMetrics.map((metric) => (
                <motion.div
                  key={metric.label}
                  variants={cardVariants}
                  className="rounded-2xl border border-emerald-950/10 bg-white/62 p-4 backdrop-blur dark:border-white/10 dark:bg-white/[0.06]"
                >
                  <metric.icon className="mb-4 h-5 w-5 text-emerald-600 dark:text-emerald-300" />
                  <p className="text-2xl font-black text-slate-950 dark:text-white">{metric.value}</p>
                  <p className="mt-1 text-[11px] font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    {metric.label}
                  </p>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{metric.note}</p>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          <motion.div variants={fadeUp} className="relative z-10 mt-10 lg:mt-0">
            <BaseCard className="p-5" hover={false}>
              <div className="rounded-[1.5rem] border border-slate-950/10 bg-slate-950 p-5 text-white shadow-2xl dark:border-white/10">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300">Tenant command</p>
                    <h2 className="mt-1 text-2xl font-black">Workspace Integrity</h2>
                  </div>
                  <span className="rounded-full bg-emerald-400/[0.14] px-3 py-1 text-xs font-bold text-emerald-200">
                    Protected
                  </span>
                </div>

                <div className="relative mb-6 grid min-h-[15rem] place-items-center rounded-3xl border border-white/10 bg-white/[0.04]">
                  <motion.div
                    className="absolute h-44 w-44 rounded-full border border-emerald-300/20"
                    animate={shouldReduceMotion ? undefined : { rotate: 360 }}
                    transition={shouldReduceMotion ? undefined : { duration: 18, repeat: Infinity, ease: 'linear' }}
                  />
                  <motion.div
                    className="absolute h-32 w-32 rounded-full border border-cyan-300/20"
                    animate={shouldReduceMotion ? undefined : { rotate: -360 }}
                    transition={shouldReduceMotion ? undefined : { duration: 14, repeat: Infinity, ease: 'linear' }}
                  />
                  <div className="relative z-10 grid h-24 w-24 place-items-center rounded-[2rem] bg-gradient-to-br from-emerald-400 to-cyan-400 shadow-[0_0_55px_rgba(16,185,129,0.45)]">
                    <Network className="h-10 w-10 text-slate-950" />
                  </div>
                  {[
                    ['Users', 'left-7 top-8', UsersRound],
                    ['Roles', 'right-7 top-10', KeyRound],
                    ['Billing', 'bottom-8 left-10', ScrollText],
                    ['Audit', 'bottom-9 right-10', Eye],
                  ].map(([label, position, Icon]) => (
                    <motion.div
                      key={label}
                      className={`absolute ${position} rounded-2xl border border-white/10 bg-white/[0.08] px-3 py-2 backdrop-blur`}
                      animate={shouldReduceMotion ? undefined : { y: [0, -6, 0] }}
                      transition={shouldReduceMotion ? undefined : { duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      <div className="flex items-center gap-2 text-xs font-bold text-white/70">
                        <Icon className="h-3.5 w-3.5 text-emerald-300" />
                        {label}
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  {['SSO enforced', 'Roles scoped', 'Audit retained'].map((item, index) => (
                    <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-[0.16em] text-white/45">0{index + 1}</span>
                        <BadgeCheck className="h-4 w-4 text-emerald-300" />
                      </div>
                      <p className="text-sm font-bold text-white/80">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            </BaseCard>
          </motion.div>
        </motion.header>

        <motion.nav
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.35, ease: 'easeOut' }}
          className="sticky top-4 z-20 -mt-3 hidden max-w-full self-start overflow-x-auto rounded-2xl border border-emerald-950/10 bg-white/70 p-2 shadow-[0_14px_45px_rgba(15,23,42,0.08)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/60 md:flex md:w-auto md:items-center md:gap-1"
        >
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-xl px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-slate-500 transition hover:bg-emerald-500 hover:text-white dark:text-slate-300"
            >
              {item.label}
            </a>
          ))}
        </motion.nav>

        <MotionSection id="control-plane" className="-mt-4 scroll-mt-24 md:-mt-6">
          <SectionHeading
            kicker="Control plane"
            title="Base turns administration into an operating system."
            description="This documentation is organized around the jobs an operations team performs every week: govern identity, manage subscription state, and prove what changed."
          />
          <motion.div
            className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.12 }}
          >
            {commandPanels.map((panel) => (
              <motion.div key={panel.title} variants={cardVariants}>
                <BaseCard className="group h-full p-6 transition duration-300 hover:border-emerald-300/60">
                  <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-700 transition group-hover:bg-emerald-500 group-hover:text-white dark:text-emerald-300">
                    <panel.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-black text-slate-950 dark:text-white">{panel.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{panel.body}</p>
                </BaseCard>
              </motion.div>
            ))}
          </motion.div>
        </MotionSection>

        <MotionSection id="request-flow" className="scroll-mt-24">
          <SectionHeading
            kicker="Request flow"
            title="Every admin action passes through the same trust path."
            description="This flow chart shows how Base checks identity, permissions, subscription scope, and audit requirements before a connected app receives an allowed action."
          />
          <BaseRequestFlow shouldReduceMotion={shouldReduceMotion} />
        </MotionSection>

        <MotionSection id="policy-graph" className="grid scroll-mt-24 gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(26rem,1.05fr)] xl:items-start">
          <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }}>
            <SectionHeading
              kicker="Policy graph"
              title="One map for identity, access, and governance."
              description="Fudge Base makes access decisions visible by connecting each user to their department, role bundle, app permissions, billing scope, and audit trail."
            />
            <PolicyGraph shouldReduceMotion={shouldReduceMotion} />
          </motion.div>

          <BaseCard className="p-5 md:p-6" hover={false}>
            <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-300">
                  <SlidersHorizontal className="h-4 w-4" />
                  Role matrix
                </div>
                <h3 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">Permission boundaries</h3>
              </div>
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 dark:border-emerald-300/20 dark:bg-emerald-400/10 dark:text-emerald-200">
                Click a role
              </span>
            </div>

            <div className="mb-5 flex flex-wrap gap-2">
              {roles.map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setActiveRole(role)}
                  className={`rounded-2xl px-4 py-2 text-xs font-black uppercase tracking-[0.14em] transition ${
                    activeRole === role
                      ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                      : 'border border-slate-950/10 bg-white/60 text-slate-500 hover:border-emerald-300 hover:text-emerald-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300 dark:hover:text-emerald-200'
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>

            <div className="overflow-x-auto rounded-3xl border border-slate-950/10 bg-white/60 dark:border-white/10 dark:bg-white/[0.04]">
              <table className="w-full min-w-[42rem] text-sm">
                <thead>
                  <tr className="border-b border-slate-950/10 dark:border-white/10">
                    <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                      Permission
                    </th>
                    {roles.map((role) => (
                      <th
                        key={role}
                        className={`px-4 py-4 text-center text-xs font-black uppercase tracking-[0.14em] ${
                          activeRole === role ? 'text-emerald-600 dark:text-emerald-300' : 'text-slate-400'
                        }`}
                      >
                        {role}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-950/10 dark:divide-white/10">
                  {permissions.map((permission, index) => (
                    <motion.tr
                      key={permission.label}
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true, amount: 0.6 }}
                      transition={{ delay: index * 0.04, duration: 0.3 }}
                      className="transition hover:bg-emerald-50/60 dark:hover:bg-emerald-400/[0.04]"
                    >
                      <td className="px-5 py-4 font-bold text-slate-700 dark:text-slate-200">{permission.label}</td>
                      {roles.map((role) => (
                        <td key={role} className="px-4 py-4 text-center">
                          <PermissionIcon allowed={hasPermission(permission, role)} active={activeRole === role} />
                        </td>
                      ))}
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </BaseCard>
        </MotionSection>

        <MotionSection id="api-surface" className="grid scroll-mt-24 gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(25rem,1.1fr)] lg:items-stretch">
          <BaseCard className="p-7 md:p-9">
            <SectionHeading
              kicker="API surface"
              title="Automate the admin layer without losing evidence."
              description="Use Base APIs for repeatable user onboarding, access reviews, audit exports, and workspace governance tasks."
            />
            <div className="grid gap-4">
              {[
                { icon: Code2, title: 'Provision safely', text: 'Create users with role, department, application access, and security requirements in one request.' },
                { icon: DatabaseZap, title: 'Query evidence', text: 'Pull audit events with actor, action, resource, timestamp, and policy context for compliance workflows.' },
                { icon: Gauge, title: 'Review drift', text: 'Compare intended roles to actual permissions before access sprawl becomes operational debt.' },
              ].map((item) => (
                <div key={item.title} className="flex gap-4 rounded-2xl border border-slate-950/10 bg-white/54 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/20">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-950 dark:text-white">{item.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </BaseCard>

          <BaseCard className="p-5" hover={false}>
            <div className="overflow-hidden rounded-[1.5rem] border border-slate-950/10 bg-slate-950 text-white shadow-2xl dark:border-white/10">
              <div className="flex flex-col border-b border-white/10 bg-black/20 sm:flex-row">
                {Object.entries(apiSamples).map(([key, sample]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveApi(key)}
                    className={`border-b border-white/10 px-6 py-4 text-left font-mono text-xs font-bold transition sm:border-b-0 sm:border-r ${
                      activeApi === key
                        ? 'bg-emerald-400/10 text-emerald-300 shadow-[inset_0_-2px_0_0_#34d399] sm:shadow-[inset_-2px_0_0_0_#34d399]'
                        : 'text-white/45 hover:bg-white/[0.05] hover:text-white'
                    }`}
                  >
                    <span className={`mr-3 text-[11px] font-black ${sample.method === 'GET' ? 'text-cyan-300' : 'text-emerald-300'}`}>
                      {sample.method}
                    </span>
                    {sample.label}
                  </button>
                ))}
              </div>
              <div className="p-6 lg:p-8">
                <div className="mb-5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-white/40">
                    <GitBranch className="h-4 w-4" />
                    base.sdk.js
                  </div>
                  <button
                    type="button"
                    onClick={copyCode}
                    className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-white/80 transition hover:bg-white/20"
                  >
                    {copied ? <Check className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <AnimatePresence mode="wait">
                  <motion.pre
                    key={activeApi}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-x-auto rounded-2xl bg-white/[0.06] p-5 font-mono text-sm leading-7 text-emerald-100"
                  >
                    <code>{apiSamples[activeApi].code}</code>
                  </motion.pre>
                </AnimatePresence>
              </div>
            </div>
          </BaseCard>
        </MotionSection>

        <MotionSection id="launch" className="grid scroll-mt-24 gap-6 lg:grid-cols-[minmax(0,1.06fr)_minmax(22rem,0.94fr)] lg:items-stretch">
          <BaseCard className="p-7 md:p-9">
            <SectionHeading
              kicker="Launch checklist"
              title="Prepare Base before every connected app scales."
              description="Treat this as the admin handoff checklist for the first production workspace."
            />
            <div className="space-y-4">
              {setupChecklist.map((item, index) => (
                <motion.div
                  key={item}
                  initial={{ opacity: 0, x: -12 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.7 }}
                  transition={{ duration: 0.35, delay: index * 0.06, ease: 'easeOut' }}
                  className="flex gap-3 rounded-2xl border border-slate-950/10 bg-white/56 p-4 transition hover:border-emerald-300/70 hover:bg-white/80 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-emerald-400/[0.06]"
                >
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-300" />
                  <p className="text-sm leading-6 text-slate-700 dark:text-slate-200">{item}</p>
                </motion.div>
              ))}
            </div>
          </BaseCard>

          <div className="grid gap-5">
            {[
              { icon: ShieldCheck, title: 'Security owners', text: 'Define authentication policy, role scopes, access review cadence, and incident recovery paths.' },
              { icon: Layers3, title: 'Operations teams', text: 'Keep departments, users, app access, billing, and org settings aligned as teams change.' },
              { icon: ScrollText, title: 'Finance admins', text: 'Track subscription seats, usage, invoices, payment state, and renewal readiness.' },
              { icon: AlertTriangle, title: 'Compliance reviewers', text: 'Use audit records and permission history to answer who changed what, when, and why.' },
            ].map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.35, delay: index * 0.06, ease: 'easeOut' }}
              >
                <BaseCard className="p-5">
                  <div className="flex gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-emerald-300 shadow-lg dark:bg-emerald-400 dark:text-slate-950">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-black text-slate-950 dark:text-white">{item.title}</h3>
                      <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{item.text}</p>
                    </div>
                  </div>
                </BaseCard>
              </motion.div>
            ))}
          </div>
        </MotionSection>

        <BaseCard className="p-8 md:p-10">
          <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <div className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-300">
                <ShieldCheck className="h-4 w-4" />
                Documentation note
              </div>
              <h2 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white">
                Fudge Base now has a dedicated documentation surface.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                The application hub&apos;s documentation button now opens{' '}
                <span className="font-mono text-emerald-700 dark:text-emerald-300">/Fudge%20Base.html</span>.
              </p>
            </div>
            <a
              href="#overview"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-6 py-3 text-sm font-black text-emerald-700 transition hover:-translate-y-0.5 hover:bg-emerald-500 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:text-emerald-200 dark:focus-visible:ring-offset-slate-950"
            >
              Back to top
              <ArrowRight className="h-4 w-4 -rotate-90" />
            </a>
          </div>
        </BaseCard>
      </div>
    </article>
  );
}
