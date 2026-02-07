'use client'

import { useState } from 'react'

export default function Home() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setStatus('Submitting...')
    try {
      const res = await fetch('https://formspree.io/f/your-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (res.ok) {
        setStatus('Thanks — we will notify you!')
        setEmail('')
      } else {
        setStatus('Something went wrong. Please try again.')
      }
    } catch (err) {
      setStatus('Network error. Please try again.')
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800 text-white">
      <div className="max-w-2xl w-full p-8 text-center">
        <img src="/ws_logo.png" alt="Webfudge" className="mx-auto mb-6 w-32" />
        <h1 className="text-4xl font-bold mb-4">Coming soon</h1>
        <p className="text-slate-300 mb-6">
          We're working hard on the new Webfudge platform. Sign up to be notified when we launch.
        </p>

        <form onSubmit={handleSubmit} className="flex gap-2 justify-center">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Your email"
            className="px-4 py-2 rounded-md text-slate-900 flex-1"
          />
          <button type="submit" className="px-4 py-2 bg-blue-400 text-slate-900 rounded-md font-semibold">
            Notify me
          </button>
        </form>

        {status && <p className="mt-4 text-slate-300">{status}</p>}

        <p className="mt-8 text-sm text-slate-400">
          Or view our code on <a className="underline" href="https://github.com/webfudge">GitHub</a>.
        </p>
      </div>
    </main>
  )
}
