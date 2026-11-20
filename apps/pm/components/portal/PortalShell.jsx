'use client';

import Link from 'next/link';
import { LogOut } from 'lucide-react';

/** Header + page frame for the client portal. */
export default function PortalShell({ me, onSignOut, children }) {
  return (
    <>
      <header className="sticky top-0 z-10 border-b border-gray-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4">
          <Link href="/portal" className="flex min-w-0 items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F5630F] text-sm font-bold text-white">
              {(me?.organization?.name || 'W').slice(0, 1).toUpperCase()}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold leading-tight">{me?.organization?.name || 'Client portal'}</span>
              <span className="block truncate text-[11px] leading-tight text-gray-500">Client portal{me?.client?.name ? ` · ${me.client.name}` : ''}</span>
            </span>
          </Link>
          {me ? (
            <div className="flex shrink-0 items-center gap-3">
              <span className="hidden text-right sm:block">
                <span className="block text-sm font-medium leading-tight">{me.contact.name}</span>
                <span className="block text-[11px] leading-tight text-gray-500">{me.contact.email}</span>
              </span>
              <button
                type="button"
                onClick={onSignOut}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                <LogOut className="h-3.5 w-3.5" /> Sign out
              </button>
            </div>
          ) : null}
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6 sm:py-10">{children}</main>
      <footer className="mx-auto max-w-5xl px-4 pb-8 text-center text-xs text-gray-400">Powered by Webfudge Work</footer>
    </>
  );
}

export function ProgressBar({ percent }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full bg-[#F5630F] transition-all" style={{ width: `${Math.max(0, Math.min(100, percent))}%` }} />
    </div>
  );
}

const STATUS = {
  COMPLETED: { label: 'Done', cls: 'bg-emerald-50 text-emerald-700' },
  IN_PROGRESS: { label: 'In progress', cls: 'bg-blue-50 text-blue-700' },
  ACTIVE: { label: 'In progress', cls: 'bg-blue-50 text-blue-700' },
  INTERNAL_REVIEW: { label: 'In review', cls: 'bg-violet-50 text-violet-700' },
  ON_HOLD: { label: 'On hold', cls: 'bg-gray-100 text-gray-600' },
  CANCELLED: { label: 'Cancelled', cls: 'bg-gray-100 text-gray-500' },
  OVERDUE: { label: 'Overdue', cls: 'bg-rose-50 text-rose-700' },
  SCHEDULED: { label: 'Planned', cls: 'bg-gray-100 text-gray-700' },
};

export function StatusPill({ status }) {
  const s = STATUS[String(status || '').toUpperCase()] || { label: String(status || 'Planned').replace(/_/g, ' ').toLowerCase(), cls: 'bg-gray-100 text-gray-700' };
  return <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${s.cls}`}>{s.label}</span>;
}

export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : null);
