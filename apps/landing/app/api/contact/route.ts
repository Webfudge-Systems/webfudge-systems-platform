import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { Resend } from 'resend'

/** Resend SDK needs Node fetch/DNS; Edge runtime can fail on Windows dev. */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const TO_EMAIL = process.env.CONTACT_TO_EMAIL ?? 'contact@webfudge.in'

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function buildEmailContent(name: string, company: string, email: string) {
  const submittedAt = new Date().toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'short',
  })

  const text = [
    'New call request from the Webfudge landing page',
    '',
    `Name: ${name}`,
    `Company: ${company || '(not provided)'}`,
    `Work email: ${email}`,
    `Submitted: ${submittedAt}`,
  ].join('\n')

  const html = `
    <h2 style="margin:0 0 16px;font-family:sans-serif;">New call request</h2>
    <table style="font-family:sans-serif;font-size:14px;border-collapse:collapse;">
      <tr><td style="padding:6px 12px 6px 0;color:#666;">Name</td><td style="padding:6px 0;"><strong>${escapeHtml(name)}</strong></td></tr>
      <tr><td style="padding:6px 12px 6px 0;color:#666;">Company</td><td style="padding:6px 0;">${escapeHtml(company || '(not provided)')}</td></tr>
      <tr><td style="padding:6px 12px 6px 0;color:#666;">Work email</td><td style="padding:6px 0;"><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></td></tr>
      <tr><td style="padding:6px 12px 6px 0;color:#666;">Submitted</td><td style="padding:6px 0;">${escapeHtml(submittedAt)}</td></tr>
    </table>
  `

  return {
    subject: `Call request: ${name}${company ? ` — ${company}` : ''}`,
    text,
    html,
  }
}

async function sendViaResend(
  name: string,
  company: string,
  email: string,
) {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) return false

  const from =
    process.env.RESEND_FROM_EMAIL?.trim() ?? 'Webfudge Contact <onboarding@resend.dev>'
  const { subject, html, text } = buildEmailContent(name, company, email)

  const resend = new Resend(apiKey)
  const { error } = await resend.emails.send({
    from,
    to: [TO_EMAIL],
    replyTo: email,
    subject,
    html,
    text,
  })

  if (error) {
    throw new Error(error.message)
  }

  return true
}

async function sendViaGmail(name: string, company: string, email: string) {
  const gmailUser = process.env.GMAIL_USER?.trim()
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD?.replace(/\s/g, '')

  if (!gmailUser || !gmailAppPassword) return false

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: gmailUser,
      pass: gmailAppPassword,
    },
  })

  const { subject, html, text } = buildEmailContent(name, company, email)

  await transporter.sendMail({
    from: `"Webfudge Contact" <${gmailUser}>`,
    to: TO_EMAIL,
    replyTo: email,
    subject,
    text,
    html,
  })

  return true
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const company = typeof body.company === 'string' ? body.company.trim() : ''
    const email = typeof body.email === 'string' ? body.email.trim() : ''
    const website = typeof body.website === 'string' ? body.website.trim() : ''

    if (website) {
      return NextResponse.json({ ok: true })
    }

    if (!name || !email) {
      return NextResponse.json(
        { error: 'Name and work email are required.' },
        { status: 400 },
      )
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid work email.' },
        { status: 400 },
      )
    }

    const hasResend = Boolean(process.env.RESEND_API_KEY?.trim())
    const hasGmail = Boolean(
      process.env.GMAIL_USER?.trim() && process.env.GMAIL_APP_PASSWORD?.trim(),
    )

    if (!hasResend && !hasGmail) {
      return NextResponse.json(
        { error: 'Contact form is not configured yet. Please email us directly.' },
        { status: 503 },
      )
    }

    if (hasResend) {
      await sendViaResend(name, company, email)
    } else {
      await sendViaGmail(name, company, email)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Contact form send failed:', error)

    const isAuthError =
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === 'EAUTH'

    const resendMessage =
      error instanceof Error && error.message ? error.message : null

    const message = isAuthError
      ? process.env.NODE_ENV === 'development'
        ? 'Gmail rejected the app password. Regenerate it at https://myaccount.google.com/apppasswords (copy only when shown), or set RESEND_API_KEY in .env.local instead.'
        : 'Unable to send your request right now. Please email us directly.'
      : process.env.NODE_ENV === 'development' && resendMessage
        ? resendMessage
        : 'Unable to send your request right now. Please try again or email us directly.'

    return NextResponse.json({ error: message }, { status: 500 })
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
