'use client';

import { useRef, useState } from 'react';
import { DocsTopBar } from '../DocsTopBar';
import { DocsSidebar } from '../DocsSidebar';
import { DocsMeshBackground } from '../DocsMeshBackground/DocsMeshBackground';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';

export function DocsShell({
  children,
  navigation = [],
  branding,
  version,
  searchPlaceholder = 'Search documentation…',
  onSearch,
  searchResults = [],
  searchStatus = 'idle',
  activeHref,
  adminHref,
  isDark = false,
  onToggleTheme,
  hideSidebar = false,
}) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);
  const mainRef = useRef(null);

  const handleSidebarToggle = () => {
    if (typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches) {
      setDesktopSidebarOpen((open) => !open);
      return;
    }
    setMobileNavOpen((open) => !open);
  };

  return (
    <div className="h-screen bg-[#fff7ed] text-brand-dark dark:bg-[#0a0a0a] dark:text-gray-100 flex flex-col transition-colors relative overflow-hidden">
      <DocsMeshBackground isDark={isDark} />

      <DocsTopBar
        branding={branding}
        version={version}
        searchPlaceholder={searchPlaceholder}
        onSearch={onSearch}
        searchResults={searchResults}
        searchStatus={searchStatus}
        onMenuToggle={handleSidebarToggle}
        sidebarOpen={desktopSidebarOpen}
        showSidebarToggle={!hideSidebar}
        mobileNavOpen={mobileNavOpen}
        adminHref={adminHref}
        isDark={isDark}
        onToggleTheme={onToggleTheme}
      />

      <div className="flex flex-1 min-h-0 relative z-10">
        <AnimatePresence>
          {mobileNavOpen ? (
            <motion.button
              type="button"
              aria-label="Close navigation"
              className="fixed inset-x-0 bottom-0 top-16 z-30 bg-black/40 lg:hidden"
              onClick={() => setMobileNavOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            />
          ) : null}
        </AnimatePresence>

        {!hideSidebar ? (
          <div
            className={clsx(
              'lg:relative lg:z-10 lg:shrink-0 lg:overflow-hidden lg:transition-[width,opacity] lg:duration-500 lg:ease-[cubic-bezier(0.22,1,0.36,1)]',
              desktopSidebarOpen ? 'lg:w-[272px] lg:opacity-100' : 'lg:w-0 lg:opacity-0'
            )}
          >
            <DocsSidebar
              navigation={navigation}
              activeHref={activeHref}
              version={version}
              branding={branding}
              className={clsx(
                mobileNavOpen ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0',
                desktopSidebarOpen
                  ? 'lg:translate-x-0 lg:opacity-100'
                  : 'lg:-translate-x-full lg:opacity-0 lg:pointer-events-none'
              )}
              onNavigate={() => setMobileNavOpen(false)}
              onToggleSidebar={handleSidebarToggle}
            />
          </div>
        ) : null}

        <main ref={mainRef} className="flex-1 min-w-0 overflow-y-auto relative pt-16 scrollbar-custom">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeHref}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: 'easeInOut' }}
              className={clsx(
                "mx-auto w-full transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]",
                !hideSidebar && "px-6 pb-10 pt-4 lg:px-10 lg:pb-12 lg:pt-6",
                !hideSidebar && "max-w-6xl"
              )}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
