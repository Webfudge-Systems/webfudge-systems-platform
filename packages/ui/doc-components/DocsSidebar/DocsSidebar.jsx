'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ChevronDown,
  X,
} from 'lucide-react';
import { clsx } from 'clsx';

const STORAGE_KEY = 'docs-sidebar-sections';

function getSectionKey(section) {
  return section.key || section.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// App badge for application links
function getAppBadge(href, label) {
  if (!href.includes('/applications/')) return null;
  const slug = href.split('/').pop()?.toLowerCase();

  let color = '#F5630F';
  let initials = 'AP';

  if (slug === 'crm') { color = '#F5630F'; initials = 'CG'; }
  else if (slug === 'pm') { color = '#6366f1'; initials = 'FF'; }
  else if (slug === 'accounts') { color = '#059669'; initials = 'FB'; }
  else if (slug === 'zenith') { color = '#a855f7'; initials = 'ZN'; }
  else { initials = label.split(' ')[0]?.slice(0, 2).toUpperCase() || 'AP'; }

  return (
    <span
      className="mr-2 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded bg-opacity-10 text-[9px] font-bold shadow-sm"
      style={{ backgroundColor: `${color}20`, color }}
    >
      {initials}
    </span>
  );
}

export function DocsSidebar({
  navigation = [],
  activeHref,
  version,
  branding = {},
  className,
  onNavigate,
  onToggleSidebar,
}) {
  const sectionKeys = useMemo(
    () => navigation.reduce((acc, section) => ({ ...acc, [getSectionKey(section)]: section.defaultExpanded !== false }), {}),
    [navigation]
  );
  const [expandedSections, setExpandedSections] = useState(sectionKeys);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      setExpandedSections(saved ? { ...sectionKeys, ...JSON.parse(saved) } : sectionKeys);
    } catch {
      setExpandedSections(sectionKeys);
    }
  }, [sectionKeys]);

  useEffect(() => {
    const activeSection = navigation.find((section) =>
      section.items.some((item) => activeHref === item.href || (item.href !== '/' && activeHref?.startsWith(item.href)))
    );
    if (!activeSection) return;
    const key = getSectionKey(activeSection);
    setExpandedSections((current) => ({ ...current, [key]: true }));
  }, [activeHref, navigation]);

  function toggleSection(key) {
    setExpandedSections((current) => {
      const next = { ...current, [key]: !current[key] };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore
      }
      return next;
    });
  }

  return (
    <aside
      className={clsx(
        // Base: fixed drawer on mobile, static rail on desktop
        'fixed bottom-4 left-4 top-16 z-40 flex flex-col overflow-hidden h-full lg:static lg:inset-auto lg:z-0 lg:shrink-0 lg:overflow-hidden',
        // Glass effect
        'glass-panel !rounded-2xl !bg-white/[0.18] !border-white/20 dark:!bg-white/[0.06] dark:!border-white/10 lg:!border-l-0 lg:!border-y-0 lg:!rounded-none',
        // Smooth mobile slide transition
        'w-[272px] will-change-transform transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]',
        // Mobile visibility
        className
      )}
    >
      {/* ── Branding header ── */}
      <div
        className="flex items-center justify-between gap-3 border-b border-brand-border/30 px-4 py-3 transition-all duration-300 dark:border-white/5"
      >
        <Link
          href={branding.homeHref || '/'}
          className="group flex min-w-0 items-center gap-2.5"
          onClick={onNavigate}
        >
          {branding.logoPath ? (
            <Image
              src={branding.logoPath}
              alt=""
              width={28}
              height={28}
              className="h-7 w-7 shrink-0 rounded-lg object-contain transition-transform duration-200 group-hover:scale-105"
            />
          ) : (
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-primary text-xs font-bold text-white transition-transform duration-200 group-hover:scale-105">
              W
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight text-brand-dark dark:text-gray-100">
              {branding.brandName || 'Webfudge Systems'}
            </p>
            {version ? (
              <p className="text-[10px] font-medium text-brand-text-muted dark:text-gray-400">
                {version}
              </p>
            ) : null}
          </div>
        </Link>
        {onToggleSidebar ? (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="glass-panel inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl !border-white/20 !bg-white/[0.16] text-brand-text-muted transition-all duration-200 hover:!bg-white/28 hover:text-brand-foreground dark:!border-white/10 dark:!bg-white/[0.06] dark:text-gray-300 dark:hover:!bg-white/12 dark:hover:text-white"
            aria-label="Hide sidebar"
            title="Hide sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {/* ── Navigation ── */}
      <div className="flex flex-1 flex-col overflow-y-auto overflow-x-hidden py-4 scrollbar-custom">
        {version ? (
          <p className="mb-4 px-6 text-xs font-medium text-brand-text-muted lg:hidden">{version}</p>
        ) : null}

        <nav className="space-y-6 px-4">
          {navigation.map((section) => {
              const sectionKey = getSectionKey(section);
              const isExpanded = expandedSections[sectionKey] !== false;

              return (
                <div key={sectionKey}>
                  <button
                    type="button"
                    onClick={() => toggleSection(sectionKey)}
                    className="mb-2 flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-[11px] font-bold uppercase tracking-wider text-brand-text-muted transition-all duration-200 hover:bg-white/60 hover:text-brand-foreground dark:hover:bg-white/5 dark:hover:text-gray-100 hover:pl-3"
                    aria-expanded={isExpanded}
                  >
                    <span>{section.title}</span>
                    <ChevronDown
                      className={clsx('h-3.5 w-3.5 transition-transform duration-200', isExpanded ? 'rotate-0' : '-rotate-90')}
                      aria-hidden
                    />
                  </button>
                  <div
                    className={clsx(
                      'grid transition-[grid-template-rows,opacity] duration-200 ease-out',
                      isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                    )}
                  >
                    <ul className="min-h-0 space-y-0.5 overflow-hidden">
                      {section.items.map((item) => {
                        if (!item.label || !item.href) return null;
                        const isActive =
                          activeHref === item.href ||
                          (item.href !== '/' && activeHref?.startsWith(item.href));
                        const appBadge = getAppBadge(item.href, item.label);

                        return (
                          <li key={item.href}>
                            <Link
                              href={item.href}
                              onClick={onNavigate}
                              className={clsx(
                                'flex items-center rounded-xl border-l-[3px] px-3 py-2 text-sm transition-all duration-300',
                                isActive
                                  ? 'border-brand-primary bg-orange-500/10 font-semibold text-brand-primary shadow-sm dark:bg-orange-500/15 dark:text-orange-400 translate-x-1'
                                  : 'border-transparent text-brand-text-light hover:bg-white/60 hover:text-brand-foreground hover:translate-x-1 dark:text-gray-300 dark:hover:bg-white/5 dark:hover:text-gray-100'
                              )}
                            >
                              {appBadge}
                              <span className="truncate">{item.label}</span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              );
          })}
        </nav>
      </div>

      {/* ── Footer: version ── */}
      <div
        className="hidden border-t border-brand-border/30 px-4 py-4 transition-all duration-300 dark:border-[#2a2a2a] lg:block"
      >
        {version ? (
          <p className="px-2 text-xs text-brand-text-muted">{version}</p>
        ) : null}
      </div>
    </aside>
  );
}
