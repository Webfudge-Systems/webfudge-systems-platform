'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  ArrowLeft,
  BellRing,
  Bot,
  CheckCircle2,
  Code2,
  Crosshair,
  Gauge,
  KanbanSquare,
  Radar,
  RadioTower,
  Route,
  ScanLine,
  Trophy,
  UsersRound,
  TrendingUp,
  Zap,
  Target,
  Activity,
  ChevronRight,
  Circle,
  Hash,
  BarChart3,
} from 'lucide-react';

// ─── Data ────────────────────────────────────────────────────────────────────

const signals = [
  { source: 'Website demo', company: 'Acme Manufacturing', value: '$240K', status: 'Hot', score: 92, trend: [30, 45, 38, 60, 55, 72, 80, 92], color: '#10b981' },
  { source: 'Partner referral', company: 'Helio Foods', value: '$410K', status: 'Warm', score: 78, trend: [50, 55, 48, 62, 70, 68, 75, 78], color: '#34d399' },
  { source: 'Outbound reply', company: 'Vertex Labs', value: '$128K', status: 'Warm', score: 64, trend: [20, 35, 40, 52, 48, 58, 62, 64], color: '#6ee7b7' },
  { source: 'Campaign form', company: 'Northstar Retail', value: '$96K', status: 'New', score: 51, trend: [10, 22, 18, 30, 38, 42, 48, 51], color: '#a7f3d0' },
];

