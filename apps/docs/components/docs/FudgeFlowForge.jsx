'use client';

import { useState } from 'react';
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  GitBranch,
  KanbanSquare,
  MessageSquareText,
  PanelTop,
  Radar,
  Route,
  UsersRound,
} from 'lucide-react';

const phases = [
  {
    num: '01',
    label: 'Scope',
    color: '#F97316',
    headline: 'Shape every sprint before it starts.',
    body: 'Goals, owners, acceptance criteria, and delivery windows become a single brief every contributor reads before the first task is created.',
    tasks: ['Write project brief', 'Define scope boundaries', 'Assign owner roster', 'Set acceptance criteria'],
    stat: '24',
    statLabel: 'avg tasks per sprint',
  },
  {
    num: '02',
    label: 'Sequence',
    color: '#8B5CF6',
    headline: 'Connect work before motion starts.',
    body: 'Milestones, blockers, handoffs, and due dates form a dependency graph that shows what must move first and where pressure is building.',
    tasks: ['Map task dependencies', 'Set milestone dates', 'Link blocker chains', 'Create handoff points'],
    stat: '18',
    statLabel: 'avg dependency links',
  },
  {
    num: '03',
    label: 'Execute',
    color: '#3B82F6',
    headline: 'Track every task in flight.',
    body: 'Assignments, priority, progress, comments, files, and checklists stay attached to the work — not scattered across threads and inboxes.',
    tasks: ['Run daily standup view', 'Update task progress', 'Log blockers early', 'Review sprint velocity'],
    stat: '137',
    statLabel: 'active tasks',
  },
  {
    num: '04',
    label: 'Review',
    color: '#EF4444',
    headline: 'Catch drift before it becomes a delay.',
    body: 'Risk signals, QA gates, stale updates, and overdue blockers surface before they miss the milestone — not after the damage is done.',
    tasks: ['Review risk radar', 'Run QA checklist', 'Resolve stale tasks', 'Manager sign-off'],
    stat: '7',
    statLabel: 'risk signals tracked',
  },
  {
    num: '05',
    label: 'Release',
    color: '#10B981',
    headline: 'Ship with proof, not hope.',
    body: 'Launch notes, handoffs, client approvals, and support context close the delivery loop so nothing disappears after the code ships.',
    tasks: ['Write release notes', 'Record client handoff', 'Log approval decisions', 'Archive sprint context'],
    stat: '92%',
    statLabel: 'handoff clarity score',
  },
];

const ganttRows = [
  { label: 'Discovery & scope', pct: 100, status: 'done', owner: 'MA' },
  { label: 'Design system tokens', pct: 78, status: 'active', owner: 'PR' },
  { label: 'Milestone health widget', pct: 64, status: 'active', owner: 'KA' },
  { label: 'Calendar sync API', pct: 42, status: 'active', owner: 'AR' },
  { label: 'QA gate pass', pct: 0, status: 'blocked', owner: 'NI' },
  { label: 'Client handoff notes', pct: 0, status: 'pending', owner: 'DE' },
];

const STATUS_COLOR = {
  done: '#10B981',
  active: '#3B82F6',
  blocked: '#EF4444',
  pending: '#9CA3AF',
};

const modules = [
  [PanelTop, 'Delivery dashboard', 'Health, velocity, overdue work, blocked tasks, milestone drift.'],
  [KanbanSquare, 'Task board', 'Kanban lanes with owners, priority, progress, comments, and files.'],
  [CalendarDays, 'Timeline studio', 'Milestone windows, release dates, meetings, and sprint commitments.'],
  [MessageSquareText, 'Team inbox', 'Mentions, decisions, client updates, and delivery conversations.'],
  [Radar, 'Risk radar', 'Overdue dependencies, capacity pressure, and blocked milestone progress.'],
  [UsersRound, 'Resource map', 'Ownership gaps, workload pressure, and active contributor allocation.'],
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
    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0C0A09]" aria-label="Webfudge">
      <svg viewBox="0 0 36 36" className="h-6 w-6" aria-hidden="true">
        <path
          d="M5 10 11 29 18 13 25 29 31 10"
          fill="none"
          stroke="white"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="3.5"
        />
        <path d="M12 10h14" stroke="#F97316" strokeLinecap="round" strokeWidth="2.5" />
      </svg>
    </div>
  );
}

