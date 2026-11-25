import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

/**
 * Breadcrumb trail for doc pages.
 *
 * @param {{ crumbs: Array<{label: string, href?: string}> }} props
 */
export function DocsBreadcrumbs({ crumbs = [] }) {
  if (!crumbs.length) return null;

  return (
    <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-1 text-sm text-brand-text-muted">
      {crumbs.map((crumb, index) => {
        const isLast = index === crumbs.length - 1;
        return (
          <span key={crumb.label} className="flex items-center gap-1">
            {index > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-brand-border" aria-hidden />}
            {isLast || !crumb.href ? (
              <span className={isLast ? 'font-medium text-brand-foreground' : ''}>{crumb.label}</span>
            ) : (
              <Link
                href={crumb.href}
                className="hover:text-brand-primary transition-colors"
              >
                {crumb.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
