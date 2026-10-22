'use client';

import { useState } from 'react';
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  GitBranch,
  KanbanSquare,
  MessageSquareText,
  Milestone,
  PanelTop,
  Radar,
  Route,
  Target,
  UsersRound,
  Workflow,
  Zap,
} from 'lucide-react';

const phases = [
  {
    label: 'Scope',
    title: 'Shape the work before motion starts.',
    metric: '96%',
    note: 'Goals, constraints, owners, and acceptance criteria become one clean delivery brief.',
    color: '#38bdf8',
  },
  {
    label: 'Sequence',
    title: 'Turn dependencies into a visible path.',
    metric: '18',
    note: 'Milestones, blockers, handoffs, and due dates show what must move first.',
    color: '#a78bfa',
  },
  {
    label: 'Execute',
    title: 'Run the sprint without status fog.',
    metric: '64%',
    note: 'Tasks, comments, files, checklists, and owners stay attached to the work.',
    color: '#34d399',
  },
  {
    label: 'Review',
    title: 'Catch drift before launch day.',
    metric: '7',
    note: 'Risk, QA, overdue work, stale updates, and scope movement surface early.',
    color: '#fbbf24',
  },
  {
    label: 'Release',
    title: 'Close with proof, not guesswork.',
    metric: 'Ready',
    note: 'Launch notes, handoffs, approvals, and support context land in one record.',
    color: '#fb7185',
  },
];

const lanes = [
  {
    title: 'Ready',
    hint: 'Next clean pulls',
    accent: 'from-sky-300 to-cyan-200',
    cards: ['Client portal empty states', 'QA checklist template'],
  },
  {
    title: 'Building',
    hint: 'Live work',
    accent: 'from-violet-300 to-fuchsia-200',
    cards: ['Timeline capacity view', 'Milestone health widget', 'Inbox mention digest'],
  },
  {
    title: 'Review',
    hint: 'Needs eyes',
    accent: 'from-amber-300 to-orange-200',
    cards: ['Dependency graph polish', 'Release notes export'],
  },
  {
    title: 'Shipped',
    hint: 'Closed loop',
    accent: 'from-emerald-300 to-teal-200',
    cards: ['Project templates', 'Calendar sync'],
  },
];

const modules = [
  [PanelTop, 'Delivery dashboard', 'Health, velocity, overdue work, blocked tasks, milestone drift, and upcoming commitments.'],
  [KanbanSquare, 'Task board', 'Owners, priority, progress, comments, files, due dates, and status transitions.'],
  [CalendarDays, 'Timeline studio', 'Milestone windows, release dates, meetings, dependencies, and sprint commitments.'],
  [MessageSquareText, 'Team inbox', 'Mentions, decisions, client updates, files, and delivery conversations attached to work.'],
  [Radar, 'Risk radar', 'Overdue dependencies, capacity pressure, stale tasks, and blocked milestone progress.'],
  [UsersRound, 'Resource map', 'Ownership gaps, workload pressure, allocation, and active contributor load.'],
];

const launchItems = [
  'Create roles for admins, project managers, delivery owners, and contributors.',
  'Define project statuses, task lanes, priority rules, and milestone naming.',
  'Prepare templates for discovery, implementation, QA, launch, and support.',
  'Connect calendar, inbox, meeting, and task notification flows.',
  'Review client visibility, file handling, audit needs, and handoff rules.',
];

function WebfudgeFlowMark() {
  return (
    <div className="relative grid h-11 w-11 place-items-center overflow-hidden rounded-2xl bg-[#07111f] shadow-[0_18px_60px_rgba(14,165,233,0.18)]" aria-label="Webfudge Flow">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(56,189,248,0.65),transparent_42%),radial-gradient(circle_at_80%_72%,rgba(167,139,250,0.62),transparent_45%)]" />
      <svg viewBox="0 0 44 44" className="relative h-8 w-8" aria-hidden="true">
        <path d="M8 13 13.8 31 22 15.5 30.1 31 36 13" fill="none" stroke="#f8fafc" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
        <path d="M15 13h15" stroke="#99f6e4" strokeLinecap="round" strokeWidth="3" />
      </svg>
    </div>
  );
}

