'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle2, X } from 'lucide-react'

const cx = (...c) => c.filter(Boolean).join(' ')

export function Spinner({ className = 'h-5 w-5' }) {
  return <Loader2 className={cx('animate-spin', className)} aria-hidden="true" />
}

export function FullPageSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white" role="status" aria-label="Loading">
      <Spinner className="h-6 w-6 text-[#F5630F]" />
    </div>
  )
}

const BUTTON = {
  primary: 'bg-[#F5630F] text-[#0F0F0F] hover:bg-[#E8560A] disabled:bg-[#F7A77A]',
  dark: 'bg-[#0F0F0F] text-white hover:bg-[#2A2A2A] disabled:bg-[#8A8A8A]',
  outline: 'border border-[#D9D9D5] bg-white text-[#0F0F0F] hover:bg-[#F4F4F2]',
  ghost: 'text-[#0F0F0F] hover:bg-[#F4F4F2]',
  danger: 'border border-[#F3C4BF] bg-white text-[#B42318] hover:bg-[#FDECEA]',
}

export function Button({ variant = 'dark', size = 'md', loading = false, className, children, disabled, ...props }) {
  const sizes = { sm: 'min-h-[40px] px-4 text-sm', md: 'min-h-[48px] px-5 text-[15px]', lg: 'min-h-[52px] px-6 text-base' }
  return (
    <button
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#F5630F]/30 disabled:cursor-not-allowed',
        BUTTON[variant],
        sizes[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  )
}

export function Field({ label, hint, error, optional, children, id }) {
  return (
    <div>
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-[#0F0F0F]">
          {label} {optional && <span className="font-normal text-[#5C5C5C]">(optional)</span>}
        </label>
      )}
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 flex items-center gap-1.5 text-[13px] text-[#B42318]">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-[13px] text-[#5C5C5C]">{hint}</p>
      ) : null}
    </div>
  )
}

const INPUT =
  'w-full min-h-[48px] rounded-xl border bg-white px-3.5 text-[15px] text-[#0F0F0F] placeholder:text-[#9A9A9A] outline-none transition focus:border-[#F5630F] focus:ring-4 focus:ring-[#F5630F]/15 disabled:bg-[#F4F4F2]'

export function TextInput({ label, hint, error, optional, className, ...props }) {
  const id = useId()
  return (
    <Field label={label} hint={hint} error={error} optional={optional} id={id}>
      <input
        id={id}
        className={cx(INPUT, error ? 'border-[#E5484D]' : 'border-[#DCDCD8]', className)}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        {...props}
      />
    </Field>
  )
}

export function PasswordInput({ label = 'Password', hint, error, ...props }) {
  const id = useId()
  const [show, setShow] = useState(false)
  return (
    <Field label={label} hint={hint} error={error} id={id}>
      <div className="relative">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          className={cx(INPUT, 'pr-12', error ? 'border-[#E5484D]' : 'border-[#DCDCD8]')}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="absolute right-1.5 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-[#5C5C5C] hover:bg-[#F4F4F2]"
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </Field>
  )
}

export function SelectInput({ label, error, options, placeholder, ...props }) {
  const id = useId()
  return (
    <Field label={label} error={error} id={id}>
      <select id={id} className={cx(INPUT, 'appearance-none bg-[url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2716%27 height=%2716%27 fill=%27none%27 stroke=%27%235C5C5C%27 stroke-width=%272%27%3E%3Cpath d=%27m4 6 4 4 4-4%27/%3E%3C/svg%3E")] bg-[right_14px_center] bg-no-repeat pr-10', error ? 'border-[#E5484D]' : 'border-[#DCDCD8]')} {...props}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(([value, text]) => (
          <option key={value} value={value}>
            {text}
          </option>
        ))}
      </select>
    </Field>
  )
}

