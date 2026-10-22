'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { DocsShell } from '@webfudge/ui/doc-components';
import { STATIC_NAVIGATION, buildNavigationFromPages } from '../lib/navigation';
import { DEFAULT_SITE_CONTENT } from '../lib/siteContentDefaults';
import { DOCS_SITE } from '../lib/site';
import { getPublishedPages, searchPages } from '../lib/api/documentationService';
import { isAdminDashboardOpen } from '../lib/rbac';
import { useAuth } from '@webfudge/auth';
import { useTheme } from 'next-themes';

export default function DocsLayoutClient({ children }) {
  const pathname = usePathname();
  const activeHref = pathname === '/' ? '/' : pathname.replace(/\/$/, '');
  const { isAdmin, isAuthenticated, loading: authLoading } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();

  const [navigation, setNavigation] = useState(STATIC_NAVIGATION);
  const [searchResults, setSearchResults] = useState([]);
  const [searchStatus, setSearchStatus] = useState('idle');

  // Load dynamic navigation from Strapi + editable site content
  useEffect(() => {
    Promise.all([
      getPublishedPages(),
      fetch('/api/site-content').then((r) => r.json()).catch(() => ({ data: null })),
    ])
      .then(([pages, siteRes]) => {
        const baseNav = siteRes?.data?.navigation || DEFAULT_SITE_CONTENT.navigation;
        if (pages.length > 0) {
          const dynamic = buildNavigationFromPages(pages);
          setNavigation(mergeNavigation(baseNav, dynamic));
        } else {
          setNavigation(baseNav);
        }
      })
      .catch(() => {
        setNavigation(DEFAULT_SITE_CONTENT.navigation);
      });
  }, []);

  const isDocsAdmin = isAuthenticated && isAdmin();
  const showAdminDashboard = !authLoading && (isDocsAdmin || isAdminDashboardOpen());
  const adminHref = showAdminDashboard ? '/admin' : '/admin/sign-in';

  const handleSearch = useCallback(async (query) => {
    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      setSearchStatus('idle');
      return;
    }
    setSearchStatus('loading');
    try {
      const results = await searchPages(query);
      setSearchResults(mergeSearchResults(buildLocalSearchResults(query, navigation, showAdminDashboard), results));
      setSearchStatus('success');
    } catch {
      setSearchResults(buildLocalSearchResults(query, navigation, showAdminDashboard));
      setSearchStatus('error');
    }
  }, [navigation, showAdminDashboard]);

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  const isDark = resolvedTheme === 'dark';

  // If this is a specific application's immersive docs page, render without the DocsShell wrapper
  // to remove the sidebar and allow a full-screen, immersive experience.
  const isImmersiveDocsPage = /^\/applications\/[^\/]+\/docs\/?$/.test(pathname);
  const isStandaloneHtmlDoc = /\.html$/i.test(decodeURIComponent(pathname || ''));
  const isAdminRoute = pathname?.startsWith('/admin');

  if (!isMounted) return null;
  if (isAdminRoute || isStandaloneHtmlDoc) return children;

  return (
    <DocsShell
      navigation={navigation}
      activeHref={activeHref}
      version={DOCS_SITE.version}
      branding={{
        logoPath: DOCS_SITE.logoPath,
        brandName: DOCS_SITE.brandName,
        homeHref: '/',
      }}
      onSearch={handleSearch}
      searchResults={searchResults}
      searchStatus={searchStatus}
      adminHref={adminHref}
      isDark={isDark}
      onToggleTheme={() => setTheme(isDark ? 'light' : 'dark')}
      hideSidebar={isImmersiveDocsPage}
    >
      {children}
    </DocsShell>
  );
}

function mergeNavigation(baseNav, dynamicNav) {
  const merged = baseNav.map((section) => ({
    ...section,
    items: [...(section.items || [])],
  }));

  for (const dynamicSection of dynamicNav || []) {
    const existing = merged.find((section) => section.key === dynamicSection.key);
    if (!existing) {
      merged.push(dynamicSection);
      continue;
    }

    const seenHrefs = new Set((existing.items || []).map((item) => item.href));
    const newItems = (dynamicSection.items || []).filter((item) => !seenHrefs.has(item.href));
    existing.items = [...(existing.items || []), ...newItems];
  }

  return merged;
}

function buildLocalSearchResults(query, navigation, includeAdmin) {
  const term = query.trim().toLowerCase();
  const results = [];

  for (const section of navigation) {
    for (const item of section.items || []) {
      const haystack = `${section.title} ${item.label} ${item.description || ''}`.toLowerCase();
      if (haystack.includes(term)) {
        results.push({
          id: `nav:${item.href}`,
          title: item.label,
          description: item.description || section.title,
          href: item.href,
          category: section.title,
          type: item.href?.startsWith('/applications') ? 'Applications' : item.href?.startsWith('/components') ? 'Components' : 'Pages',
        });
      }
    }
  }

  if (includeAdmin) {
    [
      { title: 'Manage Docs', description: 'Create, publish, and review documentation.', href: '/admin' },
      { title: 'Ingestion Console', description: 'Upload README files and imported guides.', href: '/admin?tab=upload' },
      { title: 'User Feedback Logs', description: 'Review public docs feedback.', href: '/admin?tab=feedback' },
    ].forEach((item) => {
      const haystack = `${item.title} ${item.description}`.toLowerCase();
      if (haystack.includes(term)) {
        results.push({ ...item, id: `admin:${item.href}`, category: 'Admin', type: 'Admin Tools' });
      }
    });
  }

  return results;
}

function mergeSearchResults(localResults, remoteResults) {
  const seen = new Set();
  const normalizedRemote = (remoteResults || []).map((page) => ({
    ...page,
    id: page.id || page.documentId || page.slug,
    href: page.href || `/docs/${page.slug}`,
    type: page.application?.name ? 'Applications' : 'Pages',
  }));

  return [...localResults, ...normalizedRemote].filter((result) => {
    const key = result.href || result.slug || result.id || result.title;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
