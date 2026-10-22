'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Compass } from 'lucide-react';

export function DocsWalkthrough({ steps = [], title = 'Guided walkthrough' }) {
  const [index, setIndex] = useState(0);

  if (!steps.length) return null;

  const step = steps[index];

  return (
    <section className="my-8 rounded-xl border border-brand-border bg-white p-5 shadow-soft">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-light text-brand-primary">
          <Compass className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-primary">{title}</p>
          <h2 className="mt-2 text-lg font-semibold text-brand-dark">{step.title}</h2>
          {step.description ? <p className="mt-2 text-sm leading-relaxed text-brand-text-light">{step.description}</p> : null}
          {step.href ? (
            <a href={step.href} className="mt-3 inline-flex text-sm font-medium text-brand-primary hover:underline">
              Jump to section
            </a>
          ) : null}

          <div className="mt-5 flex items-center justify-between">
            <p className="text-xs text-brand-text-muted">
              Step {index + 1} of {steps.length}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIndex((value) => Math.max(value - 1, 0))}
                disabled={index === 0}
                className="inline-flex items-center gap-1 rounded-lg border border-brand-border px-3 py-1.5 text-xs font-medium text-brand-foreground transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
                Back
              </button>
              <button
                type="button"
                onClick={() => setIndex((value) => Math.min(value + 1, steps.length - 1))}
                disabled={index === steps.length - 1}
                className="inline-flex items-center gap-1 rounded-lg border border-brand-border px-3 py-1.5 text-xs font-medium text-brand-foreground transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
