'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Command, Menu, Search, X } from 'lucide-react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { Button } from '../../components/Button';
import { DocsSearchResults } from '../DocsSearchResults';

const glassIconBtn =
  'glass-panel pointer-events-auto !h-10 !w-10 !rounded-xl !bg-white/[0.18] !border-white/20 shadow-sm !text-brand-foreground transition-all duration-200 hover:!bg-white/30 dark:!bg-white/[0.06] dark:!border-white/10 dark:!text-gray-100 dark:hover:!bg-white/12';

/** Animated solar/lunar SVG — controlled externally via isDark */
function SolarSwitch({ isDark }) {
  const duration = 0.7;
  const scaleMoon = useMotionValue(isDark ? 1 : 0);
  const scaleSun  = useMotionValue(isDark ? 0 : 1);
  const pathLengthMoon = useTransform(scaleMoon, [0.6, 1], [0, 1]);
  const pathLengthSun  = useTransform(scaleSun,  [0.6, 1], [0, 1]);

  const moonVariants = { checked: { scale: 1 }, unchecked: { scale: 0 } };
  const sunVariants  = { checked: { scale: 0 }, unchecked: { scale: 1 } };
  const sunStyle = { pathLength: pathLengthSun,  scale: scaleSun };
  const moonStyle = { pathLength: pathLengthMoon, scale: scaleMoon };

  return (
    <motion.div animate={isDark ? 'checked' : 'unchecked'}>
      <motion.svg width="20" height="20" viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Sun body */}
        <motion.path d="M12.4058 17.7625C15.1672 17.7625 17.4058 15.5239 17.4058 12.7625C17.4058 10.0011 15.1672 7.76251 12.4058 7.76251C9.64434 7.76251 7.40576 10.0011 7.40576 12.7625C7.40576 15.5239 9.64434 17.7625 12.4058 17.7625Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" variants={sunVariants} transition={{ duration }} style={sunStyle} />
        {/* Sun rays */}
        <motion.path d="M12.4058 1.76251V3.76251"   stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" variants={sunVariants} transition={{ duration }} style={sunStyle} />
        <motion.path d="M12.4058 21.7625V23.7625"   stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" variants={sunVariants} transition={{ duration }} style={sunStyle} />
        <motion.path d="M4.62598 4.98248L6.04598 6.40248"     stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" variants={sunVariants} transition={{ duration }} style={sunStyle} />
        <motion.path d="M18.7656 19.1225L20.1856 20.5425"     stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" variants={sunVariants} transition={{ duration }} style={sunStyle} />
        <motion.path d="M1.40576 12.7625H3.40576"   stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" variants={sunVariants} transition={{ duration }} style={sunStyle} />
        <motion.path d="M21.4058 12.7625H23.4058"   stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" variants={sunVariants} transition={{ duration }} style={sunStyle} />
        <motion.path d="M4.62598 20.5425L6.04598 19.1225"     stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" variants={sunVariants} transition={{ duration }} style={sunStyle} />
        <motion.path d="M18.7656 6.40248L20.1856 4.98248"     stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" variants={sunVariants} transition={{ duration }} style={sunStyle} />
        {/* Moon */}
        <motion.path d="M21.1918 13.2013C21.0345 14.9035 20.3957 16.5257 19.35 17.8781C18.3044 19.2305 16.8953 20.2571 15.2875 20.8379C13.6797 21.4186 11.9398 21.5294 10.2713 21.1574C8.60281 20.7854 7.07479 19.9459 5.86602 18.7371C4.65725 17.5283 3.81774 16.0003 3.4457 14.3318C3.07367 12.6633 3.18451 10.9234 3.76526 9.31561C4.346 7.70783 5.37263 6.29868 6.72501 5.25307C8.07739 4.20746 9.69959 3.56862 11.4018 3.41132C10.4052 4.75958 9.92564 6.42077 10.0503 8.09273C10.175 9.76469 10.8957 11.3364 12.0812 12.5219C13.2667 13.7075 14.8384 14.4281 16.5104 14.5528C18.1823 14.6775 19.8435 14.1979 21.1918 13.2013Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" variants={moonVariants} transition={{ duration }} style={moonStyle} />
      </motion.svg>
    </motion.div>
  );
}

