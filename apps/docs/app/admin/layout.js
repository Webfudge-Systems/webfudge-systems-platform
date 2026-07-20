'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  HelpCircle,
  LayoutTemplate,
  LogOut,
  MessageSquare,
  PanelLeft,
  Settings,
  Upload,
} from 'lucide-react';
import { closeCurrentTabAfterLogout, useAuth } from '@webfudge/auth';
import { isAdminDashboardOpen } from '../../lib/rbac';
import AdminGateOverlay from '../../components/admin/AdminGateOverlay';
import AdminWelcomeTransition from '../../components/admin/AdminWelcomeTransition';
import AdminThemeToggle from '../../components/admin/AdminThemeToggle';
import AdminTour, { TOUR_STORAGE_KEY } from '../../components/admin/AdminTour';

const ADMIN_TABS = [
  { id: 'upload', label: 'Ingestion Portal', href: '/admin?tab=upload', icon: Upload },
  { id: 'site', label: 'Site Content', href: '/admin?tab=site', icon: LayoutTemplate },
  { id: 'apps', label: 'Applications', href: '/admin?tab=apps', icon: Settings },
  { id: 'feedback', label: 'User Feedback', href: '/admin?tab=feedback', icon: MessageSquare },
];

const TOUR_STEPS = [
  {
    selector: '[data-tour="brand"]',
    title: 'Your admin workspace',
    description:
      'This is the Webfudge documentation control center. Everything that powers the public docs site is managed from here.',
    placement: 'right',
  },
  {
    selector: '[data-tour="nav-upload"]',
    title: 'Single ingestion portal',
    description:
      'Upload HTML, review the extracted overview, choose where it appears, and publish one reader-friendly entry with a direct documentation link.',
    placement: 'right',
  },
  {
    selector: '[data-tour="nav-site"]',
    title: 'Site Content',
    description:
      'Edit the homepage, system overview, and navigation that visitors see — no code required.',
    placement: 'right',
  },
  {
    selector: '[data-tour="nav-apps"]',
    title: 'Applications',
    description:
      'Review the products listed in the docs hub and jump to their settings.',
    placement: 'right',
  },
  {
    selector: '[data-tour="nav-feedback"]',
    title: 'User Feedback',
    description:
      'See what readers found helpful so you know which pages to improve next.',
    placement: 'right',
  },
  {
    selector: '[data-tour="theme-toggle"]',
    title: 'Light & dark mode',
    description:
      'Toggle the theme anytime. Your choice is remembered across the whole docs experience.',
    placement: 'bottom',
  },
  {
    selector: '[data-tour="restart-tour"]',
    title: "You're all set",
    description:
      'Replay this tour whenever you need a refresher by clicking here. Happy documenting!',
    placement: 'bottom',
  },
];

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const { user, loading, isAuthenticated, isAdmin, logout } = useAuth();
  const [showWelcome, setShowWelcome] = useState(false);
  const [welcomeName, setWelcomeName] = useState('');
  const [tourOpen, setTourOpen] = useState(false);

  const isSignInPage = pathname === '/admin/sign-in';
  const devOpen = isAdminDashboardOpen();

  const isAuthorizedAdmin = isAuthenticated && isAdmin();
  const canEnter = devOpen || (!loading && isAuthorizedAdmin);
  const shouldShowGate = !isSignInPage && !loading && !canEnter && !devOpen;

  // Derive a friendly display name from the signed-in email address.
  const displayName = deriveAdminName(user);

  useEffect(() => {
    if (loading || !canEnter) return;
    if (isSignInPage) return;

    const sessionKey = 'docs-admin-welcome-seen';
    if (sessionStorage.getItem(sessionKey)) return;

    setWelcomeName(displayName);
    setShowWelcome(true);

    const timer = setTimeout(() => {
      sessionStorage.setItem(sessionKey, 'true');
      setShowWelcome(false);
      maybeStartTour();
    }, 1900);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, canEnter, isSignInPage, displayName]);

  function maybeStartTour() {
    try {
      if (!localStorage.getItem(TOUR_STORAGE_KEY)) {
        setTimeout(() => setTourOpen(true), 350);
      }
    } catch (_) {}
  }

  function handleSignOut() {
    logout();
    closeCurrentTabAfterLogout();
  }

  useEffect(() => {
    if (isSignInPage && canEnter) {
      router.replace('/admin');
    }
  }, [isSignInPage, canEnter, router]);

  if (loading && !devOpen && !isSignInPage) {
    return (
      <div className="admin-shell fixed inset-0 z-[80] flex items-center justify-center" style={{ background: 'var(--admin-bg)' }}>
        <span className="text-sm" style={{ color: 'var(--admin-muted)' }}>
          Checking authentication…
        </span>
      </div>
    );
  }

  if (!devOpen && !isSignInPage && isAuthenticated && !isAdmin()) {
    return (
      <div className="admin-shell fixed inset-0 z-[80] flex items-center justify-center px-4 text-center" style={{ background: 'var(--admin-bg)' }}>
        <p
          className="max-w-md rounded-2xl border p-6 text-sm"
          style={{ background: 'var(--admin-panel)', borderColor: 'var(--admin-border)', color: 'var(--admin-text-soft)' }}
        >
          Signed in as <strong>{user?.email}</strong>, but this account is not authorized for docs admin.
        </p>
      </div>
    );
  }

  if (isSignInPage) {
    return children;
  }

  const activeTab = getActiveTab(pathname, searchParams);

  return (
    <div className="admin-shell fixed inset-0 z-[70] flex" style={{ background: 'var(--admin-bg)', color: 'var(--admin-text)' }}>
      <div className="admin-aurora" aria-hidden />
      <div className="admin-grid-overlay" aria-hidden />

      <aside
        className="admin-glass relative z-10 hidden w-72 shrink-0 flex-col px-4 py-5 lg:flex"
        style={{ background: 'var(--admin-panel)', borderRight: '1px solid var(--admin-border)' }}
      >
        <Link
          href="/admin?tab=pages"
          data-tour="brand"
          className="mb-6 flex items-center gap-3 rounded-2xl border px-4 py-3"
          style={{ background: 'var(--admin-panel-soft)', borderColor: 'var(--admin-border)' }}
        >
          <span
            className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-black text-white"
            style={{ background: 'var(--admin-accent)', boxShadow: '0 8px 20px -6px var(--admin-accent-ring)' }}
          >
            W
          </span>
          <span>
            <span className="block text-sm font-bold" style={{ color: 'var(--admin-text)' }}>Webfudge</span>
            <span className="block text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--admin-muted)' }}>
              Docs Admin
            </span>
          </span>
        </Link>

        <nav className="space-y-1" aria-label="Admin sections">
          {ADMIN_TABS.map((item) => (
            <AdminNavItem key={item.id} item={item} active={activeTab === item.id} />
          ))}
        </nav>

        <div className="mt-auto space-y-3">
          <button
            type="button"
            data-tour="restart-tour"
            onClick={() => setTourOpen(true)}
            className="flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold transition hover:opacity-90"
            style={{ background: 'var(--admin-accent-soft)', borderColor: 'var(--admin-border)', color: 'var(--admin-accent)' }}
          >
            <HelpCircle className="h-4 w-4" />
            Take a guided tour
          </button>

          <div className="rounded-2xl border p-4" style={{ background: 'var(--admin-panel-soft)', borderColor: 'var(--admin-border)' }}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--admin-muted)' }}>
              Signed in
            </p>
            <p className="mt-1 truncate text-xs" style={{ color: 'var(--admin-text-soft)' }}>
              {user?.email || 'Development access'}
            </p>
            <button
              type="button"
              onClick={handleSignOut}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition hover:opacity-90"
              style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-soft)', background: 'var(--admin-panel)' }}
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </div>
        </div>
      </aside>

      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <header
          className="admin-glass px-4 py-4 sm:px-6 lg:px-8"
          style={{ background: 'var(--admin-panel)', borderBottom: '1px solid var(--admin-border)' }}
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--admin-muted)' }}>
                <PanelLeft className="h-3.5 w-3.5" />
                {getBreadcrumbLabel(pathname, searchParams)}
              </div>
              <h1 className="mt-1 text-xl font-black tracking-tight sm:text-2xl" style={{ color: 'var(--admin-text)' }}>
                {getPageTitle(pathname, searchParams)}
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span data-tour="theme-toggle">
                <AdminThemeToggle />
              </span>
              <Link
                href="/admin?tab=upload"
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-white transition hover:opacity-90"
                style={{ background: 'var(--admin-accent)', boxShadow: '0 8px 20px -8px var(--admin-accent-ring)' }}
              >
                <Upload className="h-4 w-4" />
                Upload HTML
              </Link>
            </div>
          </div>

          <nav className="mt-4 flex gap-2 overflow-x-auto pb-1 lg:hidden" aria-label="Admin sections">
            {ADMIN_TABS.map((item) => (
              <AdminMobileTab key={item.id} item={item} active={activeTab === item.id} />
            ))}
          </nav>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>

      <AdminGateOverlay open={shouldShowGate} />
      <AdminWelcomeTransition show={showWelcome} name={welcomeName} />
      <AdminTour steps={TOUR_STEPS} open={tourOpen} onClose={() => setTourOpen(false)} />
    </div>
  );
}

