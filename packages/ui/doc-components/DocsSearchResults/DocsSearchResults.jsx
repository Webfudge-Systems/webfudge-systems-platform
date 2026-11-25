'use client';

import Link from 'next/link';
import { AppWindow, BookOpen, FileText, SearchX, Settings, Shapes } from 'lucide-react';
import { clsx } from 'clsx';

function SearchResultIcon({ page }) {
  const value = `${page.type || ''} ${page.category || ''} ${page.application?.name || ''}`.toLowerCase();
  const Icon = value.includes('admin')
    ? Settings
    : value.includes('component')
      ? Shapes
      : value.includes('getting') || value.includes('started')
    ? BookOpen
    : value.includes('application') || value.includes('app')
      ? AppWindow
      : FileText;

  return <Icon className="mt-0.5 h-4 w-4 shrink-0 text-brand-text-muted" aria-hidden />;
}

function highlightMatch(text = '', query = '') {
  if (!text || !query) return text;

  const safeQuery = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (!safeQuery) return text;

  const parts = text.split(new RegExp(`(${safeQuery})`, 'ig'));
  return parts.map((part, index) =>
    part.toLowerCase() === query.trim().toLowerCase() ? (
      <mark key={`${part}-${index}`} className="rounded bg-brand-light px-0.5 text-brand-primary">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

/**
 * Command-palette search results panel.
 *
 * @param {{ results: Array, query: string, onClose: () => void, className?: string, loading?: boolean, activeIndex?: number, onActiveIndexChange?: (index: number) => void, onSelect?: (result: object) => void }} props
 */
export function DocsSearchResults({
  results = [],
  query = '',
  onClose,
  className,
  loading = false,
  activeIndex = 0,
  onActiveIndexChange,
  onSelect,
}) {
  const hasQuery = query.trim().length >= 2;
  const groupedResults = groupResults(results);
  let resultIndex = -1;

  if (!hasQuery) {
    return (
      <div className={clsx('p-6 text-center', className)}>
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-brand-light text-brand-primary dark:bg-orange-500/10">
          <SearchX className="h-5 w-5" />
        </div>
        <p className="text-sm font-medium text-brand-dark dark:text-white">Search across docs, applications, components, and admin tools.</p>
        <p className="mt-1 text-xs text-brand-text-muted">Type at least two characters, then use arrow keys and Enter to open a result.</p>
      </div>
    );
  }

  return (
    <div
      className={clsx(
        'overflow-hidden bg-white transition-all duration-150 ease-out dark:bg-[#121212]',
        'motion-safe:animate-[docs-search-enter_150ms_ease-out]',
        className
      )}
    >
      {loading ? (
        <div className="space-y-3 px-4 py-5">
          <p className="text-xs font-bold uppercase tracking-wider text-brand-text-muted">Searching</p>
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-14 animate-pulse rounded-xl bg-brand-hover dark:bg-white/5" />
          ))}
        </div>
      ) : results.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-4 py-8 text-center text-brand-text-muted">
          <SearchX className="h-8 w-8 opacity-40" />
          <p className="text-sm">No results for <strong>&ldquo;{query}&rdquo;</strong></p>
          <p className="text-xs">Try a product name, component, imported app, or admin action.</p>
        </div>
      ) : (
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {groupedResults.map(([group, items]) => (
            <section key={group} className="py-2">
              <h3 className="px-3 pb-2 text-[11px] font-black uppercase tracking-wider text-brand-text-muted">{group}</h3>
              <ul className="space-y-1">
                {items.map((page) => {
                  resultIndex += 1;
                  const currentIndex = resultIndex;
                  const href = getResultHref(page);
                  const isActive = activeIndex === currentIndex;
                  const content = (
                    <>
                      <SearchResultIcon page={page} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-brand-dark dark:text-white">{highlightMatch(page.title, query)}</p>
                        {page.snippet || page.description ? (
                          <p className="line-clamp-2 text-brand-text-muted dark:text-gray-400">{highlightMatch(page.snippet || page.description, query)}</p>
                        ) : null}
                        {page.category ? (
                          <p className="mt-0.5 text-xs text-brand-text-muted">
                            {page.application?.name ? `${page.application.name} · ` : ''}{page.category}
                          </p>
                        ) : null}
                      </div>
                    </>
                  );

                  return (
                    <li key={page.id || page.href || page.slug || page.title}>
                      {href ? (
                        <Link
                          href={href}
                          onMouseEnter={() => onActiveIndexChange?.(currentIndex)}
                          onClick={(event) => {
                            if (onSelect) {
                              event.preventDefault();
                              onSelect(page);
                            } else {
                              onClose?.();
                            }
                          }}
                          className={clsx(
                            'flex items-start gap-3 rounded-xl px-3 py-3 text-sm transition-colors',
                            isActive ? 'bg-brand-light dark:bg-white/10' : 'hover:bg-brand-hover dark:hover:bg-white/5'
                          )}
                        >
                          {content}
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onMouseEnter={() => onActiveIndexChange?.(currentIndex)}
                          onClick={() => onSelect?.(page)}
                          className={clsx(
                            'flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left text-sm transition-colors',
                            isActive ? 'bg-brand-light dark:bg-white/10' : 'hover:bg-brand-hover dark:hover:bg-white/5'
                          )}
                        >
                          {content}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function groupResults(results) {
  const groups = new Map();
  for (const result of results) {
    const group = result.type || (result.application?.name ? 'Applications' : 'Pages');
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push(result);
  }
  return [...groups.entries()];
}

function getResultHref(result) {
  if (result?.href) return result.href;
  if (result?.slug) return `/docs/${result.slug}`;
  return null;
}
