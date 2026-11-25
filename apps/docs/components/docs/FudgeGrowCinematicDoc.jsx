import {
  Activity,
  ArrowRight,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  Code2,
  Database,
  KanbanSquare,
  MailCheck,
  MessageSquareText,
  PhoneCall,
  Radar,
  Sparkles,
  Target,
  Trophy,
  UsersRound,
  Zap,
} from 'lucide-react';

const pipelineStages = [
  { label: 'Signal', value: '2,847', note: 'new buying signals', tone: 'from-fuchsia-400 to-orange-300' },
  { label: 'Qualified', value: '684', note: 'owner-ready leads', tone: 'from-orange-300 to-amber-200' },
  { label: 'Pipeline', value: '$1.8M', note: 'weighted value', tone: 'from-amber-200 to-lime-200' },
  { label: 'Closing', value: '42', note: 'decision-stage deals', tone: 'from-lime-200 to-emerald-300' },
];

const dealRows = [
  ['Acme Manufacturing', '$240K', 'Proposal', '82%', 'Priya Shah'],
  ['Northstar Retail', '$96K', 'Discovery', '54%', 'Kabir Mehta'],
  ['Helio Foods', '$410K', 'Negotiation', '73%', 'Maya Iyer'],
  ['Vertex Labs', '$128K', 'Review', '61%', 'Arjun Rao'],
];

const commandModules = [
  [Radar, 'Signal Radar', 'Campaigns, forms, referrals, imports, and manual leads turn into one visible demand stream.'],
  [UsersRound, 'Relationship Rooms', 'Companies, stakeholders, notes, meetings, calls, and proposals stay attached to account context.'],
  [KanbanSquare, 'Deal Theater', 'Stage movement, confidence, value, proposal state, close date, and deal risk are visible at once.'],
  [CalendarClock, 'Follow-Up Engine', 'Meeting prep, overdue tasks, call reminders, and next-best actions keep revenue moving.'],
  [BarChart3, 'Forecast Lens', 'Managers see weighted value, stalled opportunities, rep performance, and conversion health.'],
  [Activity, 'Timeline Evidence', 'Every call, note, email, proposal event, and stage change creates an audit-ready activity trail.'],
];

const salesLoop = [
  ['01', 'Capture', 'Centralize demand from every source before ownership gets messy.'],
  ['02', 'Prioritize', 'Score urgency, source quality, relationship depth, and revenue potential.'],
  ['03', 'Advance', 'Move opportunities with stage rules, activities, proposals, and next actions.'],
  ['04', 'Forecast', 'Read stage health, stuck deals, weighted value, and close confidence.'],
  ['05', 'Win', 'Convert the full context into customer handoff and follow-up history.'],
];

const launchChecklist = [
  'Define lead sources, qualification score, owner routing, and response SLA.',
  'Create pipeline stages with clear exit criteria and proposal states.',
  'Import companies, contacts, leads, activities, and ownership fields cleanly.',
  'Prepare manager dashboards for stuck deals, close dates, and weighted value.',
  'Review role access, customer visibility, audit history, and data hygiene rules.',
];

function Sparkline({ points, color = '#fb923c' }) {
  return (
    <svg viewBox="0 0 96 28" className="h-7 w-24 overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="3"
      />
      <circle cx="88" cy="8" r="3.5" fill={color} />
    </svg>
  );
}