function GanttStrip({ activeRow, setActiveRow }) {
  return (
    <div className="space-y-2.5">
      {ganttRows.map((row, i) => {
        const color = STATUS_COLOR[row.status];
        const isActive = activeRow === i;
        return (
          <button
            key={row.label}
            type="button"
            onClick={() => setActiveRow(isActive ? null : i)}
            className={`w-full rounded-[1.2rem] border p-4 text-left transition duration-300 ${
              isActive
                ? 'border-[#0C0A09] bg-[#0C0A09] shadow-[0_12px_40px_rgba(12,10,9,0.22)]'
                : 'border-black/10 bg-white hover:border-black/22 hover:-translate-y-0.5'
            }`}
          >
            <div className="mb-2.5 flex items-center justify-between gap-3">
              <span className={`text-sm font-black ${isActive ? 'text-white' : 'text-[#0C0A09]'}`}>
                {row.label}
              </span>
              <div className="flex items-center gap-2">
                <span
                  className="grid h-6 w-6 place-items-center rounded-full text-[9px] font-black text-white"
                  style={{ backgroundColor: color }}
                >
                  {row.owner}
                </span>
                <span className="font-mono text-xs font-black" style={{ color }}>
                  {row.pct}%
                </span>
              </div>
            </div>
            <div
              className="h-2 overflow-hidden rounded-full"
              style={{ backgroundColor: isActive ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.07)' }}
            >
              {row.pct > 0 && (
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${row.pct}%`,
                    backgroundColor: color,
                    transformOrigin: 'left',
                    animation: `ff-bar-grow ${0.45 + i * 0.08}s ${i * 0.07}s cubic-bezier(.34,1.56,.64,1) both`,
                  }}
                />
              )}
            </div>
            {isActive && row.pct === 0 && (
              <p className="mt-2 text-xs font-bold" style={{ color }}>
                {row.status === 'blocked' ? 'Blocked — needs manager review before sprint can close.' : 'Pending — not yet started.'}
              </p>
            )}
          </button>
        );
      })}
    </div>
  );
}

function PhaseAccordion() {
  const [open, setOpen] = useState(0);
  const p = phases[open];

  return (
    <div className="overflow-hidden rounded-[2rem] border border-black/10 bg-white shadow-[0_24px_90px_rgba(12,10,9,0.08)]">
      <div className="flex border-b border-black/10 overflow-x-auto">
        {phases.map((ph, i) => (
          <button
            key={ph.num}
            type="button"
            onClick={() => setOpen(i)}
            className="flex-1 min-w-[5rem] py-4 text-center text-xs font-black uppercase tracking-[0.14em] transition duration-200"
            style={{
              color: open === i ? ph.color : '#9CA3AF',
              borderBottom: `2.5px solid ${open === i ? ph.color : 'transparent'}`,
            }}
          >
            <span className="hidden sm:inline">{ph.label}</span>
            <span className="sm:hidden">{ph.num}</span>
          </button>
        ))}
      </div>
      <div className="grid gap-5 p-5 md:p-7 lg:grid-cols-[1fr_10rem] lg:items-start">
        <div>
          <p
            className="text-[11px] font-black uppercase tracking-[0.24em]"
            style={{ color: p.color }}
          >
            {p.num} · {p.label}
          </p>
          <h3 className="mt-2 text-3xl font-black tracking-[-0.055em] text-[#0C0A09]">{p.headline}</h3>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-500">{p.body}</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {p.tasks.map((t) => (
              <div key={t} className="flex items-center gap-2 text-sm font-semibold text-[#0C0A09]">
                <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ backgroundColor: p.color }} />
                {t}
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col items-center justify-center rounded-[1.5rem] border border-black/10 bg-[#FEFAF4] px-5 py-5 text-center">
          <span className="text-5xl font-black tracking-[-0.05em]" style={{ color: p.color }}>
            {p.stat}
          </span>
          <span className="mt-2 text-[10px] font-black uppercase tracking-[0.18em] text-gray-400">
            {p.statLabel}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function FudgeFlowForge({ fileName }) {
  const [activeRow, setActiveRow] = useState(null);

  return (
    <main className="min-h-screen overflow-hidden bg-[#FEFAF4] text-[#0C0A09]">
      <style>{`
        @keyframes ff-bar-grow { from { transform: scaleX(0); } }
        @keyframes ff-ticker { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes ff-orb-slow { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(28px, -28px); } }
        @keyframes ff-ping-soft { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(1.4); } }
        html { scroll-behavior: smooth; }
      `}</style>

      {/* Ambient background — warm, nothing like Grow's neon grid */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="absolute right-0 top-0 h-[40rem] w-[40rem] rounded-full bg-orange-100/90 blur-3xl"
          style={{ animation: 'ff-orb-slow 18s ease-in-out infinite' }}
        />
        <div className="absolute -bottom-20 -left-10 h-[30rem] w-[30rem] rounded-full bg-violet-100/80 blur-3xl" />
        <div className="absolute left-1/3 top-1/2 h-[20rem] w-[20rem] rounded-full bg-emerald-100/60 blur-3xl" />
        {/* Subtle dot grid — not animated, not a line grid */}
        <div className="absolute inset-0 bg-[radial-gradient(#0C0A09_1px,transparent_1px)] bg-[size:44px_44px] opacity-[0.03]" />
      </div>

      {/* Top header — no side rail, just a floating top bar */}
      <header className="relative mx-auto flex max-w-[96rem] items-center justify-between px-5 py-4 sm:px-8">
        <a href="/applications/pm" className="flex items-center gap-3">
          <WebfudgeFlowMark />
          <div>
            <p className="text-sm font-black leading-none">Webfudge</p>
            <p className="mt-0.5 text-[10px] font-black uppercase tracking-[0.15em] text-gray-400">Fudge Flow</p>
          </div>
        </a>
        <nav className="hidden items-center gap-1 rounded-full border border-black/10 bg-white p-1.5 shadow-sm md:flex">
          {[['Map', '#map'], ['Board', '#board'], ['Modules', '#modules'], ['Launch', '#launch']].map(([label, href]) => (
            <a
              key={href}
              href={href}
              className="rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-gray-500 transition duration-200 hover:bg-[#0C0A09] hover:text-white"
            >
              {label}
            </a>
          ))}
        </nav>
        <span className="rounded-full border border-black/10 bg-white px-4 py-2 font-mono text-xs font-black text-gray-400 shadow-sm">
          /{fileName}
        </span>
      </header>

      {/* ── HERO: full-width centered headline, no side panel ── */}
      <section className="relative mx-auto max-w-[96rem] px-5 pb-6 pt-10 text-center sm:px-8">
        <div className="mx-auto mb-7 inline-flex items-center gap-2.5 rounded-full border border-orange-200 bg-orange-50 px-4 py-2">
          <span
            className="h-2 w-2 rounded-full bg-orange-500"
            style={{ animation: 'ff-ping-soft 2s ease-in-out infinite' }}
          />
          <span className="text-[11px] font-black uppercase tracking-[0.2em] text-orange-600">
            Project delivery OS · Fudge Flow
          </span>
        </div>

        <h1 className="mx-auto max-w-5xl text-6xl font-black leading-[0.88] tracking-[-0.07em] md:text-7xl xl:text-8xl">
          Work that moves.<br />Delivery that lands.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-gray-500">
          Fudge Flow turns scope, tasks, milestones, blockers, and launch handoffs into one visible delivery surface — no scattered updates, no deadline surprises.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a
            href="#map"
            className="inline-flex items-center gap-2.5 rounded-full bg-[#0C0A09] px-6 py-3.5 text-xs font-black uppercase tracking-[0.15em] text-white transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_50px_rgba(12,10,9,0.2)]"
          >
            Delivery map
            <Route className="h-4 w-4" />
          </a>
          <a
            href="#board"
            className="inline-flex items-center gap-2.5 rounded-full border border-black/12 bg-white px-6 py-3.5 text-xs font-black uppercase tracking-[0.15em] text-[#0C0A09] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(12,10,9,0.1)]"
          >
            Sprint board
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>

        {/* Three stats — clean, no card treatment */}
        <div className="mx-auto mt-10 mb-8 flex max-w-sm justify-center gap-10 border-t border-black/10 pt-8">
          {[['137', 'Active tasks', '#3B82F6'], ['24', 'Live projects', '#F97316'], ['92%', 'Handoff score', '#10B981']].map(
            ([num, label, color]) => (
              <div key={label}>
                <p className="text-3xl font-black tracking-[-0.04em]" style={{ color }}>
                  {num}
                </p>
                <p className="mt-1 text-[10px] font-black uppercase tracking-[0.15em] text-gray-400">{label}</p>
              </div>
            ),
          )}
        </div>
      </section>

      {/* ── GANTT: full-width card — the hero artifact ── */}
      <section className="relative mx-auto max-w-[96rem] px-5 pb-8 sm:px-8">
        <div className="overflow-hidden rounded-[2.4rem] border border-black/10 bg-white p-5 shadow-[0_30px_100px_rgba(12,10,9,0.1)] md:p-8">
          <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-orange-500">Live delivery map</p>
              <h2 className="mt-2 text-4xl font-black tracking-[-0.06em]">Sprint in progress.</h2>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {Object.entries(STATUS_COLOR).map(([status, color]) => (
                <div key={status} className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-[10px] font-black uppercase tracking-[0.12em] text-gray-400">{status}</span>
                </div>
              ))}
              <span className="rounded-full bg-[#0C0A09] px-3 py-1.5 text-[11px] font-black text-white">
                Week 3 / 6
              </span>
            </div>
          </div>
          <GanttStrip activeRow={activeRow} setActiveRow={setActiveRow} />
        </div>
      </section>

      {/* ── TICKER: dark bar ── */}
      <section className="relative overflow-hidden border-y border-black/10 bg-[#0C0A09] py-3.5 text-white">
        <div
          className="flex w-max gap-12 whitespace-nowrap text-xs font-black uppercase tracking-[0.22em]"
          style={{ animation: 'ff-ticker 26s linear infinite' }}
        >
          {[...Array(2)].map((_, i) => (
            <div key={i} className="flex gap-12">
              {['24 live projects', '137 active tasks', '18 dependency links', '7 risk signals', '4 launch gates', '92% handoff clarity'].map(
                (s) => <span key={s}>{s}</span>,
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── PHASE ACCORDION: completely different from Grow's metric chips ── */}
      <section id="map" className="relative mx-auto max-w-[96rem] px-5 py-10 sm:px-8">
        <p className="mb-2 text-[11px] font-black uppercase tracking-[0.24em] text-orange-500">Delivery phases</p>
        <h2 className="mb-7 text-5xl font-black tracking-[-0.07em]">Five moves. One clean ship.</h2>
        <PhaseAccordion />
      </section>

      {/* ── SPRINT: velocity history + risk panel ── */}
      <section id="board" className="relative mx-auto max-w-[96rem] px-5 pb-10 sm:px-8">
        <p className="mb-2 text-[11px] font-black uppercase tracking-[0.24em] text-violet-600">Sprint visibility</p>
        <h2 className="mb-7 text-5xl font-black tracking-[-0.07em]">Every task, visible, every day.</h2>
        <div className="grid gap-4 lg:grid-cols-[1fr_0.6fr]">
          {/* Velocity chart */}
          <div className="rounded-[2rem] border border-black/10 bg-white p-5 shadow-[0_18px_60px_rgba(12,10,9,0.07)] md:p-7">
            <p className="mb-6 text-[11px] font-black uppercase tracking-[0.22em] text-gray-400">Sprint velocity history</p>
            <div className="space-y-3.5">
              {[
                ['Sprint 1', 82, '#10B981'],
                ['Sprint 2', 91, '#10B981'],
                ['Sprint 3', 64, '#F97316'],
                ['Sprint 4', 55, '#EF4444'],
                ['Sprint 5', 78, '#3B82F6'],
                ['Sprint 6 (live)', 38, '#8B5CF6'],
              ].map(([name, val, color]) => (
                <div key={name} className="flex items-center gap-3">
                  <span className="w-28 shrink-0 text-right text-xs font-bold text-gray-400">{name}</span>
                  <div className="h-5 flex-1 overflow-hidden rounded-full" style={{ backgroundColor: 'rgba(0,0,0,0.06)' }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${val}%`,
                        backgroundColor: color,
                        transformOrigin: 'left',
                        animation: `ff-bar-grow 0.6s cubic-bezier(.34,1.56,.64,1) both`,
                      }}
                    />
                  </div>
                  <span className="w-8 shrink-0 text-right text-xs font-black" style={{ color }}>
                    {val}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Risk panel */}
          <div className="flex flex-col gap-3">
            <div className="rounded-[2rem] bg-[#0C0A09] p-5 text-white shadow-[0_24px_80px_rgba(12,10,9,0.18)] md:p-6">
              <p className="mb-4 text-[11px] font-black uppercase tracking-[0.22em] text-white/40">Risk signals</p>
              <div className="space-y-2.5">
                {[
                  ['QA gate blocked', 'blocked', '#EF4444'],
                  ['Calendar sync delayed', 'at-risk', '#F97316'],
                  ['Resource gap · week 4', 'at-risk', '#F97316'],
                  ['Handoff notes pending', 'pending', '#9CA3AF'],
                ].map(([msg, level, color]) => (
                  <div
                    key={msg}
                    className="flex items-center gap-3 rounded-[1.1rem] border border-white/8 p-3.5"
                    style={{ backgroundColor: `${color}18` }}
                  >
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                    <span className="flex-1 text-xs font-bold text-white/80">{msg}</span>
                    <span className="text-[9px] font-black uppercase tracking-[0.14em]" style={{ color }}>
                      {level}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-[2rem] border border-black/10 bg-white p-5 shadow-[0_18px_60px_rgba(12,10,9,0.07)]">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">Next milestone</p>
              <p className="mt-2 text-2xl font-black tracking-[-0.04em]">QA sign-off</p>
              <p className="mt-1 text-xs font-semibold text-gray-400">July 18 · 6 days ahead of schedule</p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/8">
                <div className="h-full w-[72%] rounded-full bg-emerald-500" style={{ transformOrigin: 'left', animation: 'ff-bar-grow 0.7s cubic-bezier(.34,1.56,.64,1) both' }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── MODULES: hover-invert cards, no "select and reveal" panel ── */}
      <section id="modules" className="relative mx-auto max-w-[96rem] px-5 pb-10 sm:px-8">
        <p className="mb-2 text-[11px] font-black uppercase tracking-[0.24em] text-emerald-600">Workspace modules</p>
        <h2 className="mb-7 text-5xl font-black tracking-[-0.07em]">Six surfaces. One delivery rhythm.</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map(([Icon, title, body]) => (
            <article
              key={title}
              className="group cursor-default rounded-[1.8rem] border border-black/10 bg-white p-5 shadow-[0_12px_50px_rgba(12,10,9,0.05)] transition duration-300 hover:-translate-y-1 hover:border-[#0C0A09] hover:bg-[#0C0A09] hover:shadow-[0_24px_80px_rgba(12,10,9,0.18)]"
            >
              <Icon className="mb-5 h-6 w-6 text-orange-500 transition-colors duration-300 group-hover:text-orange-300" />
              <h3 className="text-xl font-black text-[#0C0A09] transition-colors duration-300 group-hover:text-white">
                {title}
              </h3>
              <p className="mt-2 text-xs leading-5 text-gray-500 transition-colors duration-300 group-hover:text-gray-300">
                {body}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* ── API: full-width horizontal split ── */}
      <section className="relative mx-auto max-w-[96rem] px-5 pb-10 sm:px-8">
        <div className="overflow-hidden rounded-[2rem] border border-black/10 bg-white shadow-[0_24px_90px_rgba(12,10,9,0.07)]">
          <div className="grid lg:grid-cols-[0.72fr_1.28fr]">
            <div className="border-r border-black/10 p-6 md:p-8">
              <p className="mb-3 text-[11px] font-black uppercase tracking-[0.22em] text-gray-400">API</p>
              <h3 className="text-3xl font-black tracking-[-0.055em]">Automate delivery context.</h3>
              <p className="mt-3 text-sm leading-7 text-gray-500">
                Connect CI pipelines, automation flows, or external tools. Tasks, projects, milestones, and risks all have write endpoints.
              </p>
              <div className="mt-5 flex items-center gap-2">
                <GitBranch className="h-5 w-5 text-violet-500" />
                <span className="text-xs font-black text-gray-400">REST · webhooks · SDK</span>
              </div>
            </div>
            <div className="bg-[#0C0A09] p-6 md:p-8">
              <pre className="overflow-x-auto text-xs leading-7 text-emerald-300">
                <code>{`const task = await flow.tasks.create({
  projectId: 'proj_fudgeflow_42',
  title: 'Build milestone health widget',
  assignee: 'delivery@webfudge.com',
  priority: 'high',
  dueDate: '2026-07-18',
  checklist: [
    'Design states',
    'Connect API',
    'QA edge cases'
  ]
});`}</code>
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* ── LAUNCH CHECKLIST ── */}
      <section id="launch" className="relative mx-auto max-w-[96rem] px-5 pb-12 sm:px-8">
        <div className="overflow-hidden rounded-[2.4rem] bg-[#0C0A09] text-white">
          <div className="grid lg:grid-cols-[0.56fr_1.44fr]">
            <div className="relative border-r border-white/10 p-7 md:p-9">
              <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-orange-500/20 blur-3xl" />
              <CheckCircle2 className="relative mb-8 h-9 w-9 text-emerald-400" />
              <p className="relative text-[11px] font-black uppercase tracking-[0.22em] text-white/40">
                Before go-live
              </p>
              <h2 className="relative mt-3 text-5xl font-black leading-[0.95] tracking-[-0.07em]">
                Make the handoff feel calm.
              </h2>
            </div>
            <div className="p-5 md:p-7">
              <div className="grid gap-3">
                {launchItems.map((item, i) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 rounded-[1.35rem] border border-white/10 bg-white/[0.055] p-4"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-orange-500 text-xs font-black text-white">
                      {i + 1}
                    </span>
                    <p className="text-sm font-semibold leading-6 text-white/75">{item}</p>
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
