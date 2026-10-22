'use client';

import { useEffect, useId, useState } from 'react';
import { useTheme } from 'next-themes';
import mermaid from 'mermaid';

export default function MermaidBlock({ code }) {
  const uid = useId().replace(/:/g, '');
  const [svg, setSvg] = useState('');
  const [error, setError] = useState('');
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    let cancelled = false;

    async function renderChart() {
      // Re-initialize mermaid when theme changes to render correctly
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'loose',
        theme: resolvedTheme === 'dark' ? 'dark' : 'default',
        fontFamily: 'inherit',
      });

      try {
        const { svg: rendered } = await mermaid.render(`mermaid-${uid}`, code || 'flowchart TD\nA[Start] --> B[End]');
        if (!cancelled) {
          setSvg(rendered);
          setError('');
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Invalid mermaid syntax');
          setSvg('');
        }
      }
    }

    renderChart();
    return () => {
      cancelled = true;
    };
  }, [code, uid, resolvedTheme]);

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-700 dark:text-red-400">
        Mermaid parse error: {error}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-brand-border dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
      {svg ? (
        <div dangerouslySetInnerHTML={{ __html: svg }} />
      ) : (
        <p className="text-sm text-brand-text-muted dark:text-gray-400">Rendering flowchart…</p>
      )}
    </div>
  );
}
