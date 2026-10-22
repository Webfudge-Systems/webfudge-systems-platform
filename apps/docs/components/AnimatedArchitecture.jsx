'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  Settings, 
  ShieldCheck, 
  Network, 
  Cpu, 
  Database, 
  HardDrive 
} from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 30 },
  visible: { 
    opacity: 1, 
    scale: 1, 
    y: 0,
    transition: { type: 'spring', stiffness: 100, damping: 20 }
  }
};

const NodeCard = ({ icon: Icon, title, description, colorClass, highlightClass }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div 
      variants={itemVariants}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ y: -6, scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className="glass-panel relative z-10 flex cursor-default flex-col items-start overflow-hidden rounded-2xl p-6"
    >
      {/* Interactive Spotlight Glow */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isHovered ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        className={`absolute inset-0 z-0 opacity-0 pointer-events-none transition-opacity duration-300 ${highlightClass}`}
        style={{
          background: `radial-gradient(circle at 10% 10%, var(--tw-gradient-from) 0%, transparent 60%)`
        }}
      />
      
      <div className={`relative z-10 p-3 rounded-xl mb-5 shadow-sm bg-white dark:bg-black/80 border border-black/5 dark:border-white/10 transition-colors duration-300 ${colorClass}`}>
        <Icon className="w-6 h-6" />
      </div>
      
      <h4 className="relative z-10 text-brand-dark dark:text-white font-bold mb-2 text-lg tracking-tight">{title}</h4>
      <p className="relative z-10 text-sm text-brand-text-light dark:text-gray-400 leading-relaxed font-medium">{description}</p>
      
      {/* Animated Bottom Border Accent */}
      <motion.div 
        initial={{ scaleX: 0 }}
        animate={{ scaleX: isHovered ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        className={`absolute bottom-0 left-0 right-0 h-1 origin-left ${colorClass.split(' ')[0]} bg-current`}
      />
    </motion.div>
  );
};

// SVG Data Pipeline Component with Non-Scaling Stroke
const DataPipeline = ({ pathId, startY, endY, delay, color }) => {
  return (
    <div className="absolute inset-0 pointer-events-none hidden md:block z-0">
      <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <linearGradient id={`pulse-${pathId}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="50%" stopColor={color} />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
        </defs>
        
        {/* Background Track */}
        <path 
          d={`M 33 ${startY} C 45 ${startY}, 45 ${endY}, 66 ${endY}`} 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          vectorEffect="non-scaling-stroke"
          strokeDasharray="6 6"
          className="text-brand-primary/20 dark:text-white/10"
        />
        
        {/* Animated Pulse */}
        <motion.path 
          d={`M 33 ${startY} C 45 ${startY}, 45 ${endY}, 66 ${endY}`} 
          fill="none" 
          stroke={`url(#pulse-${pathId})`} 
          strokeWidth="3" 
          vectorEffect="non-scaling-stroke"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{
            pathLength: [0, 1],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: delay
          }}
          style={{ filter: `drop-shadow(0 0 4px ${color})` }}
        />
      </svg>
    </div>
  );
};

export default function AnimatedArchitecture({ appName = "System" }) {
  return (
    <div className="relative w-full py-10 bg-transparent">
      <motion.div 
        className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-16 px-4 max-w-[1300px] mx-auto"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-50px" }}
      >
        {/* Layer 1: Client */}
        <div className="flex flex-col space-y-8 relative">
          <h3 className="text-sm font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em] mb-2 flex items-center gap-3">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs">1</span>
            Client Interface
          </h3>
          
          <NodeCard 
            icon={LayoutDashboard} 
            title="User Dashboard" 
            description="The primary frontend interface providing intuitive interactions and seamless data visualization."
            colorClass="text-indigo-600 dark:text-indigo-400"
            highlightClass="from-indigo-500/20 dark:from-indigo-500/30"
          />
          <NodeCard 
            icon={Settings} 
            title="Admin Panel" 
            description="Mission-control console for high-level system administration and oversight."
            colorClass="text-indigo-600 dark:text-indigo-400"
            highlightClass="from-indigo-500/20 dark:from-indigo-500/30"
          />
        </div>

        {/* Layer 2: Core Engine */}
        <div className="flex flex-col space-y-8 relative">
          <h3 className="text-sm font-bold text-orange-600 dark:text-orange-400 uppercase tracking-[0.2em] mb-2 flex items-center gap-3">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 text-xs">2</span>
            {appName} Engine
          </h3>
          
          <NodeCard 
            icon={ShieldCheck} 
            title="Authentication" 
            description="Bank-grade JWT access control and strict identity validation mechanisms."
            colorClass="text-rose-600 dark:text-rose-400"
            highlightClass="from-rose-500/20 dark:from-rose-500/30"
          />
          <NodeCard 
            icon={Network} 
            title="Data Router" 
            description="Ultra-fast intelligent request routing, edge caching, and API gateway logic."
            colorClass="text-orange-600 dark:text-orange-400"
            highlightClass="from-orange-500/20 dark:from-orange-500/30"
          />
          <NodeCard 
            icon={Cpu} 
            title="Business Logic" 
            description="High-performance core processing algorithms executing complex state modifications."
            colorClass="text-emerald-600 dark:text-emerald-400"
            highlightClass="from-emerald-500/20 dark:from-emerald-500/30"
          />
        </div>

        {/* Layer 3: Infrastructure */}
        <div className="flex flex-col space-y-8 relative">
          <h3 className="text-sm font-bold text-blue-600 dark:text-blue-400 uppercase tracking-[0.2em] mb-2 flex items-center gap-3">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs">3</span>
            Infrastructure
          </h3>
          
          <NodeCard 
            icon={Database} 
            title="Primary Database" 
            description="Highly available, persistent relational storage with automated replication."
            colorClass="text-blue-600 dark:text-blue-400"
            highlightClass="from-blue-500/20 dark:from-blue-500/30"
          />
          <NodeCard 
            icon={HardDrive} 
            title="Cache Layer" 
            description="In-memory Redis store for instantaneous data retrieval and session management."
            colorClass="text-sky-600 dark:text-sky-400"
            highlightClass="from-sky-500/20 dark:from-sky-500/30"
          />
        </div>
      </motion.div>

      {/* Responsive SVG Data Pipelines mapping exactly between columns */}
      <DataPipeline pathId="1" startY="25" endY="25" delay={0} color="#f43f5e" />     {/* Dashboard -> Auth */}
      <DataPipeline pathId="2" startY="25" endY="50" delay={0.4} color="#f97316" />   {/* Dashboard -> Router */}
      <DataPipeline pathId="3" startY="55" endY="50" delay={0.8} color="#f97316" />   {/* Admin -> Router */}
      <DataPipeline pathId="4" startY="55" endY="75" delay={1.2} color="#10b981" />   {/* Admin -> Logic */}
      
      {/* Col 2 -> Col 3 Links. X coordinates: M 66 Y1 C 80 Y1, 80 Y2, 100 Y2  */}
      <div className="absolute inset-0 pointer-events-none hidden md:block z-0">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <linearGradient id="pulse-5" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="transparent" /><stop offset="50%" stopColor="#3b82f6" /><stop offset="100%" stopColor="transparent" />
            </linearGradient>
            <linearGradient id="pulse-6" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="transparent" /><stop offset="50%" stopColor="#0ea5e9" /><stop offset="100%" stopColor="transparent" />
            </linearGradient>
            <linearGradient id="pulse-7" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="transparent" /><stop offset="50%" stopColor="#3b82f6" /><stop offset="100%" stopColor="transparent" />
            </linearGradient>
          </defs>

          {/* Router -> DB */}
          <path d="M 66 50 C 78 50, 78 35, 100 35" fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeDasharray="6 6" className="text-brand-primary/20 dark:text-white/10" />
          <motion.path d="M 66 50 C 78 50, 78 35, 100 35" fill="none" stroke="url(#pulse-5)" strokeWidth="3" vectorEffect="non-scaling-stroke" initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: [0, 1], opacity: [0, 1, 0] }} transition={{ duration: 2.5, repeat: Infinity, delay: 0.6 }} style={{ filter: 'drop-shadow(0 0 4px #3b82f6)' }} />
          
          {/* Router -> Cache */}
          <path d="M 66 50 C 78 50, 78 70, 100 70" fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeDasharray="6 6" className="text-brand-primary/20 dark:text-white/10" />
          <motion.path d="M 66 50 C 78 50, 78 70, 100 70" fill="none" stroke="url(#pulse-6)" strokeWidth="3" vectorEffect="non-scaling-stroke" initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: [0, 1], opacity: [0, 1, 0] }} transition={{ duration: 2.5, repeat: Infinity, delay: 1.1 }} style={{ filter: 'drop-shadow(0 0 4px #0ea5e9)' }} />
          
          {/* Logic -> DB */}
          <path d="M 66 75 C 78 75, 78 35, 100 35" fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeDasharray="6 6" className="text-brand-primary/20 dark:text-white/10" />
          <motion.path d="M 66 75 C 78 75, 78 35, 100 35" fill="none" stroke="url(#pulse-7)" strokeWidth="3" vectorEffect="non-scaling-stroke" initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: [0, 1], opacity: [0, 1, 0] }} transition={{ duration: 2.5, repeat: Infinity, delay: 1.6 }} style={{ filter: 'drop-shadow(0 0 4px #3b82f6)' }} />
        </svg>
      </div>

    </div>
  );
}
