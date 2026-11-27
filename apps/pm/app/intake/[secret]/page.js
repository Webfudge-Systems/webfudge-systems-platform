'use client';

/**
 * Public intake form (W13). No login. Submits to the API, which creates a task in the project.
 * The hidden "website" field is a honeypot; startedAt lets the API drop instant (bot) submissions.
 */

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import strapiClient from '../../../lib/strapiClient';

const input = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100';

function Field({ f, value, error, onChange }) {
  const common = { id: `f-${f.key}`, name: f.key, required: f.required, value: value || '', onChange: (e) => onChange(e.target.value), className: input };
  let control;
  if (f.type === 'textarea') control = <textarea rows={5} {...common} />;
  else if (f.type === 'select')
    control = (
      <select {...common}>
        <option value="">Choose…</option>
        {f.options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    );
  else control = <input type={{ phone: 'tel' }[f.type] || f.type} {...common} />;
  return (
    <div className="space-y-1">
      <label htmlFor={`f-${f.key}`} className="text-sm font-medium text-gray-800">
        {f.label}
        {f.required ? <span className="text-rose-600"> *</span> : null}
      </label>
      {control}
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}

export default function IntakeFormPage() {
  const { secret } = useParams();
  const [form, setForm] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [values, setValues] = useState({ name: '', email: '', website: '' });
  const [answers, setAnswers] = useState({});
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [done, setDone] = useState('');
  const [sending, setSending] = useState(false);
  const startedAt = useRef(Date.now());

  useEffect(() => {
    fetch(`${strapiClient.baseURL}/api/intake/forms/${encodeURIComponent(secret)}`)
      .then(async (r) => {
        const body = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(body?.error?.message || 'This form is not available.');
        setForm(body.data);
      })
      .catch((e) => setLoadError(e.message));
  }, [secret]);

  const submit = async (e) => {
    e.preventDefault();
    setSending(true);
    setMessage('');
    setErrors({});
    try {
      const r = await fetch(`${strapiClient.baseURL}/api/intake/forms/${encodeURIComponent(secret)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, values: answers, startedAt: startedAt.current }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) {
        setErrors(body?.error?.details?.errors || {});
        setMessage(body?.error?.message || 'Your request was not sent.');
        return;
      }
      setDone(body?.data?.message || 'Thanks! Your request was received.');
    } catch (_) {
      setMessage('Your request was not sent. Check your connection and try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        {loadError ? (
          <p className="text-sm text-gray-700">{loadError}</p>
        ) : !form ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : done ? (
          <div className="space-y-2">
            <h1 className="text-xl font-semibold text-gray-900">Request sent</h1>
            <p className="text-sm text-gray-700">{done}</p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4" noValidate>
            <div>
              <p className="text-xs font-medium text-orange-700">{form.projectName}</p>
              <h1 className="text-xl font-semibold text-gray-900">{form.name}</h1>
              {form.intro ? <p className="mt-2 whitespace-pre-line text-sm text-gray-600">{form.intro}</p> : null}
            </div>
            <Field f={{ key: 'name', label: 'Your name', type: 'text', required: true }} value={values.name} error={errors.name} onChange={(v) => setValues({ ...values, name: v })} />
            <Field f={{ key: 'email', label: 'Your email', type: 'email', required: true }} value={values.email} error={errors.email} onChange={(v) => setValues({ ...values, email: v })} />
            {form.fields.map((f) => (
              <Field key={f.key} f={f} value={answers[f.key]} error={errors[f.key]} onChange={(v) => setAnswers({ ...answers, [f.key]: v })} />
            ))}
            <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px', width: 1, height: 1, overflow: 'hidden' }}>
              <label htmlFor="website">Website</label>
              <input id="website" name="website" tabIndex={-1} autoComplete="off" value={values.website} onChange={(e) => setValues({ ...values, website: e.target.value })} />
            </div>
            {message ? <p className="text-sm text-rose-700">{message}</p> : null}
            <button type="submit" disabled={sending} className="w-full rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-60">
              {sending ? 'Sending…' : 'Send request'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