function FlowRiver({ activePhase }) {
  return (
    <div className="relative min-h-[26rem] overflow-hidden rounded-[2.25rem] border border-slate-900/10 bg-[#07111f] p-5 text-white shadow-[0_34px_110px_rgba(15,23,42,0.22)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(56,189,248,0.35),transparent_28%),radial-gradient(circle_at_80%_72%,rgba(167,139,250,0.28),transparent_34%)]" />
      <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-white/12 to-transparent" />
      <div className="relative flex items-center justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-sky-100/55">Live delivery river</p>
          <h2 className="mt-2 text-2xl font-black tracking-[-0.04em]">Milestones in motion</h2>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-slate-950">Buttery</span>
      </div>

      <div className="relative mt-7 h-64">
        <svg viewBox="0 0 560 260" className="absolute inset-0 h-full w-full" aria-hidden="true">
          <path d="M20 188 C96 38 154 226 250 96 C336 -18 414 170 540 44" fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="34" strokeLinecap="round" />
          <path d="M20 188 C96 38 154 226 250 96 C336 -18 414 170 540 44" fill="none" stroke="url(#flow-river-gradient)" strokeWidth="18" strokeLinecap="round" strokeDasharray="90 620" style={{ animation: 'ff-river 3.8s cubic-bezier(.16,1,.3,1) infinite' }} />
          <defs>
            <linearGradient id="flow-river-gradient" x1="20" x2="540" y1="188" y2="44" gradientUnits="userSpaceOnUse">
              <stop stopColor="#38bdf8" />
              <stop offset="0.36" stopColor="#a78bfa" />
              <stop offset="0.7" stopColor="#34d399" />
              <stop offset="1" stopColor="#fbbf24" />
            </linearGradient>
          </defs>
        </svg>

        {phases.map((phase, index) => {
          const points = [
            'left-[4%] top-[62%]',
            'left-[25%] top-[26%]',
            'left-[45%] top-[54%]',
            'left-[65%] top-[20%]',
            'left-[82%] top-[42%]',
          ];
          const isActive = activePhase === index;

          return (
            <div
              key={phase.label}
              className={`absolute ${points[index]} -translate-x-1/2 -translate-y-1/2 transition duration-500 ${isActive ? 'scale-110' : 'scale-95 opacity-70'}`}
            >
              <div className="grid h-14 w-14 place-items-center rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl" style={{ boxShadow: isActive ? `0 0 42px ${phase.color}55` : undefined }}>
                <span className="h-4 w-4 rounded-full" style={{ backgroundColor: phase.color }} />
              </div>
              <p className="mt-2 text-center text-[10px] font-black uppercase tracking-[0.12em] text-white/65">{phase.label}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PhasePanel({ activePhase, setActivePhase }) {
  const phase = phases[activePhase];

  return (
    <div className="rounded-[2rem] border border-slate-900/10 bg-white/75 p-4 shadow-[0_24px_80px_rgba(15,23,42,0.1)] backdrop-blur-2xl">
      <div className="flex flex-wrap gap-2">
        {phases.map((item, index) => (
          <button
            key={item.label}
            type="button"
            onClick={() => setActivePhase(index)}
            className={`rounded-full px-3.5 py-2 text-[11px] font-black uppercase tracking-[0.14em] transition duration-300 ${
              activePhase === index ? 'bg-slate-950 text-white shadow-[0_12px_34px_rgba(15,23,42,0.18)]' : 'bg-slate-950/5 text-slate-500 hover:bg-slate-950/10'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-5 overflow-hidden rounded-[1.6rem] bg-slate-950 p-5 text-white">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-white/35">Selected flow</p>
            <h3 className="mt-2 text-2xl font-black tracking-[-0.04em]">{phase.title}</h3>
          </div>
          <span className="rounded-2xl px-3 py-2 font-mono text-2xl font-black text-slate-950" style={{ backgroundColor: phase.color }}>
            {phase.metric}
          </span>
        </div>
        <p className="mt-4 text-sm leading-6 text-slate-300">{phase.note}</p>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${24 + activePhase * 18}%`, backgroundColor: phase.color }} />
        </div>
      </div>
    </div>
  );
}

function SprintBoard() {
  return (
    <div className="grid gap-3 lg:grid-cols-4">
      {lanes.map((lane, laneIndex) => (
        <article key={lane.title} className="rounded-[1.8rem] border border-slate-900/10 bg-white/72 p-3 shadow-[0_20px_70px_rgba(15,23,42,0.08)] backdrop-blur-xl transition duration-300 hover:-translate-y-1">
          <div className={`mb-3 rounded-[1.3rem] bg-gradient-to-br ${lane.accent} p-3 text-slate-950`}>
            <p className="text-lg font-black">{lane.title}</p>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] opacity-55">{lane.hint}</p>
          </div>
          <div className="space-y-2">
            {lane.cards.map((card, cardIndex) => (
              <div key={card} className="rounded-[1.15rem] border border-slate-900/8 bg-slate-950/[0.035] p-3" style={{ animation: `ff-float ${5 + laneIndex * 0.35 + cardIndex * 0.25}s ease-in-out infinite` }}>
                <p className="text-sm font-black text-slate-950">{card}</p>
                <div className="mt-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                  <Clock3 className="h-3 w-3" />
                  Smooth handoff
                </div>
              </div>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}

export default function FudgeFlowLiquidStudio({ fileName }) {
  const [activePhase, setActivePhase] = useState(0);
  const [activeModule, setActiveModule] = useState(0);
  const ActiveIcon = modules[activeModule][0];

  return (
    <main className="min-h-screen overflow-hidden bg-[#f6f2ea] text-slate-950">
      <style>{`
        @keyframes ff-river { from { stroke-dashoffset: 720; } to { stroke-dashoffset: 0; } }
        @keyframes ff-drift { 0%, 100% { transform: translate3d(0,0,0) rotate(0deg); } 50% { transform: translate3d(18px,-18px,0) rotate(2deg); } }
        @keyframes ff-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes ff-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        @keyframes ff-sheen { 0% { transform: translateX(-130%); opacity: 0; } 22% { opacity: 1; } 100% { transform: translateX(230%); opacity: 0; } }
        html { scroll-behavior: smooth; }
      `}</style>

      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -left-24 top-10 h-96 w-96 rounded-full bg-sky-300/35 blur-3xl" style={{ animation: 'ff-drift 12s ease-in-out infinite' }} />
        <div className="absolute right-0 top-28 h-[28rem] w-[28rem] rounded-full bg-violet-300/30 blur-3xl" style={{ animation: 'ff-drift 15s ease-in-out infinite reverse' }} />
        <div className="absolute bottom-0 left-1/3 h-96 w-96 rounded-full bg-emerald-200/38 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(15,23,42,0.05)_1px,transparent_1px),linear-gradient(25deg,rgba(15,23,42,0.04)_1px,transparent_1px)] bg-[size:76px_76px]" />
      </div>

      <header className="relative mx-auto flex max-w-[98rem] items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <a href="/applications/pm" className="flex items-center gap-3 rounded-full border border-slate-950/10 bg-white/70 px-3 py-2 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl">
          <WebfudgeFlowMark />
          <div>
            <p className="text-sm font-black leading-none">Webfudge</p>
            <p className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Flow studio</p>
          </div>
        </a>
        <nav className="hidden items-center gap-2 rounded-full border border-slate-950/10 bg-white/70 p-1.5 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl md:flex">
          {[
            ['Map', '#map'],
            ['Board', '#board'],
            ['Modules', '#modules'],
            ['Launch', '#launch'],
          ].map(([label, href]) => (
            <a key={href} href={href} className="rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-slate-500 transition hover:bg-slate-950 hover:text-white">
              {label}
            </a>
          ))}
        </nav>
      </header>

      <section className="relative mx-auto grid min-h-[calc(100vh-5.5rem)] max-w-[98rem] items-center gap-5 px-4 pb-8 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
        <div className="relative overflow-hidden rounded-[2.6rem] border border-slate-950/10 bg-white/72 p-6 shadow-[0_34px_120px_rgba(15,23,42,0.12)] backdrop-blur-2xl md:p-9">
          <div className="absolute inset-y-0 left-0 w-28 bg-sky-300/30 blur-3xl" style={{ animation: 'ff-sheen 5.2s ease-in-out infinite' }} />
          <div className="relative">
            <div className="mb-8 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-slate-950 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-white">/{fileName}</span>
              <span className="rounded-full border border-slate-950/10 bg-white px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Delivery OS</span>
            </div>
            <p className="mb-4 text-xs font-black uppercase tracking-[0.28em] text-sky-600">Project motion design</p>
            <h1 className="max-w-4xl text-6xl font-black leading-[0.88] tracking-[-0.07em] md:text-7xl xl:text-8xl">
              Delivery that moves like water.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-slate-600">
              Fudge Flow turns scope, tasks, milestones, blockers, calendar pressure, and launch handoffs into one smooth delivery surface.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href="#map" className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-6 py-3.5 text-xs font-black uppercase tracking-[0.15em] text-white transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_50px_rgba(15,23,42,0.25)]">
                Open flow map
                <Route className="h-4 w-4" />
              </a>
              <a href="#board" className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-950/10 bg-white px-6 py-3.5 text-xs font-black uppercase tracking-[0.15em] text-slate-950 transition duration-300 hover:-translate-y-1">
                View sprint board
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>

        <FlowRiver activePhase={activePhase} />
      </section>

      <section className="relative overflow-hidden border-y border-slate-950/10 bg-slate-950 py-3 text-white">
        <div className="flex w-max gap-10 whitespace-nowrap text-xs font-black uppercase tracking-[0.22em]" style={{ animation: 'ff-marquee 24s linear infinite' }}>
          {[...Array(2)].map((_, index) => (
            <div key={index} className="flex gap-10">
              <span>24 live projects</span>
              <span>137 active tasks</span>
              <span>18 dependency links</span>
              <span>7 risk reviews</span>
              <span>4 launch gates</span>
              <span>92% handoff clarity</span>
            </div>
          ))}
        </div>
      </section>

      <section id="map" className="relative mx-auto grid max-w-[98rem] gap-5 px-4 py-8 sm:px-6 lg:grid-cols-[0.78fr_1.22fr] lg:px-8">
        <PhasePanel activePhase={activePhase} setActivePhase={setActivePhase} />
        <div className="rounded-[2rem] border border-slate-950/10 bg-white/70 p-5 shadow-[0_24px_90px_rgba(15,23,42,0.09)] backdrop-blur-2xl md:p-7">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-violet-500">Dependency choreography</p>
              <h2 className="mt-2 text-4xl font-black tracking-[-0.06em] md:text-5xl">No more hidden blockers.</h2>
            </div>
            <GitBranch className="h-9 w-9 text-violet-400" />
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {[
              [Target, 'Scope lock', 'Every task knows the outcome it supports.'],
              [Milestone, 'Milestone drift', 'Timeline pressure is visible before dates slip.'],
              [Zap, 'Manager nudge', 'Blocked work gets routed into review quickly.'],
            ].map(([Icon, title, body]) => (
              <article key={title} className="rounded-[1.5rem] border border-slate-950/10 bg-slate-950 p-4 text-white transition duration-300 hover:-translate-y-1">
                <Icon className="mb-6 h-6 w-6 text-sky-300" />
                <h3 className="text-lg font-black">{title}</h3>
                <p className="mt-2 text-xs leading-5 text-slate-300">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="board" className="relative mx-auto max-w-[98rem] px-4 pb-8 sm:px-6 lg:px-8">
        <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-600">Sprint board</p>
            <h2 className="mt-2 text-5xl font-black tracking-[-0.07em]">A soft board with sharp signals.</h2>
          </div>
          <Workflow className="h-10 w-10 text-slate-950/30" />
        </div>
        <SprintBoard />
      </section>

      <section id="modules" className="relative mx-auto grid max-w-[98rem] gap-5 px-4 pb-8 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
        <div className="grid gap-3 sm:grid-cols-2">
          {modules.map(([Icon, title, body], index) => (
            <button
              key={title}
              type="button"
              onClick={() => setActiveModule(index)}
              className={`rounded-[1.7rem] border p-4 text-left shadow-[0_18px_70px_rgba(15,23,42,0.07)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 ${
                activeModule === index ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-950/10 bg-white/72 text-slate-950'
              }`}
            >
              <Icon className={`mb-5 h-6 w-6 ${activeModule === index ? 'text-sky-300' : 'text-violet-500'}`} />
              <h3 className="text-xl font-black">{title}</h3>
              <p className={`mt-2 text-xs leading-5 ${activeModule === index ? 'text-slate-300' : 'text-slate-500'}`}>{body}</p>
            </button>
          ))}
        </div>

        <div className="rounded-[2rem] border border-slate-950/10 bg-slate-950 p-5 text-white shadow-[0_30px_110px_rgba(15,23,42,0.22)]">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-sky-200/55">Active module</p>
              <h3 className="mt-2 text-3xl font-black tracking-[-0.05em]">{modules[activeModule][1]}</h3>
            </div>
            <ActiveIcon className="h-9 w-9 text-sky-300" />
          </div>
          <div className="rounded-[1.35rem] bg-white/[0.07] p-4">
            <pre className="overflow-x-auto text-xs leading-6 text-sky-50">
              <code>{`const task = await flow.tasks.create({
  projectId: 'proj_fudgeflow_42',
  title: 'Build milestone health widget',
  assignee: 'delivery@webfudge.com',
  priority: 'high',
  lane: '${phases[activePhase].label.toLowerCase()}'
});`}</code>
            </pre>
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-300">
            Click any module or phase. The documentation behaves like a product surface, so teams learn by touching the workflow.
          </p>
        </div>
      </section>

      <section id="launch" className="relative mx-auto max-w-[98rem] px-4 pb-10 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-[2.4rem] bg-white shadow-[0_34px_120px_rgba(15,23,42,0.12)]">
          <div className="grid lg:grid-cols-[0.72fr_1.28fr]">
            <div className="relative bg-slate-950 p-7 text-white">
              <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-sky-300/20 blur-3xl" />
              <CheckCircle2 className="relative mb-8 h-9 w-9 text-emerald-300" />
              <p className="relative text-[11px] font-black uppercase tracking-[0.22em] text-white/45">Launch readiness</p>
              <h2 className="relative mt-3 text-5xl font-black leading-[0.95] tracking-[-0.07em]">Make the handoff feel calm.</h2>
            </div>
            <div className="p-5 md:p-7">
              <div className="grid gap-3">
                {launchItems.map((item, index) => (
                  <div key={item} className="flex gap-3 rounded-[1.4rem] border border-slate-950/10 bg-[#f6f2ea] p-4">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-950 text-xs font-black text-white">{index + 1}</span>
                    <p className="text-sm font-semibold leading-6 text-slate-600">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
