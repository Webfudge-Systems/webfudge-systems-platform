'use client';

import { useState } from 'react';
import { CheckCircle2, MessageSquare, ThumbsDown, ThumbsUp } from 'lucide-react';
import { clsx } from 'clsx';

export function DocsFeedback({ onSubmit, className }) {
  const [choice, setChoice] = useState(null);
  const [comment, setComment] = useState('');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  async function handleSubmit(helpful) {
    setChoice(helpful);
    setStatus('submitting');
    setError('');

    try {
      await onSubmit?.({ helpful, comment: comment.trim() });
      setStatus('submitted');
    } catch (err) {
      setStatus('error');
      setError(err?.message || 'Feedback could not be sent.');
    }
  }

  if (status === 'submitted') {
    return (
      <div className={clsx('glass-panel mt-12 rounded-xl p-5', className)}>
        <div className="flex items-center gap-2 text-sm font-semibold text-brand-primary">
          <CheckCircle2 className="h-4 w-4" aria-hidden />
          Thanks for helping improve this page.
        </div>
      </div>
    );
  }

  return (
    <section className={clsx('glass-panel mt-12 rounded-xl p-5 transition-all duration-300 hover:bg-glass-200', className)} aria-label="Page feedback">
      <div className="flex items-start gap-4">
        <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-500/10 text-brand-primary dark:bg-orange-500/20 shadow-sm">
          <MessageSquare className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold text-brand-dark dark:text-gray-100">Was this page helpful?</h2>
          <p className="mt-1 text-sm text-brand-text-muted dark:text-gray-400">Send a quick signal so the documentation can keep improving.</p>

          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Optional: what should be clearer?"
            className="mt-4 min-h-20 w-full rounded-xl border border-white/60 bg-white/50 px-4 py-3 text-sm shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] transition-all duration-300 dark:bg-white/5 dark:border-white/10 dark:shadow-none hover:bg-white dark:hover:bg-white/10 text-brand-foreground placeholder:text-brand-text-muted dark:text-gray-100 dark:placeholder:text-gray-400 focus:border-brand-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/20 dark:focus:bg-white/10"
          />

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => handleSubmit(true)}
              disabled={status === 'submitting'}
              className={clsx(
                'inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60 shadow-sm hover:-translate-y-0.5',
                choice === true ? 'border-brand-primary bg-orange-500/10 text-brand-primary dark:bg-orange-500/20' : 'border-brand-border/60 bg-white text-brand-foreground hover:bg-white/80 dark:border-white/10 dark:bg-white/5 dark:text-gray-100 dark:hover:bg-white/10'
              )}
            >
              <ThumbsUp className="h-4 w-4" aria-hidden />
              Yes
            </button>
            <button
              type="button"
              onClick={() => handleSubmit(false)}
              disabled={status === 'submitting'}
              className={clsx(
                'inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60 shadow-sm hover:-translate-y-0.5',
                choice === false ? 'border-brand-primary bg-orange-500/10 text-brand-primary dark:bg-orange-500/20' : 'border-brand-border/60 bg-white text-brand-foreground hover:bg-white/80 dark:border-white/10 dark:bg-white/5 dark:text-gray-100 dark:hover:bg-white/10'
              )}
            >
              <ThumbsDown className="h-4 w-4" aria-hidden />
              No
            </button>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
          </div>
        </div>
      </div>
    </section>
  );
}
