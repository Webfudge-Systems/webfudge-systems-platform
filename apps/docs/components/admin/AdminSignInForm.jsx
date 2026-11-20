'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogIn, Mail } from 'lucide-react';
import { useAuth } from '@webfudge/auth';

export default function AdminSignInForm({ compact = false }) {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleEmailSignIn(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const result = await login(email.trim(), password);
      if (result.success) {
        router.replace('/admin');
      } else {
        setError(result.error || 'Sign in failed');
      }
    } catch (err) {
      setError(err.message || 'Sign in failed');
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    'block w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition focus:ring-2';

  return (
    <div className="admin-shell mx-auto max-w-md">
      <div
        className={compact ? '' : 'relative overflow-hidden rounded-2xl border p-8'}
        style={compact ? undefined : { background: 'var(--admin-panel)', borderColor: 'var(--admin-border)' }}
      >
        {!compact ? (
          <div className="mb-6 text-center">
            <div
              className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full"
              style={{ background: 'var(--admin-accent-soft)', color: 'var(--admin-accent)' }}
            >
              <LogIn className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--admin-text)' }}>
              Docs Admin Sign In
            </h1>
            <p className="mt-2 text-sm" style={{ color: 'var(--admin-muted)' }}>
              Sign in with your authorized admin account to manage documentation.
            </p>
          </div>
        ) : null}

        {error ? (
          <div className="mb-4 rounded-lg border border-red-300/60 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-300">
            {error}
          </div>
        ) : null}

        <form onSubmit={handleEmailSignIn} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--admin-text-soft)' }}>
              Email
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: 'var(--admin-muted)' }} />
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`${inputClass} pl-9`}
                style={{ background: 'var(--admin-panel-soft)', borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}
                placeholder="admin@yourcompany.com"
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--admin-text-soft)' }}>
              Password
            </label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              style={{ background: 'var(--admin-panel-soft)', borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
            style={{ background: 'var(--admin-accent)' }}
          >
            {submitting ? 'Signing in…' : 'Sign in with Email'}
          </button>
        </form>
      </div>
    </div>
  );
}