export function DocsTopBar({
  branding = {},
  version,
  searchPlaceholder,
  onSearch,
  searchResults = [],
  searchStatus = 'idle',
  onMenuToggle,
  sidebarOpen = false,
  showSidebarToggle = true,
  mobileNavOpen,
  adminHref,
  isDark = false,
  onToggleTheme,
}) {
  const router = useRouter();
  const { logoPath, brandName = 'Webfudge Systems', homeHref = '/' } = branding;
  const [query, setQuery] = useState('');
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);
  const selectableResults = useMemo(() => groupSearchOrder(searchResults || []), [searchResults]);

  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setPaletteOpen(true);
      }
      if (e.key === 'Escape') {
        setPaletteOpen(false);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (!paletteOpen) return undefined;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [paletteOpen]);

  useEffect(() => {
    if (!paletteOpen) return undefined;
    const timer = setTimeout(() => {
      if (onSearch) onSearch(query);
    }, 280);
    return () => clearTimeout(timer);
  }, [query, onSearch, paletteOpen]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, selectableResults.length]);

  const closePalette = () => {
    setPaletteOpen(false);
    setQuery('');
    setActiveIndex(0);
    if (onSearch) onSearch('');
  };

  const navigateToResult = (result) => {
    const href = getResultHref(result);
    if (!href) return;
    closePalette();
    router.push(href);
  };

  const handlePaletteKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, Math.max(selectableResults.length - 1, 0)));
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    }
    if (event.key === 'Enter' && selectableResults[activeIndex]) {
      event.preventDefault();
      navigateToResult(selectableResults[activeIndex]);
    }
  };

  const triggerLabel = query || searchPlaceholder || 'Search documentation...';

  return (
    <>
      {/* ── Individual floating elements row ── */}
      <div
        className={`pointer-events-none fixed inset-x-0 top-0 z-50 flex items-center gap-3 px-4 pt-3 transition-[padding] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] lg:pr-6 ${
          sidebarOpen ? 'lg:pl-[292px]' : 'lg:pl-6'
        }`}
      >

        {/* Sidebar toggle — hides/shows the full sidebar, never an icon rail */}
        {showSidebarToggle ? (
          <Button
            size="icon"
            variant="outline"
            onClick={onMenuToggle}
            className={`${glassIconBtn} ${
              sidebarOpen || mobileNavOpen
                ? 'scale-90 opacity-0 blur-sm pointer-events-none'
                : 'scale-100 opacity-100 blur-0'
            }`}
            aria-label="Show sidebar"
            title="Show sidebar"
          >
            <Menu className="h-5 w-5" />
          </Button>
        ) : null}

        {/* Standalone logo beside the toggle; fades when sidebar already shows branding */}
        {showSidebarToggle ? (
          <Link
            href={homeHref}
            aria-label={brandName}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              sidebarOpen || mobileNavOpen
                ? 'scale-90 opacity-0 blur-sm pointer-events-none'
                : 'pointer-events-auto scale-100 opacity-100 blur-0'
            }`}
          >
            <span className="pointer-events-none absolute h-9 w-9 rounded-full bg-orange-500/25 blur-lg" aria-hidden />
            {logoPath ? (
              <Image
                src={logoPath}
                alt=""
                width={30}
                height={30}
                className="relative h-8 w-8 rounded-[0.7rem] object-contain drop-shadow-[0_0_12px_rgba(245,99,15,0.7)]"
              />
            ) : (
              <span className="relative flex h-8 w-8 items-center justify-center rounded-[0.7rem] bg-brand-primary text-xs font-bold text-white shadow-[0_0_18px_rgba(245,99,15,0.45)]">
                W
              </span>
            )}
          </Link>
        ) : null}

        {/* Centered search pill — grows to fill center */}
        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          aria-label="Open documentation search"
          className="glass-panel pointer-events-auto flex h-10 flex-1 items-center gap-3 rounded-2xl !bg-white/[0.18] !border-white/20 px-4 text-left text-sm shadow-sm transition-all duration-200 hover:!bg-white/28 dark:!bg-white/[0.06] dark:!border-white/10 dark:hover:!bg-white/10 lg:max-w-md lg:mx-auto"
        >
          <Search className="h-4 w-4 shrink-0 text-brand-text-muted dark:text-gray-400" />
          <span className="flex-1 truncate text-brand-text-muted dark:text-gray-400">{triggerLabel}</span>
          <kbd className="hidden h-5 select-none items-center gap-0.5 rounded border border-brand-border/60 bg-white/60 px-1.5 font-mono text-[9px] font-medium text-brand-text-muted dark:border-white/10 dark:bg-white/5 sm:flex">
            <Command className="h-3 w-3" />K
          </kbd>
        </button>

        {/* Right-side action islands */}
        <div className="flex items-center gap-2">
          {/* Animated theme toggle */}
          {onToggleTheme ? (
            <Button
              size="icon"
              variant="outline"
              onClick={onToggleTheme}
              className={glassIconBtn}
              aria-label="Toggle color mode"
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              <SolarSwitch isDark={isDark} />
            </Button>
          ) : null}

          {/* Version badge */}
          {version ? (
            <span className="glass-panel pointer-events-auto hidden rounded-xl !bg-white/[0.18] !border-white/20 px-3 py-1.5 text-xs font-medium text-brand-text-light shadow-sm dark:!bg-white/[0.06] dark:!border-white/10 dark:text-gray-300 sm:inline-flex items-center">
              {version}
            </span>
          ) : null}

          {/* Admin pill */}
          {adminHref ? (
            <Link
              href={adminHref}
              className="glass-panel pointer-events-auto hidden rounded-xl !bg-white/[0.18] !border-white/20 px-3 py-1.5 text-xs font-medium text-brand-foreground shadow-sm transition-all duration-200 hover:!bg-white/30 dark:!bg-white/[0.06] dark:!border-white/10 dark:text-gray-100 dark:hover:!bg-white/12 sm:inline-flex items-center"
            >
              Manage Docs
            </Link>
          ) : null}
        </div>
      </div>

      {/* ── Search palette ── */}
      {paletteOpen ? (
        <div
          className="fixed inset-0 z-[60] flex items-start justify-center bg-black/45 px-3 py-20 backdrop-blur-sm sm:px-6"
          role="dialog"
          aria-modal="true"
          aria-label="Search documentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closePalette();
          }}
        >
          <div
            className="w-full max-w-2xl overflow-hidden rounded-2xl border border-brand-border bg-white shadow-2xl dark:border-white/10 dark:bg-[#121212]"
            onKeyDown={handlePaletteKeyDown}
          >
            <div className="flex items-center gap-3 border-b border-brand-border px-4 py-3 dark:border-white/10">
              <Search className="h-5 w-5 shrink-0 text-brand-text-muted" />
              <input
                ref={inputRef}
                type="search"
                placeholder={searchPlaceholder || 'Search documentation...'}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-10 flex-1 bg-transparent text-base text-brand-dark outline-none placeholder:text-brand-text-muted dark:text-white"
              />
              <button
                type="button"
                onClick={closePalette}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-brand-text-muted hover:bg-brand-hover hover:text-brand-dark dark:hover:bg-white/10 dark:hover:text-white"
                aria-label="Close search"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <DocsSearchResults
              results={selectableResults}
              query={query}
              loading={searchStatus === 'loading'}
              activeIndex={activeIndex}
              onActiveIndexChange={setActiveIndex}
              onSelect={navigateToResult}
              onClose={closePalette}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}

function getResultHref(result) {
  if (result?.href) return result.href;
  if (result?.slug) return `/docs/${result.slug}`;
  return null;
}

function groupSearchOrder(results) {
  const groups = new Map();
  for (const result of results) {
    const group = result.type || (result.application?.name ? 'Applications' : 'Pages');
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push(result);
  }
  return [...groups.values()].flat();
}