function deriveAdminName(user) {
  if (!user) return 'Admin';
  if (user.email) {
    const prefix = user.email.split('@')[0] || '';
    const cleaned = prefix.replace(/[._-]+/g, ' ').trim();
    if (cleaned) {
      return cleaned
        .split(' ')
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
    }
  }
  return user.firstName || user.username || 'Admin';
}

function AdminNavItem({ item, active }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      data-tour={`nav-${item.id}`}
      className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition"
      style={
        active
          ? { background: 'var(--admin-accent-soft)', color: 'var(--admin-accent)', boxShadow: 'inset 0 0 0 1px var(--admin-accent-ring)' }
          : { color: 'var(--admin-text-soft)' }
      }
    >
      <Icon className="h-4 w-4" />
      {item.label}
    </Link>
  );
}

function AdminMobileTab({ item, active }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className="inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-xs font-bold transition"
      style={
        active
          ? { background: 'var(--admin-accent)', color: 'var(--admin-on-accent)' }
          : { background: 'var(--admin-panel-soft)', border: '1px solid var(--admin-border)', color: 'var(--admin-text-soft)' }
      }
    >
      <Icon className="h-3.5 w-3.5" />
      {item.label}
    </Link>
  );
}

function getActiveTab(pathname, searchParams) {
  if (pathname === '/admin/new') return 'upload';
  if (pathname === '/admin/publish') return 'apps';
  if (/^\/admin\/[^/]+\/edit$/.test(pathname)) return 'upload';
  const requested = searchParams.get('tab');
  return ADMIN_TABS.some((item) => item.id === requested) ? requested : 'upload';
}

function getBreadcrumbLabel(pathname, searchParams) {
  if (pathname === '/admin/new') return 'Admin / New Page';
  if (pathname === '/admin/publish') return 'Admin / Publish App';
  if (/^\/admin\/[^/]+\/edit$/.test(pathname)) return 'Admin / Edit Page';
  const tab = ADMIN_TABS.find((item) => item.id === getActiveTab(pathname, searchParams));
  return `Admin / ${tab?.label || 'Dashboard'}`;
}

function getPageTitle(pathname, searchParams) {
  if (pathname === '/admin/new') return 'Create Documentation Page';
  if (pathname === '/admin/publish') return 'Publish Application';
  if (/^\/admin\/[^/]+\/edit$/.test(pathname)) return 'Edit Documentation Page';
  if (pathname !== '/admin') return 'Admin Workspace';
  const tab = ADMIN_TABS.find((item) => item.id === getActiveTab(pathname, searchParams));
  return tab?.label || 'Docs Pages';
}
