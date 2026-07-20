'use client';

import { useEffect, useState } from 'react';

export function DocsReadingProgress({ targetRef, hidden = false }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (hidden) {
      setProgress(0);
      return undefined;
    }

    const target = targetRef?.current || document.documentElement;

    function updateProgress() {
      const scrollTop = target === document.documentElement ? window.scrollY : target.scrollTop;
      const scrollHeight = target === document.documentElement ? document.documentElement.scrollHeight : target.scrollHeight;
      const clientHeight = target === document.documentElement ? window.innerHeight : target.clientHeight;
      const maxScroll = Math.max(scrollHeight - clientHeight, 1);

      setProgress(Math.min(Math.max(scrollTop / maxScroll, 0), 1));
    }

    updateProgress();

    if (target === document.documentElement) {
      window.addEventListener('scroll', updateProgress, { passive: true });
      window.addEventListener('resize', updateProgress);
      return () => {
        window.removeEventListener('scroll', updateProgress);
        window.removeEventListener('resize', updateProgress);
      };
    }

    target.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', updateProgress);

    return () => {
      target.removeEventListener('scroll', updateProgress);
      window.removeEventListener('resize', updateProgress);
    };
  }, [hidden, targetRef]);

  if (hidden) return null;

  return (
    <div className="sticky top-14 z-30 h-0.5 bg-transparent" aria-hidden>
      <div
        className="h-full origin-left bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-400 transition-transform duration-150 ease-out"
        style={{ transform: `scaleX(${progress})` }}
      />
    </div>
  );
}
