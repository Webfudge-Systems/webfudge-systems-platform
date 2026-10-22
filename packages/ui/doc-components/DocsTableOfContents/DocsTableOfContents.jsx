'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { clsx } from 'clsx';

/**
 * Right-rail table of contents.
 * Extracts H2/H3 headings from the DOM, or accepts them as a prop.
 *
 * @param {{ headings?: Array<{id: string, text: string, level: number}>, contentSelector?: string }} props
 */
export function DocsTableOfContents({ headings: headingsProp, contentSelector = '.docs-prose, article' }) {
  const [headings, setHeadings] = useState(headingsProp || []);
  const [activeId, setActiveId] = useState('');

  // Auto-extract headings from rendered prose if not provided
  useEffect(() => {
    if (headingsProp?.length) {
      setHeadings(headingsProp);
      return;
    }

    const container = document.querySelector(contentSelector);
    if (!container) return;

    const els = container.querySelectorAll('h2, h3');
    const extracted = Array.from(els).map((el) => {
      if (!el.id) {
        el.id = el.textContent
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
          .slice(0, 60);
      }
      return { id: el.id, text: el.textContent, level: Number(el.tagName[1]) };
    });

    setHeadings(extracted);
  }, [headingsProp, contentSelector]);

  // Highlight active heading on scroll
  useEffect(() => {
    if (!headings.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: '0px 0px -60% 0px', threshold: 0 }
    );

    headings.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [headings]);

  if (!headings.length) return null;

  return (
    <aside className="hidden xl:block w-56 shrink-0">
      <div className="sticky top-20">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-brand-text-muted">
          On this page
        </p>
        <nav>
          <ul className="space-y-1">
            {headings.map(({ id, text, level }) => (
              <li key={id}>
                <Link
                  href={`#${id}`}
                  className={clsx(
                    'block truncate py-1 text-sm transition-colors',
                    level === 3 ? 'pl-3' : '',
                    activeId === id
                      ? 'font-medium text-brand-primary'
                      : 'text-brand-text-muted hover:text-brand-foreground'
                  )}
                >
                  {text}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </aside>
  );
}