const forecastMetrics = [
  { label: 'Weighted Pipeline', value: '$1.8M', sub: '+12% this week', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  { label: 'Close Confidence', value: '73%', sub: 'Stage + activity aligned', color: '#34d399', bg: 'rgba(52,211,153,0.08)' },
  { label: 'Stalled Deals', value: '12', sub: 'Require manager review', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
  { label: 'Response SLA', value: '4h', sub: 'Avg first-touch speed', color: '#6ee7b7', bg: 'rgba(110,231,183,0.08)' },
];

const missionSteps = [
  { num: '01', title: 'Detect', body: 'Capture demand from forms, campaigns, referrals, replies, and imports.', icon: Radar },
  { num: '02', title: 'Score', body: 'Rank fit, urgency, account depth, and revenue potential automatically.', icon: Target },
  { num: '03', title: 'Engage', body: 'Coordinate calls, emails, meetings, proposals, and owner actions.', icon: Activity },
  { num: '04', title: 'Advance', body: 'Move deals with stage confidence, risk, value, and close date signals.', icon: TrendingUp },
  { num: '05', title: 'Win', body: 'Convert context into customer handoff and complete follow-up history.', icon: Trophy },
];

const consoleCards = [
  { icon: Radar, title: 'Signal Radar', body: 'Every demand source, scored and routed automatically to the right owner.', accent: '#10b981' },
  { icon: KanbanSquare, title: 'Pipeline Lanes', body: 'Stage, owner, value, proposal state, and risk — all in one view.', accent: '#34d399' },
  { icon: UsersRound, title: 'Account Memory', body: 'Contacts, notes, meetings, calls, and complete relationship history.', accent: '#6ee7b7' },
  { icon: Gauge, title: 'Forecast Pressure', body: 'Weighted value, drift signals, conversion rates, and review queues.', accent: '#a7f3d0' },
];

const launchSteps = [
  'Define signal sources, owner routing, lead scoring, and response SLA targets.',
  'Create stage rules, proposal states, stuck-deal triggers, and forecast views.',
  'Import leads, companies, contacts, activities, and clean ownership fields.',
  'Configure manager review queues for close dates, weighted value, and risk.',
  'Review role access, customer visibility, audit history, and data hygiene.',
];

const tickerItems = ['2,847 signals captured', '$1.8M weighted pipeline', '684 qualified leads', '42 deals closing', '12 manager reviews', '4h response SLA', '73% close confidence', '+18% win rate'];

// ─── Sub-components ──────────────────────────────────────────────────────────

function Sparkline({ points, color, width = 120, height = 36 }) {
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const step = width / (points.length - 1);
  const coords = points.map((p, i) => `${i * step},${height - ((p - min) / range) * (height - 4) - 2}`);
  const d = `M ${coords.join(' L ')}`;
  const fill = `M ${coords[0]} L ${coords.join(' L ')} L ${(points.length - 1) * step},${height} L 0,${height} Z`;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={`sg-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fill} fill={`url(#sg-${color.replace('#', '')})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={(points.length - 1) * step} cy={height - ((points[points.length - 1] - min) / range) * (height - 4) - 2} r="3" fill={color} />
    </svg>
  );
}

function PipelineFlow({ activeStep }) {
  const steps = missionSteps;
  return (
    <div className="relative w-full overflow-x-auto pt-2 pb-2">
      <div className="flex items-center gap-0 min-w-max mx-auto">
        {steps.map(({ num, title, icon: Icon }, i) => (
          <div key={num} className="flex items-center">
            <div
              className="relative flex flex-col items-center gap-2 px-3 py-2 rounded-xl transition-all duration-500 cursor-default"
              style={{
                background: i <= activeStep ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.03)',
                border: i <= activeStep ? '1px solid rgba(16,185,129,0.35)' : '1px solid rgba(255,255,255,0.08)',
                boxShadow: i === activeStep ? '0 0 20px rgba(16,185,129,0.2)' : 'none',
              }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-500"
                style={{ background: i <= activeStep ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.05)' }}
              >
                <Icon className="w-4 h-4" style={{ color: i <= activeStep ? '#10b981' : 'rgba(255,255,255,0.3)' }} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider whitespace-nowrap" style={{ color: i <= activeStep ? '#10b981' : 'rgba(255,255,255,0.3)' }}>
                {num}
              </span>
              <span className="text-xs font-semibold whitespace-nowrap" style={{ color: i <= activeStep ? '#fff' : 'rgba(255,255,255,0.4)' }}>
                {title}
              </span>
              {i === activeStep && (
                <span
                  className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full"
                  style={{ background: '#10b981', boxShadow: '0 0 8px #10b981', animation: 'fg-pulse 1.6s ease-in-out infinite' }}
                />
              )}
            </div>
            {i < steps.length - 1 && (
              <div className="w-8 h-px mx-0.5 relative">
                <div className="absolute inset-0" style={{ background: i < activeStep ? 'linear-gradient(90deg,#10b981,#34d399)' : 'rgba(255,255,255,0.1)' }} />
                {i < activeStep && (
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full"
                    style={{ background: '#10b981', left: '50%', boxShadow: '0 0 6px #10b981' }}
                  />
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function AnimatedDonut({ value, total = 100, color, size = 80 }) {
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (value / total) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke={color}
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
        strokeDashoffset={circ / 4}
        style={{ filter: `drop-shadow(0 0 6px ${color})` }}
      />
      <text x="50%" y="50%" textAnchor="middle" dy="0.35em" fill="white" fontSize={size * 0.18} fontWeight="700">
        {value}%
      </text>
    </svg>
  );
}

function BarChart({ data, color }) {
  const max = Math.max(...data.map(d => d.v));
  return (
    <div className="flex items-end gap-1.5 h-16">
      {data.map((d, i) => (
        <div key={i} className="flex flex-col items-center gap-1 flex-1">
          <div
            className="w-full rounded-t-sm transition-all duration-700"
            style={{
              height: `${(d.v / max) * 56}px`,
              background: `linear-gradient(180deg, ${color}, ${color}66)`,
              boxShadow: `0 0 8px ${color}44`,
            }}
          />
          <span className="text-[8px] text-white/30 font-medium">{d.l}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function FudgeGrowMissionControl({ app, fileName }) {
  const [activeMetric, setActiveMetric] = useState(0);
  const [activeSignal, setActiveSignal] = useState(0);
  const [activeStep, setActiveStep] = useState(2);
  const [tickerPos, setTickerPos] = useState(0);
  const [counter, setCounter] = useState({ pipeline: 0, confidence: 0, leads: 0, won: 0 });
  const tickerRef = useRef(null);

  const handleBack = (e) => {
    e.preventDefault();
    if (typeof window !== 'undefined') {
      window.close();
      setTimeout(() => {
        window.location.href = '/applications/crm';
      }, 100);
    }
  };

  // Auto-advance pipeline step
  useEffect(() => {
    const t = setInterval(() => setActiveStep(s => (s + 1) % 5), 2200);
    return () => clearInterval(t);
  }, []);

  // Animate counters on mount
  useEffect(() => {
    const targets = { pipeline: 18, confidence: 73, leads: 28, won: 18 };
    let frame = 0;
    const total = 60;
    const id = setInterval(() => {
      frame++;
      const p = Math.min(frame / total, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setCounter({
        pipeline: Math.floor(ease * targets.pipeline * 10) / 10,
        confidence: Math.floor(ease * targets.confidence),
        leads: Math.floor(ease * targets.leads * 100),
        won: Math.floor(ease * targets.won),
      });
      if (frame >= total) clearInterval(id);
    }, 20);
    return () => clearInterval(id);
  }, []);

  const pipelineData = [
    { l: 'Jan', v: 28 }, { l: 'Feb', v: 42 }, { l: 'Mar', v: 35 }, { l: 'Apr', v: 58 },
    { l: 'May', v: 72 }, { l: 'Jun', v: 65 }, { l: 'Jul', v: 88 }, { l: 'Aug', v: 96 },
  ];

  return (
    <main className="min-h-screen bg-[#060e0a] text-white overflow-x-hidden">
      <style>{`
        @keyframes fg-pulse { 0%,100%{opacity:.4;transform:scale(.85)} 50%{opacity:1;transform:scale(1.15)} }
        @keyframes fg-scan { 0%{transform:translateX(-100%);opacity:0} 15%{opacity:1} 85%{opacity:1} 100%{transform:translateX(400%);opacity:0} }
        @keyframes fg-float { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(-8px)} }
        @keyframes fg-ticker { from{transform:translateX(0)} to{transform:translateX(-50%)} }
        @keyframes fg-glow { 0%,100%{opacity:.6} 50%{opacity:1} }
        @keyframes fg-grid-move { from{background-position:0 0} to{background-position:48px 48px} }
        @keyframes fg-dash { to{stroke-dashoffset:0} }
        @keyframes fg-fade-up { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fg-shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes fg-scrollbar-flow { 0%{background-position:0% 0%} 100%{background-position:0% 200%} }
        html { scroll-behavior: smooth; }
        .fg-glass {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          backdrop-filter: blur(16px);
        }
        .fg-glass-em {
          background: rgba(16,185,129,0.06);
          border: 1px solid rgba(16,185,129,0.18);
          backdrop-filter: blur(16px);
        }
        
        /* Style the global scrollbar of the page */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        ::-webkit-scrollbar-track {
          background: #060e0a;
        }
        ::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #059669, #10b981, #34d399, #10b981, #059669);
          background-size: 100% 200%;
          border-radius: 9999px;
          border: 2px solid #060e0a;
          animation: fg-scrollbar-flow 4s linear infinite;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, #10b981, #34d399, #6ee7b7, #34d399, #10b981);
        }

        /* Custom scrollbar for containers */
        .fg-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .fg-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .fg-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #059669, #10b981, #34d399, #10b981, #059669);
          background-size: 100% 200%;
          border-radius: 4px;
          animation: fg-scrollbar-flow 4s linear infinite;
        }

        .fg-card-hover { transition: all 0.25s ease; }
        .fg-card-hover:hover { transform: translateY(-2px); border-color: rgba(16,185,129,0.3) !important; }
      `}</style>

      {/* ── Global Background ──────────────────────────────────────────────── */}
      <div className="pointer-events-none fixed inset-0 z-0">
        {/* Noise texture */}
        <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")', backgroundSize: '200px 200px' }} />
        {/* Grid */}
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'linear-gradient(rgba(16,185,129,0.5) 1px,transparent 1px),linear-gradient(90deg,rgba(16,185,129,0.5) 1px,transparent 1px)', backgroundSize: '48px 48px', animation: 'fg-grid-move 24s linear infinite' }} />
        {/* Radial glows */}
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full" style={{ background: 'radial-gradient(circle,rgba(16,185,129,0.12) 0%,transparent 70%)' }} />
        <div className="absolute -top-20 right-0 w-[400px] h-[400px] rounded-full" style={{ background: 'radial-gradient(circle,rgba(52,211,153,0.08) 0%,transparent 70%)' }} />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px]" style={{ background: 'radial-gradient(ellipse,rgba(16,185,129,0.06) 0%,transparent 70%)' }} />
        {/* Vignette */}
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center,transparent 40%,rgba(6,14,10,0.7) 100%)' }} />
      </div>

      {/* ── Top Navigation Bar ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-emerald-900/30" style={{ background: 'rgba(6,14,10,0.85)', backdropFilter: 'blur(20px)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={handleBack} className="flex items-center gap-1.5 text-xs text-emerald-400/60 hover:text-emerald-400 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to CRM</span>
            </button>
            <span className="text-emerald-900/60 text-sm">·</span>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
                <TrendingUp className="w-3 h-3 text-white" />
              </div>
              <span className="text-sm font-semibold text-white">Fudge Grow</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.25)' }}>
                CRM
              </span>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-1">
            {[['#deck', 'Overview'], ['#signals', 'Signals'], ['#mission', 'Pipeline'], ['#system', 'System'], ['#launch', 'Setup']].map(([href, label]) => (
              <a key={href} href={href} className="px-3 py-1.5 rounded-lg text-xs font-medium text-white/50 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all duration-200">
                {label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" style={{ animation: 'fg-pulse 2s ease-in-out infinite' }} />
              Live
            </span>
          </div>
        </div>
      </header>

      {/* ── Ticker ─────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden border-b" style={{ background: 'rgba(16,185,129,0.06)', borderColor: 'rgba(16,185,129,0.15)' }}>
        <div className="flex whitespace-nowrap" style={{ animation: 'fg-ticker 28s linear infinite' }}>
          {[...tickerItems, ...tickerItems].map((item, i) => (
            <span key={i} className="inline-flex items-center gap-2 px-6 py-2 text-[11px] font-semibold text-emerald-300/70 uppercase tracking-widest">
              <span className="w-1 h-1 rounded-full bg-emerald-500/50" />
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────
          SECTION 1: HERO / OVERVIEW DECK
      ──────────────────────────────────────────────────────────────────────── */}
      <section id="deck" className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: copy */}
          <div style={{ animation: 'fg-fade-up 0.6s ease both' }}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest mb-6" style={{ background: 'rgba(16,185,129,0.1)', color: '#34d399', border: '1px solid rgba(16,185,129,0.2)' }}>
              <RadioTower className="w-3.5 h-3.5" />
              Revenue Flight Deck
            </div>
            <h1 className="text-5xl lg:text-6xl xl:text-7xl font-black leading-[0.9] tracking-tight mb-6" style={{ letterSpacing: '-0.04em' }}>
              Pipeline<br />
              <span style={{ background: 'linear-gradient(135deg,#10b981 0%,#34d399 50%,#6ee7b7 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                command
              </span>
              <br />deck.
            </h1>
            <p className="text-base lg:text-lg leading-relaxed text-white/50 max-w-lg mb-8">
              A focused CRM cockpit for high-velocity teams. Signal heat, deal lanes, account memory, forecast pressure, and decision cues — all on one surface.
            </p>
            <div className="flex flex-wrap gap-3">
              <a href="#signals" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-black transition-all hover:-translate-y-0.5 hover:shadow-lg" style={{ background: 'linear-gradient(135deg,#10b981,#059669)', boxShadow: '0 4px 20px rgba(16,185,129,0.25)' }}>
                Inspect signals
                <ScanLine className="w-4 h-4" />
              </a>
              <a href="#mission" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white/80 fg-glass transition-all hover:-translate-y-0.5 hover:text-white">
                Mission path
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Right: metrics dashboard */}
          <div className="grid grid-cols-2 gap-3" style={{ animation: 'fg-fade-up 0.6s ease 0.15s both' }}>
            {/* KPI cards */}
            {[
              { label: 'Pipeline', val: `$${counter.pipeline}M`, icon: TrendingUp, accent: '#10b981' },
              { label: 'Close Confidence', val: `${counter.confidence}%`, icon: Target, accent: '#34d399' },
              { label: 'Total Leads', val: `${counter.leads.toLocaleString()}`, icon: Radar, accent: '#6ee7b7' },
              { label: 'Win Rate', val: `+${counter.won}%`, icon: Trophy, accent: '#a7f3d0' },
            ].map(({ label, val, icon: Icon, accent }, i) => (
              <div key={label} className="fg-glass rounded-2xl p-4 fg-card-hover" style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">{label}</span>
                  <Icon className="w-4 h-4" style={{ color: accent }} />
                </div>
                <p className="text-2xl font-black" style={{ color: accent }}>{val}</p>
              </div>
            ))}
            {/* Mini bar chart spanning full width */}
            <div className="col-span-2 fg-glass rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">Pipeline Velocity</p>
                <span className="text-[10px] text-emerald-400 font-semibold">↑ 34% YoY</span>
              </div>
              <BarChart data={pipelineData} color="#10b981" />
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────
          SECTION 2: FORECAST PULSE
      ──────────────────────────────────────────────────────────────────────── */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="rounded-3xl overflow-hidden fg-glass" style={{ border: '1px solid rgba(16,185,129,0.12)' }}>
          {/* Scan animation overlay */}
          <div className="absolute inset-y-0 w-32 pointer-events-none" style={{ background: 'linear-gradient(90deg,transparent,rgba(16,185,129,0.07),transparent)', animation: 'fg-scan 5s ease-in-out infinite' }} />
          <div className="p-6 lg:p-8 border-b" style={{ borderColor: 'rgba(16,185,129,0.1)' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500/60 mb-1">Forecast Pressure</p>
                <h2 className="text-2xl lg:text-3xl font-black">Revenue Pulse</h2>
              </div>
              <div className="flex items-center gap-2">
                <AnimatedDonut value={73} color="#10b981" size={72} />
              </div>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4">
            {forecastMetrics.map(({ label, value, sub, color, bg }, i) => (
              <button
                key={label}
                onClick={() => setActiveMetric(i)}
                className="relative p-5 text-left transition-all duration-250 group"
                style={{
                  background: activeMetric === i ? bg : 'transparent',
                  borderRight: i < 3 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                }}
              >
                {activeMetric === i && (
                  <div className="absolute top-0 inset-x-0 h-0.5" style={{ background: color }} />
                )}
                <p className="text-3xl font-black mb-1" style={{ color: activeMetric === i ? color : '#fff' }}>{value}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1">{label}</p>
                <p className="text-[10px] text-white/25">{sub}</p>
              </button>
            ))}
          </div>
          {/* Selected insight */}
          <div className="p-5 border-t" style={{ borderColor: 'rgba(16,185,129,0.1)', background: 'rgba(16,185,129,0.03)' }}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500/50 mb-2">Selected Insight</p>
            <p className="text-sm text-white/60 leading-relaxed">{forecastMetrics[activeMetric].label === 'Weighted Pipeline' ? 'Prioritize enterprise deals above $100K with activity inside the last 7 days.' : forecastMetrics[activeMetric].label === 'Close Confidence' ? 'Confidence is strongest when proposal opens, stakeholder activity, and stage movement align.' : forecastMetrics[activeMetric].label === 'Stalled Deals' ? 'Manager review should start with deals idle for 10+ days in proposal or negotiation stages.' : 'First response speed protects lead quality before competitors enter the conversation.'}</p>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────
          SECTION 3: SIGNAL INTELLIGENCE
      ──────────────────────────────────────────────────────────────────────── */}
      <section id="signals" className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="grid lg:grid-cols-[1fr_1.5fr] gap-6">
          {/* Description */}
          <div className="rounded-3xl p-6 lg:p-8 fg-glass-em flex flex-col justify-between">
            <div>
              <Crosshair className="w-8 h-8 mb-5" style={{ color: '#10b981' }} />
              <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500/60 mb-3">Signal Intelligence</p>
              <h2 className="text-3xl lg:text-4xl font-black leading-tight mb-5">
                Leads arrive<br />as heat.
              </h2>
              <p className="text-sm leading-relaxed text-white/50">
                Fudge Grow turns raw demand into priority — who to call, why now, and what outcome to push for. Every signal is scored, routed, and tracked in real time.
              </p>
            </div>
            {/* Score gauge */}
            <div className="mt-8 p-4 rounded-2xl" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.12)' }}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500/50 mb-3">Active Signal</p>
              <div className="flex items-center gap-4">
                <div className="relative w-14 h-14">
                  <svg viewBox="0 0 56 56" width="56" height="56">
                    <circle cx="28" cy="28" r="22" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="5" />
                    <circle
                      cx="28" cy="28" r="22"
                      fill="none"
                      stroke={signals[activeSignal].color}
                      strokeWidth="5"
                      strokeLinecap="round"
                      strokeDasharray={`${(signals[activeSignal].score / 100) * 138} 138`}
                      strokeDashoffset="34.5"
                      style={{ filter: `drop-shadow(0 0 5px ${signals[activeSignal].color})`, transition: 'stroke-dasharray 0.4s ease' }}
                    />
                    <text x="50%" y="50%" textAnchor="middle" dy="0.35em" fill="white" fontSize="11" fontWeight="700">{signals[activeSignal].score}</text>
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-sm text-white">{signals[activeSignal].company}</p>
                  <p className="text-[10px] text-white/40 mt-0.5">{signals[activeSignal].source} · {signals[activeSignal].status} intent</p>
                  <p className="text-lg font-black mt-1" style={{ color: signals[activeSignal].color }}>{signals[activeSignal].value}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Signal list */}
          <div className="rounded-3xl fg-glass overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">Live Signal Feed</p>
              <span className="text-[10px] text-emerald-400/60">4 of 2,847 signals</span>
            </div>
            <div className="divide-y" style={{ divideColor: 'rgba(255,255,255,0.04)' }}>
              {signals.map((sig, i) => (
                <button
                  key={sig.company}
                  onClick={() => setActiveSignal(i)}
                  className="w-full p-4 text-left transition-all duration-200 group"
                  style={{ background: activeSignal === i ? 'rgba(16,185,129,0.06)' : 'transparent' }}
                >
                  <div className="flex items-center gap-4">
                    {/* Score circle */}
                    <div className="relative w-10 h-10 shrink-0">
                      <svg viewBox="0 0 40 40" width="40" height="40">
                        <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3.5" />
                        <circle
                          cx="20" cy="20" r="16"
                          fill="none"
                          stroke={sig.color}
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          strokeDasharray={`${(sig.score / 100) * 100.5} 100.5`}
                          strokeDashoffset="25.1"
                          style={{ transition: 'all 0.4s ease' }}
                        />
                        <text x="50%" y="50%" textAnchor="middle" dy="0.35em" fill="white" fontSize="9" fontWeight="700">{sig.score}</text>
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-semibold text-sm text-white truncate">{sig.company}</p>
                        <span className="shrink-0 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase" style={{ background: `${sig.color}20`, color: sig.color }}>
                          {sig.status}
                        </span>
                      </div>
                      <p className="text-[10px] text-white/35">{sig.source}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-black text-sm" style={{ color: sig.color }}>{sig.value}</p>
                      <Sparkline points={sig.trend} color={sig.color} width={72} height={24} />
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <div className="p-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.05)', background: 'rgba(16,185,129,0.03)' }}>
              <div className="grid grid-cols-3 gap-3 text-center">
                {[['2,847', 'Total signals'], ['684', 'Qualified'], ['42', 'Closing']].map(([v, l]) => (
                  <div key={l}>
                    <p className="text-xl font-black text-emerald-400">{v}</p>
                    <p className="text-[9px] text-white/30 uppercase tracking-wider mt-0.5">{l}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────
          SECTION 4: MISSION PATH (PIPELINE FLOW)
      ──────────────────────────────────────────────────────────────────────── */}
      <section id="mission" className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="rounded-3xl p-6 lg:p-8" style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.12)' }}>
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-8">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500/60 mb-2">Mission Path</p>
              <h2 className="text-3xl lg:text-4xl font-black">Signal to revenue in five moves.</h2>
            </div>
            <p className="text-sm text-white/40 max-w-xs">Each stage builds on the last. No gaps, no dropped context, no lost deals.</p>
          </div>

          {/* Animated pipeline flowchart */}
          <div className="mb-8 overflow-x-auto fg-scrollbar pb-2">
            <PipelineFlow activeStep={activeStep} />
          </div>

          {/* Active step detail */}
          <div className="rounded-2xl p-5 overflow-hidden" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(16,185,129,0.15)', minHeight: '100px' }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeStep}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
              >
                {(() => {
                  const { num, title, body, icon: Icon } = missionSteps[activeStep];
                  return (
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(16,185,129,0.15)' }}>
                        <Icon className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div>
                        <p className="font-mono text-[10px] text-emerald-500/60 mb-0.5">STEP {num}</p>
                        <h3 className="text-lg font-black text-emerald-400 mb-1">{title}</h3>
                        <p className="text-sm text-white/50 leading-relaxed">{body}</p>
                      </div>
                    </div>
                  );
                })()}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Step cards grid */}
          <div className="grid sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-4">
            {missionSteps.map(({ num, title, body, icon: Icon }, i) => (
              <button
                key={num}
                onClick={() => setActiveStep(i)}
                className="text-left p-4 rounded-2xl transition-all duration-250 fg-card-hover"
                style={{
                  background: activeStep === i ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.02)',
                  border: activeStep === i ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(255,255,255,0.05)',
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-[10px] text-white/25">{num}</span>
                  {activeStep === i && <span className="w-2 h-2 rounded-full bg-emerald-400" style={{ animation: 'fg-pulse 2s infinite' }} />}
                </div>
                <Icon className="w-4 h-4 mb-2" style={{ color: activeStep === i ? '#10b981' : 'rgba(255,255,255,0.3)' }} />
                <p className="text-xs font-bold" style={{ color: activeStep === i ? '#fff' : 'rgba(255,255,255,0.4)' }}>{title}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────
          SECTION 5: SYSTEM PILLARS + API
      ──────────────────────────────────────────────────────────────────────── */}
      <section id="system" className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="grid lg:grid-cols-[1fr_0.75fr] gap-6">
          {/* Pillars */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500/60 mb-2">Core Pillars</p>
            <h2 className="text-3xl font-black mb-6">Built to close deals.</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {consoleCards.map(({ icon: Icon, title, body, accent }, i) => (
                <div
                  key={title}
                  className="p-5 rounded-2xl fg-card-hover"
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    animation: `fg-float ${5.2 + i * 0.5}s ease-in-out infinite`,
                  }}
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-4" style={{ background: `${accent}15`, border: `1px solid ${accent}25` }}>
                    <Icon className="w-4.5 h-4.5" style={{ color: accent }} />
                  </div>
                  <h3 className="font-bold text-sm mb-2">{title}</h3>
                  <p className="text-xs text-white/40 leading-relaxed">{body}</p>
                </div>
              ))}
            </div>
          </div>

          {/* API + docs-as-layer */}
          <div className="flex flex-col gap-4">
            {/* API code block */}
            <div className="rounded-2xl overflow-hidden flex-1" style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.03)' }}>
                <div className="flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-emerald-400/60" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">API Telemetry</span>
                </div>
                <div className="flex gap-1.5">
                  {['#ff5f57', '#febc2e', '#28c840'].map(c => <span key={c} className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />)}
                </div>
              </div>
              <pre className="p-4 text-xs leading-6 overflow-x-auto fg-scrollbar" style={{ color: '#e6edf3', fontFamily: "'Fira Code', 'Cascadia Code', monospace" }}>
                <code>{`<span style="color:#8b949e">// Create a new lead</span>
<span style="color:#ff7b72">const</span> lead <span style="color:#ff7b72">=</span> <span style="color:#d2a8ff">await</span> fudgeGrow.leads
  .<span style="color:#79c0ff">create</span>({
    source: <span style="color:#a5d6ff">'demo-request'</span>,
    owner:  <span style="color:#a5d6ff">'sales@webfudge.com'</span>,
    company:<span style="color:#a5d6ff">'Acme Manufacturing'</span>,
    score:  <span style="color:#79c0ff">92</span>,
    stage:  <span style="color:#a5d6ff">'proposal-review'</span>
  });`.replace(/<span.*?>/g, '').replace(/<\/span>/g, '')}</code>
              </pre>
            </div>

            {/* Docs as operating layer */}
            <div className="rounded-2xl p-5" style={{ background: 'linear-gradient(135deg,rgba(16,185,129,0.12),rgba(52,211,153,0.06))', border: '1px solid rgba(16,185,129,0.2)' }}>
              <BellRing className="w-6 h-6 text-emerald-400 mb-3" />
              <h3 className="font-black text-lg mb-2">Docs as an operating layer.</h3>
              <p className="text-xs text-white/50 leading-relaxed">
                Users learn the CRM through live surfaces: signals, deals, actions, API events, and launch readiness — embedded directly in workflow.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────
          SECTION 6: LAUNCH CHECKLIST
      ──────────────────────────────────────────────────────────────────────── */}
      <section id="launch" className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="rounded-3xl overflow-hidden" style={{ background: 'linear-gradient(135deg,rgba(16,185,129,0.08) 0%,rgba(6,14,10,0.8) 100%)', border: '1px solid rgba(16,185,129,0.15)' }}>
          <div className="grid lg:grid-cols-[0.5fr_1fr] gap-0">
            {/* Left label */}
            <div className="p-8 border-b lg:border-b-0 lg:border-r" style={{ borderColor: 'rgba(16,185,129,0.12)' }}>
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mb-5" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500/60 mb-3">Launch Checklist</p>
              <h2 className="text-3xl font-black leading-tight mb-4">Prep the<br />sales floor.</h2>
              <p className="text-sm text-white/40 leading-relaxed">
                Five steps to go live with confidence. Each covers a core dimension of a healthy revenue team.
              </p>
              {/* Progress visual */}
              <div className="mt-8 flex items-center gap-3">
                <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <div className="h-full rounded-full" style={{ width: '100%', background: 'linear-gradient(90deg,#10b981,#34d399)', boxShadow: '0 0 8px rgba(16,185,129,0.5)' }} />
                </div>
                <span className="text-[10px] font-bold text-emerald-400">5/5</span>
              </div>
            </div>

            {/* Right: steps */}
            <div className="p-6 lg:p-8 space-y-3">
              {launchSteps.map((item, i) => (
                <div
                  key={i}
                  className="flex gap-4 p-4 rounded-2xl fg-card-hover"
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    animation: `fg-fade-up 0.5s ease ${i * 0.08}s both`,
                  }}
                >
                  <span
                    className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black text-black"
                    style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}
                  >
                    {i + 1}
                  </span>
                  <p className="text-sm text-white/55 leading-relaxed">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="relative z-10 border-t" style={{ borderColor: 'rgba(16,185,129,0.1)', background: 'rgba(6,14,10,0.9)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
              <TrendingUp className="w-3 h-3 text-white" />
            </div>
            <span className="text-sm font-semibold text-white/60">Fudge Grow</span>
            <span className="text-white/20 mx-1">·</span>
            <span className="text-xs text-white/30">by Webfudge Systems</span>
          </div>
          <button onClick={handleBack} className="inline-flex items-center gap-2 text-xs text-emerald-400/60 hover:text-emerald-400 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to CRM overview
          </button>
        </div>
      </footer>
    </main>
  );
}
