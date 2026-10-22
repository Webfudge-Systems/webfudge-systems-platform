'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

const CORE_PRODUCT_SLUGS = new Set(['crm', 'pm', 'accounts']);

export default function HomeHeroClient({ apps }) {
  const fullText = 'Webfudge Platform';
  const coreApps = useMemo(() => {
    return (apps || []).filter((app) => CORE_PRODUCT_SLUGS.has(app.slug?.toLowerCase()));
  }, [apps]);

  return (
    <div className="relative overflow-hidden pt-4 pb-12 space-y-16">
      
      {/* 1. HERO TITLE & GRADIENT ORB */}
      <div className="relative text-center max-w-3xl mx-auto space-y-6 py-12">
        {/* Ambient Orb */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-72 w-72 rounded-full bg-brand-primary/10 blur-[100px] pointer-events-none" />
        
        {/* Brand mark */}
        <div className="relative flex justify-center items-center h-32 w-32 mx-auto mb-8">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="relative flex items-center justify-center w-32 h-32 rounded-full bg-white/40 dark:bg-black/30 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-white/50 dark:border-white/10 z-20"
          >
            {/* Inner Neon Rings */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
              className="absolute inset-3 rounded-full border-[1.5px] border-dashed border-[#ff5500]/90 shadow-[0_0_10px_rgba(255,85,0,0.5),inset_0_0_10px_rgba(255,85,0,0.5)] pointer-events-none"
            />
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute inset-6 rounded-full border-2 border-dotted border-[#ff8f00]/90 shadow-[0_0_8px_rgba(255,143,0,0.5),inset_0_0_8px_rgba(255,143,0,0.5)] pointer-events-none"
            />

            <div className="absolute inset-0 rounded-full bg-[#F5630F]/10 blur-xl pointer-events-none" />
            <motion.img
              src="/ws_logo.png"
              alt="Webfudge Logo"
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-20 h-20 object-contain drop-shadow-md"
            />
          </motion.div>
        </div>
        
        <h1 className="relative z-10 text-5xl md:text-6xl font-extrabold tracking-tight text-brand-dark dark:text-white">
          <span className="bg-gradient-to-r from-brand-primary to-orange-600 bg-clip-text text-transparent">
            {fullText}
          </span>
        </h1>
        
        <motion.p 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.4 }}
          className="relative z-10 text-lg md:text-xl text-brand-text-light dark:text-gray-300 max-w-xl mx-auto leading-relaxed"
        >
          A modular business operating system. Secure, developer-first CRM, PM, and Accounts workflow engines built inside one monorepo.
        </motion.p>
      </div>

      <AppSection
        eyebrow="Core Platform Docs"
        title="Product workspaces"
        description="Start with the first-party CRM, project delivery, and account administration products."
        apps={coreApps}
      />

      {/* Footer has been moved to page.js */}

    </div>
  );
}

function AppSection({ eyebrow, title, description, apps }) {
  if (!apps || apps.length === 0) return null;

  return (
    <section className="max-w-6xl mx-auto space-y-5">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-brand-primary">{eyebrow}</p>
          <h2 className="mt-2 text-2xl font-extrabold text-brand-dark dark:text-white">{title}</h2>
        </div>
        <p className="max-w-2xl text-sm leading-relaxed text-brand-text-light dark:text-gray-400">
          {description}
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {apps.map((app, idx) => (
          <AppCard key={app.slug || app.name} app={app} index={idx} />
        ))}
      </div>
    </section>
  );
}

function AppCard({ app, index }) {
  const cardRef = useRef(null);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    
    // Degrees of rotation
    const rotationX = -(y / (rect.height / 2)) * 8;
    const rotationY = (x / (rect.width / 2)) * 8;
    
    setCoords({ x: rotationY, y: rotationX });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setCoords({ x: 0, y: 0 });
  };

  const appColor = app.color || '#F5630F';
  const href = `/applications/${app.slug}`;
  const cta = 'View product overview';
  const badge = app.slug?.toUpperCase() || 'Product';

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 + index * 0.1, duration: 0.4 }}
      style={{
        transform: `perspective(1000px) rotateX(${coords.y}px) rotateY(${coords.x}px) scale(${isHovered ? 1.02 : 1})`,
        transition: isHovered ? 'none' : 'transform 0.5s ease-out',
        borderColor: isHovered ? appColor : 'transparent'
      }}
      className="group relative"
    >
      <Link
        href={href}
        className="block h-full rounded-2xl border border-brand-border/60 bg-white/70 p-6 shadow-sm transition-all hover:shadow-xl dark:border-white/10 dark:bg-[#111118]/70"
      >
        {/* Accent hover glow blob */}
        <div 
          className="absolute -right-20 -top-20 h-40 w-40 rounded-full blur-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-300"
          style={{ backgroundColor: appColor }}
        />

        <div className="relative z-10 flex items-center justify-between gap-4 mb-4">
          <span 
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase text-white"
            style={{ backgroundColor: appColor }}
          >
            <Sparkles className="h-3 w-3" />
            {badge}
          </span>
          <ArrowRight className="h-4 w-4 text-brand-text-muted group-hover:text-brand-primary group-hover:translate-x-1 transition-all" />
        </div>

        <h3 className="relative z-10 text-xl font-bold text-brand-dark transition-colors group-hover:text-brand-primary dark:text-white">
          {app.name}
        </h3>
        <p className="relative z-10 text-sm text-brand-text-light dark:text-gray-400 mt-2 leading-relaxed">
          {app.description}
        </p>

        <div className="relative z-10 mt-6 flex items-center gap-2 text-xs font-bold" style={{ color: appColor }}>
          <span>{cta}</span>
          <ArrowRight className="h-3 w-3" />
        </div>
      </Link>
    </motion.div>
  );
}