/** Six single-digit boxes; supports typing, backspace, arrows and pasting the whole code. */
export function CodeInput({ value, onChange, onComplete, disabled, error }) {
  const refs = useRef([])
  // Latest digits, updated synchronously so fast typing and autofill never read a stale value.
  const current = useRef(null)
  if (current.current === null || current.current.join('') !== value) {
    current.current = Array.from({ length: 6 }, (_, i) => value[i] || '')
  }
  const digits = Array.from({ length: 6 }, (_, i) => value[i] || '')

  useEffect(() => {
    refs.current[0]?.focus()
  }, [])

  const commit = (next) => {
    current.current = next
    const joined = next.join('')
    onChange(joined)
    if (joined.length === 6) onComplete?.(joined)
  }

  /** Writes one or more digits starting at `index` (typing, autofill or a fast burst of keys). */
  const fillFrom = (index, incoming) => {
    const next = current.current.slice()
    let i = index
    for (const ch of incoming) {
      if (i > 5) break
      next[i] = ch
      i += 1
    }
    commit(next)
    refs.current[Math.min(i, 5)]?.focus()
  }

  const setAt = (index, digit) => {
    const next = current.current.slice()
    next[index] = digit
    commit(next)
  }

  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold">Verification code</legend>
      <div className="grid grid-cols-6 gap-2 sm:gap-3">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => (refs.current[i] = el)}
            value={d}
            disabled={disabled}
            inputMode="numeric"
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            aria-label={`Digit ${i + 1}`}
            className={cx(
              'h-14 w-full rounded-xl border bg-white text-center text-2xl font-semibold outline-none transition focus:border-[#F5630F] focus:ring-4 focus:ring-[#F5630F]/15 sm:h-16',
              error ? 'border-[#E5484D]' : 'border-[#DCDCD8]'
            )}
            onChange={(e) => {
              const typed = e.target.value.replace(/\D/g, '')
              if (!typed) return
              // The box may already hold a digit: keep only what was just typed.
              const old = current.current[i]
              const incoming = old && typed.length > 1 && typed.startsWith(old) ? typed.slice(1) : old && typed.length > 1 && typed.endsWith(old) ? typed.slice(0, -1) : typed
              fillFrom(i, incoming)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Backspace') {
                e.preventDefault()
                if (digits[i]) setAt(i, '')
                else if (i > 0) {
                  refs.current[i - 1]?.focus()
                  setAt(i - 1, '')
                }
              } else if (e.key === 'ArrowLeft') refs.current[i - 1]?.focus()
              else if (e.key === 'ArrowRight') refs.current[i + 1]?.focus()
            }}
            onPaste={(e) => {
              const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
              if (!pasted) return
              e.preventDefault()
              fillFrom(pasted.length === 6 ? 0 : i, pasted)
            }}
          />
        ))}
      </div>
    </fieldset>
  )
}

export function Alert({ tone = 'error', children, className }) {
  const tones = {
    error: 'bg-[#FDECEA] text-[#8A1C12]',
    success: 'bg-[#E6F4EA] text-[#1E5B30]',
    info: 'bg-[#F4F4F2] text-[#3A3A3A]',
    warn: 'bg-[#FFF1E8] text-[#8F3907]',
  }
  const Icon = tone === 'success' ? CheckCircle2 : AlertCircle
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={cx('flex gap-2.5 rounded-xl px-4 py-3 text-sm leading-relaxed', tones[tone], className)}>
      <Icon className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
      <div>{children}</div>
    </div>
  )
}

export function Badge({ tone = 'neutral', children }) {
  const tones = {
    neutral: 'bg-[#F4F4F2] text-[#3A3A3A]',
    orange: 'bg-[#FFF1E8] text-[#8F3907]',
    green: 'bg-[#E6F4EA] text-[#1E6B34]',
    red: 'bg-[#FDECEA] text-[#B42318]',
    blue: 'bg-[#EEF1FF] text-[#2442B8]',
    dark: 'bg-[#0F0F0F] text-white',
  }
  return <span className={cx('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold', tones[tone])}>{children}</span>
}

export function AppIcon({ src, size = 48, tint, className }) {
  return (
    <span
      className={cx('inline-flex flex-shrink-0 items-center justify-center rounded-2xl', className)}
      style={{ width: size, height: size, background: tint || 'transparent' }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" width={Math.round(size * (tint ? 0.72 : 1))} height={Math.round(size * (tint ? 0.72 : 1))} />
    </span>
  )
}

export function Modal({ open, onClose, title, children, wide }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-6" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div role="dialog" aria-modal="true" aria-label={title} className={cx('max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl sm:p-8', wide ? 'sm:max-w-4xl' : 'sm:max-w-lg')}>
        <div className="mb-5 flex items-start justify-between gap-4">
          <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
          <button type="button" onClick={onClose} className="-mr-2 -mt-1 flex h-10 w-10 items-center justify-center rounded-full hover:bg-[#F4F4F2]" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Card({ className, children }) {
  return <section className={cx('rounded-3xl border border-[#EDEDEA] bg-white p-5 sm:p-6', className)}>{children}</section>
}
