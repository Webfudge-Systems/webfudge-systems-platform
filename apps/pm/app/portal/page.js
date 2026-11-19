'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CalendarDays, FolderKanban, MailCheck } from 'lucide-react';
import PortalShell, { ProgressBar, StatusPill, fmtDate } from '../../components/portal/PortalShell';
import usePortalMe from '../../components/portal/usePortalMe';
import { portalRequest } from '../../lib/portalClient';

function SignIn({ notice }) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await portalRequest('/auth/request-link', { method: 'POST', body: { email } });
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto mt-6 max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:mt-16 sm:p-8">
      {sent ? (
        <div className="text-center">
          <MailCheck className="mx-auto h-10 w-10 text-[#F5630F]" />
          <h1 className="mt-4 text-xl font-semibold">Check your email</h1>
          <p className="mt-2 text-sm text-gray-600">
            If <span className="font-medium text-gray-900">{email}</span> has portal access, a sign-in link is on its way. It works once and expires in 15 minutes.
          </p>
          <button type="button" className="mt-6 text-sm font-medium text-[#F5630F] hover:underline" onClick={() => setSent(false)}>
            Use a different email
          </button>
        </div>
      ) : (
        <form onSubmit={submit}>
          <h1 className="text-xl font-semibold">Sign in to your client portal</h1>
          <p className="mt-2 text-sm text-gray-600">Enter the email your project team invited. We will send you a sign-in link, no password needed.</p>
          {notice ? <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{notice}</p> : null}
          <label htmlFor="portal-email" className="mt-6 block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            id="portal-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-[#F5630F] focus:outline-none focus:ring-2 focus:ring-[#F5630F]/20"
            placeholder="you@company.com"
          />
          {error ? <p className="mt-2 text-sm text-rose-600">{error}</p> : null}
          <button
            type="submit"
            disabled={busy}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-black disabled:opacity-60"
          >
            {busy ? 'Sending…' : 'Email me a sign-in link'}
          </button>
        </form>
      )}
    </div>
  );
}

export default function PortalHome() {
  const { loading, me, error, signOut } = usePortalMe();

  if (loading) return <PortalShell><div className="py-24 text-center text-sm text-gray-500">Loading…</div></PortalShell>;
  if (!me) return <PortalShell><SignIn notice={error} /></PortalShell>;

  return (
    <PortalShell me={me} onSignOut={signOut}>
      <h1 className="text-2xl font-semibold tracking-tight">Hi {me.contact.name.split(' ')[0]}</h1>
      <p className="mt-1 text-sm text-gray-600">Projects {me.organization.name} is sharing with {me.client.name || 'you'}.</p>

      {me.projects.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
          <FolderKanban className="mx-auto h-8 w-8 text-gray-400" />
          <p className="mt-3 text-sm text-gray-600">No projects are shared with you yet. Your project team will let you know when there is something to see.</p>
        </div>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {me.projects.map((p) => (
            <li key={p.id}>
              <Link
                href={`/portal/projects/${p.id}`}
                className="group block h-full rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-[#F5630F]/40 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-semibold leading-snug group-hover:text-[#F5630F]">{p.name}</h2>
                  <StatusPill status={p.status} />
                </div>
                {p.description ? <p className="mt-1 line-clamp-2 text-sm text-gray-600">{p.description}</p> : null}
                <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                  <span>{p.progress.percent}% complete</span>
                  <span>
                    {p.progress.done}/{p.progress.total} tasks
                  </span>
                </div>
                <div className="mt-1.5">
                  <ProgressBar percent={p.progress.percent} />
                </div>
                <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5" /> {p.endDate ? `Due ${fmtDate(p.endDate)}` : 'No due date'}
                  </span>
                  <span className="inline-flex items-center gap-1 font-medium text-gray-700 group-hover:text-[#F5630F]">
                    Open <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PortalShell>
  );
}
