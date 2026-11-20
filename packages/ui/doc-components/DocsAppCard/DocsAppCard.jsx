import Link from 'next/link';
import { clsx } from 'clsx';

export function DocsAppCard({ badge, title, description, port, href, className }) {
  const content = (
    <>
      {badge ? (
        <p className="text-[11px] font-bold uppercase tracking-widest text-brand-primary dark:text-orange-400">{badge}</p>
      ) : null}
      <h3 className="mt-2 text-base font-semibold text-brand-dark dark:text-white">{title}</h3>
      {description ? (
        <p className="mt-2 text-sm leading-relaxed text-brand-text-light dark:text-gray-300">{description}</p>
      ) : null}
      {port ? (
        <p className="mt-4 font-mono text-xs text-brand-text-muted dark:text-gray-500">{port}</p>
      ) : null}
    </>
  );

  const cardClass = clsx(
    'glass-panel rounded-xl p-5 transition-all duration-300 hover:shadow-[0_8px_30px_rgb(245,99,15,0.12)] dark:hover:shadow-[0_8px_30px_rgb(245,99,15,0.15)] hover:-translate-y-1',
    href && 'block hover:border-brand-primary/40 dark:hover:border-brand-primary/40',
    className
  );

  if (href) {
    return (
      <Link href={href} className={cardClass}>
        {content}
      </Link>
    );
  }

  return <div className={cardClass}>{content}</div>;
}
