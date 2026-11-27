'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { publicBooking } from '../../../lib/api/cadenceService';

const inputCls = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none';
const viewerTz = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
const dayKey = (iso) => new Date(iso).toLocaleDateString('en-CA'); // YYYY-MM-DD in the viewer's timezone

/** G14: public booking page for one rep. No login. */
export default function PublicBookingPage() {
  const { slug } = useParams();
  const [page, setPage] = useState(null);
  const [error, setError] = useState('');
  const [day, setDay] = useState('');
  const [slot, setSlot] = useState('');
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', notes: '', website: '' });
  const [sending, setSending] = useState(false);
  const [booked, setBooked] = useState(null);

  async function load() {
    try {
      const res = await publicBooking(slug);
      setPage(res.data);
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    if (slug) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const byDay = useMemo(() => {
    const m = new Map();
    for (const s of page?.slots || []) {
      const k = dayKey(s);
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(s);
    }
    return m;
  }, [page]);

  useEffect(() => {
    if (!day && byDay.size) setDay([...byDay.keys()][0]);
  }, [byDay, day]);

  async function submit(e) {
    e.preventDefault();
    setSending(true);
    setError('');
    try {
      const res = await publicBooking(slug, { method: 'POST', body: { ...form, start: slot } });
      setBooked(res.data);
    } catch (err) {
      setError(err.message);
      if (err.status === 409) {
        setSlot('');
        await load();
      }
    } finally {
      setSending(false);
    }
  }

  const time = (iso) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const longDate = (iso) => new Date(iso).toLocaleString([], { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-2xl rounded-2xl bg-white p-6 shadow-sm">
        {!page && !error && <p className="text-sm text-gray-500">Loading…</p>}
        {!page && error && <p className="text-sm text-gray-700">{error}</p>}
        {page && booked && (
          <div className="space-y-2">
            <h1 className="text-xl font-semibold text-gray-900">You&apos;re booked</h1>
            <p className="text-sm text-gray-700">
              {page.title} with {booked.hostName}, {longDate(booked.start)} ({viewerTz()}).
            </p>
            {page.location && <p className="text-sm text-gray-600">Where: {page.location}</p>}
          </div>
        )}
        {page && !booked && (
          <div className="space-y-5">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-400">{page.organizationName}</p>
              <h1 className="text-xl font-semibold text-gray-900">{page.title}</h1>
              <p className="text-sm text-gray-600">
                with {page.hostName} · {page.durationMinutes} minutes{page.location ? ` · ${page.location}` : ''}
              </p>
              {page.description && <p className="mt-2 text-sm text-gray-700 whitespace-pre-line">{page.description}</p>}
            </div>

            {byDay.size === 0 ? (
              <p className="text-sm text-gray-600">No free times right now. Please check back later.</p>
            ) : (
              <>
                <div>
                  <p className="mb-2 text-xs text-gray-500">Times shown in {viewerTz()}</p>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {[...byDay.keys()].map((k) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => { setDay(k); setSlot(''); }}
                        className={`shrink-0 rounded-lg border px-3 py-2 text-sm ${day === k ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-200 text-gray-700'}`}
                      >
                        {new Date(byDay.get(k)[0]).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {(byDay.get(day) || []).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSlot(s)}
                      className={`rounded-lg border px-2 py-2 text-sm ${slot === s ? 'border-orange-500 bg-orange-500 text-white' : 'border-gray-200 text-gray-800 hover:border-orange-300'}`}
                    >
                      {time(s)}
                    </button>
                  ))}
                </div>
              </>
            )}

            {slot && (
              <form onSubmit={submit} className="space-y-3 border-t border-gray-100 pt-4">
                <p className="text-sm font-medium text-gray-800">{longDate(slot)}</p>
                <input className={inputCls} required placeholder="Your name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                <input className={inputCls} required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <input className={inputCls} placeholder="Phone (optional)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  <input className={inputCls} placeholder="Company (optional)" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
                </div>
                <textarea className={inputCls} placeholder="Anything we should know? (optional)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                <input type="text" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
                <button type="submit" disabled={sending} className="w-full rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-60">
                  {sending ? 'Booking…' : 'Confirm booking'}
                </button>
              </form>
            )}
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
        )}
      </div>
    </main>
  );
}
