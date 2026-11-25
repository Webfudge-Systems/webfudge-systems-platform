'use client';

import { useRef } from 'react';
import {
  ArrowRight,
  BookOpen,
  Zap,
} from 'lucide-react';
import { motion } from 'framer-motion';
import DocPageLayout from './DocPageLayout';

export default function AppHubClient({ app }) {
  const magBtnRef = useRef(null);

  const appColor = app.color || '#F5630F';
  const docsHref = `/${encodeURIComponent(`${app.name}.html`)}`;

  const crumbs = [
    { label: 'Docs', href: '/' },
    { label: 'Applications' },
    { label: app.name },
  ];

  // Magnetic Button Effect
  const handleMagneticMouseMove = (e) => {
    const btn = magBtnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    btn.style.transform = `translate(${x * 0.3}px, ${y * 0.3}px) scale(1.04)`;
  };

  const handleMagneticMouseLeave = () => {
    const btn = magBtnRef.current;
    if (!btn) return;
    btn.style.transform = 'translate(0px, 0px) scale(1)';
  };

  return (
    <DocPageLayout crumbs={crumbs} showToc={false}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="space-y-10"
      >

        {/* ── HERO HEADER ── */}
        <div className="glass-panel relative overflow-hidden rounded-3xl p-8 md:p-10">

          {/* Background glow */}
          <div
            className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-20 blur-3xl"
            style={{ backgroundColor: appColor }}
          />
          <div
            className="pointer-events-none absolute -left-12 -bottom-12 h-48 w-48 rounded-full opacity-10 blur-2xl"
            style={{ backgroundColor: appColor }}
          />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-8">

            {/* Left: Product Info */}
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-3">
                <span
                  className="inline-flex items-center rounded-full px-3 py-1 text-xs font-extrabold text-white shadow-md tracking-widest uppercase"
                  style={{ backgroundColor: appColor }}
                >
                  {app.slug.toUpperCase()}
                </span>
                <span className="flex items-center gap-1.5 text-xs font-semibold text-brand-text-muted dark:text-gray-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-primary" />
                  Product overview
                </span>
              </div>

              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-brand-dark dark:text-white leading-tight">
                {app.name}
              </h1>

              <p className="text-base leading-relaxed text-brand-text-light dark:text-gray-300 max-w-xl">
                {app.description.split('. ')[0] + '.'}
              </p>
            </div>

            {/* Right: Animated Icon Visual */}
            <div className="flex-shrink-0 flex items-center justify-center">
              <div className="relative h-44 w-44">
                {/* Static brand rings */}
                <div
                  className="absolute inset-0 rounded-full border-2 border-dashed opacity-30"
                  style={{ borderColor: appColor }}
                />
                <div
                  className="absolute inset-4 rounded-full border opacity-20"
                  style={{ borderColor: appColor }}
                />
                {/* Soft glow */}
                <div
                  className="absolute inset-8 rounded-full blur-md opacity-40"
                  style={{ backgroundColor: appColor }}
                />
                {/* Core icon */}
                <div className="glass-panel absolute inset-8 flex items-center justify-center rounded-3xl">
                  <span className="text-3xl font-extrabold" style={{ color: appColor }}>
                    {app.name.slice(0, 2).toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── DESCRIPTION PARAGRAPH ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className="glass-panel rounded-[2rem] p-8"
        >
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-xl font-bold text-brand-dark dark:text-white">Platform Overview</h2>
          </div>
          <p className="text-lg leading-relaxed text-brand-text-light dark:text-gray-300 font-light">
            {app.description}
          </p>
        </motion.div>

        {/* ── OFFICIAL DOCUMENTATION CTA ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.35 }}
          className="glass-panel relative overflow-hidden rounded-3xl p-8 md:p-10"
        >
          {/* BG gradient glow */}
          <div
            className="pointer-events-none absolute inset-0 opacity-10"
            style={{
              background: `radial-gradient(circle at 70% 50%, ${appColor} 0%, transparent 65%)`,
            }}
          />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-6">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider" style={{ color: appColor }}>
                <BookOpen className="h-4 w-4" />
                <span>Official Documentation</span>
              </div>
              <h2 className="text-2xl font-extrabold text-brand-dark dark:text-white">
                Explore {app.name} in depth
              </h2>
              <p className="text-sm text-brand-text-light dark:text-gray-400 max-w-lg">
                Interactive guides, API reference, architecture diagrams, quick-start walkthroughs, and advanced configuration — all in one place.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <a
                href={docsHref}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  e.preventDefault();
                  window.open(docsHref, '_blank');
                }}
                ref={magBtnRef}
                onMouseMove={handleMagneticMouseMove}
                onMouseLeave={handleMagneticMouseLeave}
                className="inline-flex items-center gap-2.5 rounded-2xl px-6 py-3.5 text-sm font-bold text-white shadow-lg cursor-pointer transition-all duration-300 hover:shadow-xl"
                style={{
                  backgroundColor: appColor,
                  boxShadow: `0 8px 30px ${appColor}40`,
                }}
              >
                <BookOpen className="h-4 w-4" />
                <span>View Documentation</span>
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </motion.div>

        {/* ── GETTING STARTED QUICK STEPS ── */}
        {app.gettingStarted && app.gettingStarted.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-brand-dark dark:text-white flex items-center gap-2">
              <Zap className="h-5 w-5" style={{ color: appColor }} />
              Getting Started
            </h2>
            <div className="space-y-3 relative pl-8">
              {/* Connecting line */}
              <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-brand-border/30 dark:bg-white/5" />

              {app.gettingStarted.filter(s => s.title).map((step, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + idx * 0.08 }}
                  className="relative group"
                >
                  <div
                    className="absolute -left-8 top-3 h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white border-2 border-white dark:border-[#0a0a0a] shadow-sm"
                    style={{ backgroundColor: appColor }}
                  >
                    {idx + 1}
                  </div>
                  <div className="glass-panel rounded-xl p-4 transition-all hover:border-white/70 dark:hover:border-white/10">
                    <h3 className="text-sm font-bold text-brand-dark dark:text-white">{step.title}</h3>
                    <p className="mt-1 text-xs text-brand-text-light dark:text-gray-400">{step.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </DocPageLayout>
  );
}