export default function FudgeGrowCinematicDoc({ app, fileName }) {
  return (
    <main className="min-h-screen overflow-hidden bg-[#070301] text-[#fff3df]">
      <style>{`
        @keyframes grow-drift {
          0%, 100% { transform: translate3d(0, 0, 0) rotate(0deg) scale(1); }
          50% { transform: translate3d(28px, -24px, 0) rotate(8deg) scale(1.08); }
        }
        @keyframes grow-scan {
          0% { transform: translateX(-120%); opacity: 0; }
          20% { opacity: 1; }
          100% { transform: translateX(220%); opacity: 0; }
        }
        @keyframes grow-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-14px); }
        }
        @keyframes grow-pulse {
          0%, 100% { opacity: .35; transform: scale(.96); }
          50% { opacity: 1; transform: scale(1.08); }
        }
        @keyframes grow-marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        html { scroll-behavior: smooth; }
      `}</style>

      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -left-32 top-[-12rem] h-[42rem] w-[42rem] rounded-full bg-orange-500/24 blur-[120px]" style={{ animation: 'grow-drift 12s ease-in-out infinite' }} />
        <div className="absolute right-[-15rem] top-[12rem] h-[46rem] w-[46rem] rounded-full bg-fuchsia-500/16 blur-[130px]" style={{ animation: 'grow-drift 15s ease-in-out infinite reverse' }} />
        <div className="absolute bottom-[-18rem] left-[30%] h-[42rem] w-[42rem] rounded-full bg-amber-300/12 blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.13)_1px,transparent_0)] bg-[size:32px_32px] opacity-25" />
        <div className="absolute inset-0 bg-[linear-gradient(115deg,transparent_0%,rgba(251,146,60,0.08)_42%,transparent_62%)]" />
      </div>

      <section id="hero" className="relative min-h-screen px-4 py-5 sm:px-6 lg:px-8">
        <nav className="mx-auto mb-6 flex max-w-[98rem] flex-wrap items-center justify-between gap-3 rounded-full border border-white/10 bg-white/[0.055] px-4 py-3 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-2xl">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-orange-400 text-sm font-black text-black">FG</span>
            <span className="font-mono text-xs font-black uppercase tracking-[0.18em] text-orange-100/58">/{fileName}</span>
          </div>
          <div className="hidden items-center gap-1 rounded-full border border-white/10 bg-black/20 p-1 text-xs font-black uppercase tracking-[0.14em] text-orange-100/58 md:flex">
            {[
              ['War Room', '#war-room'],
              ['Pipeline', '#pipeline'],
              ['Playbook', '#playbook'],
              ['Launch', '#launch'],
            ].map(([label, href]) => (
              <a key={href} href={href} className="rounded-full px-4 py-2 transition hover:bg-orange-300 hover:text-black">
                {label}
              </a>
            ))}
          </div>
          <a href="/applications/crm" className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-orange-100/65 transition hover:bg-white/12 hover:text-white">
            App overview
          </a>
        </nav>

        <div className="mx-auto grid max-w-[98rem] gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(28rem,0.82fr)] lg:items-stretch">
          <div className="relative overflow-hidden rounded-[3.2rem] border border-white/10 bg-[#140805]/88 p-7 shadow-[0_40px_140px_rgba(0,0,0,0.55)] backdrop-blur-2xl md:p-10 xl:p-14">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-200/70 to-transparent" />
            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-orange-400/20 blur-3xl" />
            <div className="relative">
              <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-orange-200/15 bg-orange-300/10 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-orange-200">
                <Sparkles className="h-4 w-4" />
                Fudge Grow revenue OS
              </div>
              <h1 className="max-w-6xl text-6xl font-black leading-[0.85] tracking-[-0.095em] text-white md:text-8xl xl:text-[8.8rem]">
                Stop reading docs. Enter the sales floor.
              </h1>
              <p className="mt-8 max-w-3xl text-lg leading-8 text-orange-100/64 md:text-xl">
                {app.description} This standalone experience is a cinematic revenue command center built around pipeline motion, deal context, and manager-grade sales signals.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <a href="#war-room" className="group inline-flex items-center justify-center gap-2 rounded-full bg-orange-300 px-7 py-4 text-sm font-black uppercase tracking-[0.14em] text-black shadow-[0_22px_70px_rgba(251,146,60,0.36)] transition hover:-translate-y-1">
                  Open war room
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </a>
                <a href="#pipeline" className="inline-flex items-center justify-center gap-2 rounded-full border border-orange-200/15 bg-white/[0.06] px-7 py-4 text-sm font-black uppercase tracking-[0.14em] text-orange-50 transition hover:-translate-y-1 hover:bg-white/10">
                  Watch pipeline
                  <Activity className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[3.2rem] border border-white/10 bg-orange-50 p-4 text-[#1c0a03] shadow-[0_40px_140px_rgba(0,0,0,0.42)]">
            <div className="absolute left-0 top-0 h-full w-1/2 bg-gradient-to-r from-orange-200/80 to-transparent" />
            <div className="relative rounded-[2.55rem] bg-[#120602] p-5 text-orange-50">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-200/45">Live deal board</p>
                  <h2 className="mt-1 text-3xl font-black tracking-[-0.05em]">Pipeline Health</h2>
                </div>
                <span className="rounded-full bg-emerald-300 px-3 py-1 text-xs font-black text-black">+18%</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {pipelineStages.map((stage) => (
                  <div key={stage.label} className="relative overflow-hidden rounded-[1.8rem] border border-white/10 bg-white/[0.07] p-4">
                    <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${stage.tone}`} />
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-orange-100/42">{stage.label}</p>
                    <p className="mt-3 text-4xl font-black">{stage.value}</p>
                    <p className="mt-1 text-sm text-orange-100/55">{stage.note}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-[1.8rem] border border-white/10 bg-black/30 p-4">
                <div className="mb-3 flex items-center justify-between text-xs font-black uppercase tracking-[0.18em] text-orange-100/38">
                  <span>Momentum</span>
                  <span>Q2</span>
                </div>
                <div className="relative h-28 overflow-hidden rounded-2xl bg-white/[0.05]">
                  <div className="absolute inset-y-0 left-0 w-20 bg-orange-200/10 blur-2xl" style={{ animation: 'grow-scan 3.8s ease-in-out infinite' }} />
                  <svg viewBox="0 0 420 120" className="h-full w-full">
                    <path d="M0 88 C60 82 78 34 132 48 C184 62 188 92 246 70 C306 46 322 20 420 30" fill="none" stroke="#fed7aa" strokeWidth="6" strokeLinecap="round" />
                    <path d="M0 88 C60 82 78 34 132 48 C184 62 188 92 246 70 C306 46 322 20 420 30 L420 120 L0 120 Z" fill="rgba(251,146,60,.18)" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden border-y border-white/10 bg-orange-300 py-4 text-black">
        <div className="flex w-max gap-8 whitespace-nowrap text-sm font-black uppercase tracking-[0.22em]" style={{ animation: 'grow-marquee 24s linear infinite' }}>
          {[...Array(2)].map((_, group) => (
            <div key={group} className="flex gap-8">
              <span>Lead captured</span>
              <span>Deal advanced</span>
              <span>Proposal sent</span>
              <span>Forecast refreshed</span>
              <span>Follow-up scheduled</span>
              <span>Revenue won</span>
            </div>
          ))}
        </div>
      </section>

      <section id="war-room" className="relative mx-auto grid max-w-[98rem] gap-5 px-4 py-10 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
        <div className="rounded-[3rem] border border-white/10 bg-white/[0.06] p-7 shadow-[0_30px_100px_rgba(0,0,0,0.35)] backdrop-blur-2xl md:p-9">
          <Target className="mb-8 h-10 w-10 text-orange-300" />
          <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-300">Sales war room</p>
          <h2 className="mt-3 text-5xl font-black leading-[0.92] tracking-[-0.08em] text-white md:text-7xl">
            Built for reps, managers, and revenue operators.
          </h2>
          <p className="mt-6 text-base leading-8 text-orange-100/58">
            The interface behaves like a control room: every number answers a sales question, every card points to a decision, and every motion reinforces pipeline momentum.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {commandModules.map(([Icon, title, body], index) => (
            <article
              key={title}
              className="group rounded-[2.2rem] border border-white/10 bg-[#170905]/82 p-5 shadow-[0_20px_70px_rgba(0,0,0,0.25)] transition duration-500 hover:-translate-y-2 hover:border-orange-200/30 hover:bg-[#241008]"
              style={{ animation: `grow-float ${5 + index * 0.4}s ease-in-out infinite` }}
            >
              <Icon className="mb-6 h-6 w-6 text-orange-300 transition group-hover:scale-110" />
              <h3 className="text-xl font-black text-white">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-orange-100/55">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="pipeline" className="relative mx-auto max-w-[98rem] px-4 pb-10 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-[3.4rem] border border-white/10 bg-[#120602] p-5 shadow-[0_40px_140px_rgba(0,0,0,0.45)] md:p-8">
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-300">Pipeline choreography</p>
              <h2 className="mt-2 text-5xl font-black tracking-[-0.075em] text-white md:text-7xl">The deal path has a pulse.</h2>
            </div>
            <Zap className="h-10 w-10 text-orange-200/35" />
          </div>
          <div className="grid gap-4 lg:grid-cols-5">
            {salesLoop.map(([number, title, body], index) => (
              <div key={title} className="relative rounded-[2.2rem] border border-white/10 bg-white/[0.06] p-5">
                {index < salesLoop.length - 1 ? <div className="absolute -right-4 top-12 z-10 hidden h-1 w-8 rounded-full bg-orange-300 lg:block" /> : null}
                <div className="mb-8 flex items-center justify-between">
                  <span className="font-mono text-xs text-orange-100/35">{number}</span>
                  <span className="h-3 w-3 rounded-full bg-orange-300 shadow-[0_0_24px_rgba(253,186,116,0.9)]" style={{ animation: 'grow-pulse 2.2s ease-in-out infinite' }} />
                </div>
                <h3 className="text-2xl font-black text-white">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-orange-100/55">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="playbook" className="relative mx-auto grid max-w-[98rem] gap-5 px-4 pb-10 sm:px-6 lg:grid-cols-[1.2fr_0.8fr] lg:px-8">
        <div className="rounded-[3rem] border border-white/10 bg-orange-50 p-5 text-[#170905] shadow-[0_30px_110px_rgba(0,0,0,0.28)] md:p-7">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-700/50">Lead table preview</p>
              <h2 className="mt-1 text-4xl font-black tracking-[-0.06em]">Prioritize by heat, not guesswork.</h2>
            </div>
            <MailCheck className="h-8 w-8 text-orange-600" />
          </div>
          <div className="overflow-hidden rounded-[2rem] border border-orange-950/10 bg-white">
            {dealRows.map(([company, value, stage, probability, owner]) => (
              <div key={company} className="grid gap-3 border-b border-orange-950/10 px-4 py-4 last:border-b-0 md:grid-cols-[1.2fr_0.65fr_0.75fr_0.65fr_0.8fr] md:items-center">
                <div>
                  <p className="font-black">{company}</p>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-orange-950/38">Account</p>
                </div>
                <p className="font-mono font-black">{value}</p>
                <span className="w-fit rounded-full bg-orange-100 px-3 py-1 text-xs font-black text-orange-700">{stage}</span>
                <div className="flex items-center gap-2">
                  <Sparkline points="2,22 16,18 30,20 46,12 64,15 78,7 88,8" />
                  <span className="font-black">{probability}</span>
                </div>
                <p className="text-sm font-bold text-orange-950/58">{owner}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-5">
          <div className="rounded-[3rem] border border-white/10 bg-slate-950 p-5 text-white shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-300">API signal</p>
                <h3 className="mt-1 text-3xl font-black">Create lead</h3>
              </div>
              <Code2 className="h-7 w-7 text-orange-200/45" />
            </div>
            <pre className="overflow-x-auto rounded-[1.8rem] bg-white/[0.07] p-5 text-sm leading-7 text-orange-100">
              <code>{`const lead = await fudgeGrow.leads.create({
  source: 'demo-request',
  owner: 'sales@webfudge.com',
  company: 'Acme Manufacturing',
  score: 82,
  nextAction: 'Schedule discovery'
});`}</code>
            </pre>
          </div>

          <div className="rounded-[3rem] border border-white/10 bg-white/[0.06] p-6 backdrop-blur-2xl">
            <div className="mb-5 flex items-center gap-3">
              <Database className="h-6 w-6 text-orange-300" />
              <h3 className="text-2xl font-black text-white">Data gravity</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {['Lead', 'Contact', 'Company', 'Deal', 'Activity', 'Proposal'].map((item) => (
                <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.06] p-3 text-sm font-black text-orange-100/75">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="launch" className="relative mx-auto max-w-[98rem] px-4 pb-12 sm:px-6 lg:px-8">
        <div className="rounded-[3.4rem] bg-orange-300 p-7 text-[#160b06] shadow-[0_32px_120px_rgba(251,146,60,0.22)] md:p-10">
          <div className="grid gap-8 lg:grid-cols-[0.65fr_1fr]">
            <div>
              <Trophy className="mb-8 h-10 w-10" />
              <p className="text-xs font-black uppercase tracking-[0.22em] opacity-60">Launch sequence</p>
              <h2 className="mt-3 text-5xl font-black leading-[0.95] tracking-[-0.08em] md:text-7xl">
                Prepare the revenue floor before reps arrive.
              </h2>
            </div>
            <div className="space-y-3">
              {launchChecklist.map((item, index) => (
                <div key={item} className="flex gap-3 rounded-[1.7rem] bg-[#160b06] p-4 text-orange-50">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-orange-300 text-xs font-black text-black">{index + 1}</span>
                  <p className="text-sm leading-6 text-orange-50/72">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
