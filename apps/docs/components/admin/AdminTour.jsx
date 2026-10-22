'use client';

import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Sparkles, X } from 'lucide-react';

export const TOUR_STORAGE_KEY = 'docs-admin-tour-completed-v1';

/**
 * Lightweight spotlight product tour.
 *
 * `steps` is an array of:
 *   { selector: '[data-tour="pages"]', title, description, placement? }
 * Steps whose target element is missing are skipped automatically, so the same
 * tour definition works across responsive layouts (e.g. desktop vs mobile nav).
 */
export default function AdminTour({ steps = [], open, onClose }) {
  const [rawIndex, setRawIndex] = useState(0);
  const [rect, setRect] = useState(null);

  const resolveStep = useCallback(
    (start, direction) => {
      if (!steps.length) return -1;
      let i = start;
      while (i >= 0 && i < steps.length) {
        const el = document.querySelector(steps[i].selector);
        if (el) return i;
        i += direction;
      }
      return -1;
    },
    [steps]
  );

  useEffect(() => {
    if (!open) return;
    const first = resolveStep(0, 1);
    setRawIndex(first === -1 ? 0 : first);
  }, [open, resolveStep]);

  const activeStep = steps[rawIndex];

  const measure = useCallback(() => {
    if (!activeStep) return;
    const el = document.querySelector(activeStep.selector);
    if (!el) {
      setRect(null);
      return;
    }
    el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [activeStep]);

  useLayoutEffect(() => {
    if (!open) return;
    measure();
  }, [open, rawIndex, measure]);

  useEffect(() => {
    if (!open) return undefined;
    const handle = () => measure();
    window.addEventListener('resize', handle);
    window.addEventListener('scroll', handle, true);
    return () => {
      window.removeEventListener('resize', handle);
      window.removeEventListener('scroll', handle, true);
    };
  }, [open, measure]);

  const finish = useCallback(() => {
    try {
      localStorage.setItem(TOUR_STORAGE_KEY, 'true');
    } catch (_) {}
    onClose?.();
  }, [onClose]);

  const goNext = useCallback(() => {
    const next = resolveStep(rawIndex + 1, 1);
    if (next === -1) {
      finish();
      return;
    }
    setRawIndex(next);
  }, [rawIndex, resolveStep, finish]);

  const goPrev = useCallback(() => {
    const prev = resolveStep(rawIndex - 1, -1);
    if (prev === -1) return;
    setRawIndex(prev);
  }, [rawIndex, resolveStep]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') finish();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, finish, goNext, goPrev]);

  if (!open || !activeStep) return null;

  const pad = 8;
  const spotlight = rect
    ? {
        top: rect.top - pad,
        left: rect.left - pad,
        width: rect.width + pad * 2,
        height: rect.height + pad * 2,
      }
    : null;

  const tooltip = computeTooltipPosition(spotlight, activeStep.placement);
  const positionLabel = `${Math.min(rawIndex + 1, steps.length)} / ${steps.length}`;
  const isLast = resolveStep(rawIndex + 1, 1) === -1;

  return (
    <AnimatePresence>
      <motion.div
        className="admin-shell"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        {/* Dimmer with spotlight cut-out */}
        {spotlight ? (
          <div className="admin-tour-spotlight" style={spotlight} aria-hidden />
        ) : (
          <div className="fixed inset-0 z-[125] bg-[rgba(2,6,18,0.62)]" aria-hidden />
        )}

        {/* Click-catcher above the dimmer so users advance with a click */}
        <button
          type="button"
          aria-label="Next tour step"
          onClick={goNext}
          className="fixed inset-0 z-[126] cursor-pointer"
          style={{ background: 'transparent' }}
        />

        <motion.div
          key={activeStep.selector}
          role="dialog"
          aria-modal="true"
          aria-label={activeStep.title}
          initial={{ opacity: 0, y: 10, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="fixed z-[135] w-[320px] max-w-[calc(100vw-32px)] overflow-hidden rounded-2xl border shadow-2xl"
          style={{
            top: tooltip.top,
            left: tooltip.left,
            background: 'var(--admin-panel)',
            borderColor: 'var(--admin-border-strong)',
            color: 'var(--admin-text)',
          }}
        >
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: '1px solid var(--admin-border)' }}
          >
            <span
              className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em]"
              style={{ color: 'var(--admin-accent)' }}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Guided tour
            </span>
            <button
              type="button"
              onClick={finish}
              aria-label="Close tour"
              className="rounded-lg p-1 transition-colors hover:opacity-70"
              style={{ color: 'var(--admin-muted)' }}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="px-4 py-4">
            <h3 className="text-base font-bold" style={{ color: 'var(--admin-text)' }}>
              {activeStep.title}
            </h3>
            <p className="mt-1.5 text-sm leading-6" style={{ color: 'var(--admin-text-soft)' }}>
              {activeStep.description}
            </p>
          </div>

          <div
            className="flex items-center justify-between gap-3 px-4 py-3"
            style={{ borderTop: '1px solid var(--admin-border)' }}
          >
            <span className="text-xs font-semibold" style={{ color: 'var(--admin-muted)' }}>
              {positionLabel}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={goPrev}
                disabled={resolveStep(rawIndex - 1, -1) === -1}
                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-40"
                style={{ color: 'var(--admin-text-soft)', border: '1px solid var(--admin-border)' }}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </button>
              <button
                type="button"
                onClick={goNext}
                className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition"
                style={{ background: 'var(--admin-accent)', color: 'var(--admin-on-accent)' }}
              >
                {isLast ? (
                  <>
                    Finish
                    <Check className="h-3.5 w-3.5" />
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function computeTooltipPosition(spotlight, placement = 'auto') {
  const TOOLTIP_W = 320;
  const TOOLTIP_H = 220;
  const GAP = 16;
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;

  if (!spotlight) {
    return { top: vh / 2 - TOOLTIP_H / 2, left: vw / 2 - TOOLTIP_W / 2 };
  }

  const clampLeft = (l) => Math.max(16, Math.min(l, vw - TOOLTIP_W - 16));
  const clampTop = (t) => Math.max(16, Math.min(t, vh - TOOLTIP_H - 16));

  const spaceRight = vw - (spotlight.left + spotlight.width);
  const spaceBelow = vh - (spotlight.top + spotlight.height);

  let place = placement;
  if (place === 'auto') {
    if (spaceRight > TOOLTIP_W + GAP) place = 'right';
    else if (spaceBelow > TOOLTIP_H + GAP) place = 'bottom';
    else place = 'top';
  }

  if (place === 'right') {
    return {
      left: clampLeft(spotlight.left + spotlight.width + GAP),
      top: clampTop(spotlight.top),
    };
  }
  if (place === 'bottom') {
    return {
      left: clampLeft(spotlight.left),
      top: clampTop(spotlight.top + spotlight.height + GAP),
    };
  }
  // top
  return {
    left: clampLeft(spotlight.left),
    top: clampTop(spotlight.top - TOOLTIP_H - GAP),
  };
}
