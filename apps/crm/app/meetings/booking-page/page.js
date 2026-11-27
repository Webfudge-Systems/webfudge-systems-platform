'use client';

import { useEffect, useState } from 'react';
import { Button, Card, IS_SAAS_PLATFORM } from '@webfudge/ui';
import CRMPageHeader from '../../../components/CRMPageHeader';
import cadenceService from '../../../lib/api/cadenceService';
import { canWriteCRM } from '../../../lib/rbac';

const DAYS = [
  ['mon', 'Monday'], ['tue', 'Tuesday'], ['wed', 'Wednesday'], ['thu', 'Thursday'], ['fri', 'Friday'], ['sat', 'Saturday'], ['sun', 'Sunday'],
];
const DEFAULT_HOURS = ['10:00', '17:00'];
const inputCls = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none';

export default function BookingPageSettings() {
  const canWrite = canWriteCRM('meetings');
  const [form, setForm] = useState(null);
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    cadenceService
      .getMyBookingPage()
      .then((res) => {
        const p = res?.data;
        setForm(
          p || {
            slug: res?.meta?.suggestedSlug || '',
            enabled: false,
            title: 'Intro call',
            description: '',
            durationMinutes: 30,
            bufferMinutes: 10,
            minNoticeMinutes: 240,
            daysAhead: 14,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata',
            location: '',
            availability: { mon: [DEFAULT_HOURS], tue: [DEFAULT_HOURS], wed: [DEFAULT_HOURS], thu: [DEFAULT_HOURS], fri: [DEFAULT_HOURS] },
          }
        );
      })
      .catch((e) => setMsg(e.message));
  }, []);

  if (!IS_SAAS_PLATFORM) return <div className="p-6 text-sm text-gray-500">Booking pages are available in Fudge Grow.</div>;
  if (!form) return <div className="p-6 text-sm text-gray-500">{msg || 'Loading…'}</div>;

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const setDay = (day, win) => set({ availability: { ...(form.availability || {}), [day]: win ? [win] : [] } });
  const link = typeof window !== 'undefined' && form.slug ? `${window.location.origin}/book/${form.slug}` : '';

  async function save() {
    setSaving(true);
    setMsg('');
    try {
      const res = await cadenceService.saveMyBookingPage(form);
      setForm(res.data);
      setMsg('Saved.');
    } catch (e) {
      setMsg(e.message);
    } finally {
      setSaving(false);
    }
  }

  const num = (k, label, min, max) => (
    <label className="block text-xs text-gray-600">
      {label}
      <input type="number" min={min} max={max} className={inputCls} value={form[k] ?? ''} onChange={(e) => set({ [k]: Number(e.target.value) })} disabled={!canWrite} />
    </label>
  );

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-3xl">
      <CRMPageHeader
        title="My booking page"
        subtitle="A public link where leads pick a free time on your calendar. Bookings become CRM meetings on the lead."
        breadcrumb={[{ label: 'Meetings', href: '/meetings' }, { label: 'Booking page', href: '/meetings/booking-page' }]}
      />
      <Card className="rounded-xl p-4 space-y-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={Boolean(form.enabled)} onChange={(e) => set({ enabled: e.target.checked })} disabled={!canWrite} />
          Page is live
        </label>
        <label className="block text-xs text-gray-600">
          Link name
          <input className={inputCls} value={form.slug} onChange={(e) => set({ slug: e.target.value.toLowerCase() })} disabled={!canWrite} />
        </label>
        {link && form.enabled && (
          <p className="text-xs text-gray-600">
            Share: <a href={link} target="_blank" rel="noreferrer" className="text-orange-600 hover:underline break-all">{link}</a>
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs text-gray-600">
            Meeting title
            <input className={inputCls} value={form.title || ''} onChange={(e) => set({ title: e.target.value })} disabled={!canWrite} />
          </label>
          <label className="block text-xs text-gray-600">
            Location or video link
            <input className={inputCls} value={form.location || ''} onChange={(e) => set({ location: e.target.value })} disabled={!canWrite} />
          </label>
          {num('durationMinutes', 'Length (minutes)', 5, 480)}
          {num('bufferMinutes', 'Gap between meetings (minutes)', 0, 240)}
          {num('minNoticeMinutes', 'Minimum notice (minutes)', 0, 43200)}
          {num('daysAhead', 'Bookable days ahead', 1, 60)}
          <label className="block text-xs text-gray-600 sm:col-span-2">
            Timezone
            <input className={inputCls} value={form.timezone || ''} onChange={(e) => set({ timezone: e.target.value })} disabled={!canWrite} />
          </label>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-700 mb-2">Weekly hours</p>
          <div className="space-y-2">
            {DAYS.map(([key, label]) => {
              const win = form.availability?.[key]?.[0];
              return (
                <div key={key} className="flex flex-wrap items-center gap-2 text-sm">
                  <label className="flex items-center gap-2 w-32">
                    <input type="checkbox" checked={Boolean(win)} onChange={(e) => setDay(key, e.target.checked ? DEFAULT_HOURS : null)} disabled={!canWrite} />
                    {label}
                  </label>
                  {win && (
                    <>
                      <input type="time" value={win[0]} onChange={(e) => setDay(key, [e.target.value, win[1]])} className="rounded-lg border border-gray-200 px-2 py-1 text-sm" disabled={!canWrite} aria-label={`${label} start`} />
                      <span className="text-gray-400">to</span>
                      <input type="time" value={win[1]} onChange={(e) => setDay(key, [win[0], e.target.value])} className="rounded-lg border border-gray-200 px-2 py-1 text-sm" disabled={!canWrite} aria-label={`${label} end`} />
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <p className="text-xs text-gray-500">Times that clash with your CRM meetings are hidden automatically.</p>
        {canWrite && <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>}
        {msg && <p className="text-sm text-gray-600">{msg}</p>}
      </Card>
    </div>
  );
}
