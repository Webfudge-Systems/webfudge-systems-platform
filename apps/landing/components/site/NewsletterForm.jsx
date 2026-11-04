'use client'

import { useState } from 'react'

/** Sends the address to the contact inbox (same endpoint as the contact form). */
export default function NewsletterForm() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState('idle')

  const submit = async (e) => {
    e.preventDefault()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setState('invalid')
    setState('sending')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Newsletter sign-up', company: '', email: email.trim(), message: 'Please add me to the monthly product newsletter.' }),
      })
      setState(res.ok ? 'done' : 'error')
    } catch {
      setState('error')
    }
  }

  if (state === 'done') return <p className="text-[15px] text-muted" role="status">Thanks — you’re on the list.</p>

  return (
    <div>
    <form onSubmit={submit} noValidate className="flex gap-2">
      <label htmlFor="newsletter-email" className="sr-only">Email address</label>
      <input
        id="newsletter-email"
        type="email"
        value={email}
        onChange={(e) => { setEmail(e.target.value); setState('idle') }}
        placeholder="you@company.com"
        className="min-h-[48px] min-w-0 flex-1 rounded-full border border-[#D9D9D5] px-5 text-[15px] outline-none focus:border-brand focus:ring-4 focus:ring-brand/15"
      />
      <button type="submit" disabled={state === 'sending'} className="btn-dark px-5">
        {state === 'sending' ? 'Sending…' : 'Subscribe'}
      </button>
    </form>
    {(state === 'invalid' || state === 'error') && (
      <p className="mt-2 text-[13px] text-[#B42318]" role="alert">{state === 'invalid' ? 'Enter a valid email.' : 'Something went wrong. Try again.'}</p>
    )}
    </div>
  )
}
