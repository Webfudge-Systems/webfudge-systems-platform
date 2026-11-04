'use client'

import { useId, useState } from 'react'
import { CheckCircle2 } from 'lucide-react'

const TOPICS = ['Book a demo', 'Pricing and plans', 'Custom software', 'Support', 'Something else']

function Field({ label, error, optional, children, id }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold">
        {label} {optional && <span className="font-normal text-muted">(optional)</span>}
      </label>
      {children}
      {error && <p className="mt-1.5 text-[13px] text-[#B42318]">{error}</p>}
    </div>
  )
}

const INPUT = 'w-full min-h-[48px] rounded-xl border border-[#DCDCD8] bg-white px-3.5 text-[15px] outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/15'

export default function ContactForm() {
  const id = useId()
  const [form, setForm] = useState({ name: '', email: '', company: '', topic: TOPICS[0], message: '', website: '' })
  const [errors, setErrors] = useState({})
  const [state, setState] = useState('idle')
  const [serverError, setServerError] = useState('')
  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }))
    setErrors((er) => ({ ...er, [k]: undefined }))
  }

  const submit = async (e) => {
    e.preventDefault()
    const er = {}
    if (!form.name.trim()) er.name = 'Enter your name.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) er.email = 'Enter a valid work email.'
    setErrors(er)
    if (Object.keys(er).length) return
    setState('sending')
    setServerError('')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, message: `[${form.topic}] ${form.message}`.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Something went wrong. Please email us instead.')
      setState('done')
    } catch (err) {
      setServerError(err.message)
      setState('idle')
    }
  }

  if (state === 'done') {
    return (
      <div className="flex flex-col items-start gap-4 py-10" role="status">
        <CheckCircle2 className="h-12 w-12 text-[#1E6B34]" aria-hidden="true" />
        <h2 className="text-3xl font-medium tracking-tight">Thanks, we’ve got it.</h2>
        <p className="text-[17px] text-muted">We’ll reply to {form.email} within one working day.</p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-5 sm:grid-cols-2">
      <Field label="Your name" error={errors.name} id={`${id}-name`}>
        <input id={`${id}-name`} autoComplete="name" value={form.name} onChange={set('name')} className={INPUT} />
      </Field>
      <Field label="Work email" error={errors.email} id={`${id}-email`}>
        <input id={`${id}-email`} type="email" autoComplete="email" value={form.email} onChange={set('email')} className={INPUT} />
      </Field>
      <Field label="Company" optional id={`${id}-company`}>
        <input id={`${id}-company`} autoComplete="organization" value={form.company} onChange={set('company')} className={INPUT} />
      </Field>
      <Field label="What’s it about?" id={`${id}-topic`}>
        <select id={`${id}-topic`} value={form.topic} onChange={set('topic')} className={INPUT}>
          {TOPICS.map((t) => <option key={t}>{t}</option>)}
        </select>
      </Field>
      <div className="sm:col-span-2">
        <Field label="Message" optional id={`${id}-message`}>
          <textarea id={`${id}-message`} rows={5} value={form.message} onChange={set('message')} className={`${INPUT} py-3`} placeholder="Tell us about your team and what you need." />
        </Field>
      </div>
      {/* Honeypot: hidden from people, filled by bots. */}
      <input type="text" name="website" value={form.website} onChange={set('website')} tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      {serverError && <p className="rounded-xl bg-[#FDECEA] px-4 py-3 text-sm text-[#8A1C12] sm:col-span-2" role="alert">{serverError}</p>}
      <div className="sm:col-span-2">
        <button type="submit" disabled={state === 'sending'} className="btn-dark min-h-[52px] px-8 text-base">
          {state === 'sending' ? 'Sending…' : 'Send message'}
        </button>
      </div>
    </form>
  )
}
