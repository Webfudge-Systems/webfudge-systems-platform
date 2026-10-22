import { AlertTriangle, Info, Lightbulb } from 'lucide-react';
import { clsx } from 'clsx';

const VARIANTS = {
  info: {
    icon: Info,
    wrapper: 'border border-blue-200 border-l-[6px] border-l-blue-500 bg-blue-50/60 dark:border-blue-900/40 dark:border-l-blue-500 dark:bg-blue-900/20',
    title: 'text-blue-900 dark:text-blue-100',
    body: 'text-blue-800/90 dark:text-blue-100/90',
    iconClass: 'text-blue-600 dark:text-blue-400',
  },
  warning: {
    icon: AlertTriangle,
    wrapper: 'border border-amber-200 border-l-[6px] border-l-amber-500 bg-amber-50/60 dark:border-amber-900/40 dark:border-l-amber-500 dark:bg-amber-900/20',
    title: 'text-amber-900 dark:text-amber-100',
    body: 'text-amber-900/90 dark:text-amber-100/90',
    iconClass: 'text-amber-600 dark:text-amber-400',
  },
  tip: {
    icon: Lightbulb,
    wrapper: 'border border-emerald-200 border-l-[6px] border-l-emerald-500 bg-emerald-50/60 dark:border-emerald-900/40 dark:border-l-emerald-500 dark:bg-emerald-900/20',
    title: 'text-emerald-900 dark:text-emerald-100',
    body: 'text-emerald-900/90 dark:text-emerald-100/90',
    iconClass: 'text-emerald-600 dark:text-emerald-400',
  },
  danger: {
    icon: AlertTriangle,
    wrapper: 'border border-red-200 border-l-[6px] border-l-red-500 bg-red-50/60 dark:border-red-900/40 dark:border-l-red-500 dark:bg-red-900/20',
    title: 'text-red-900 dark:text-red-100',
    body: 'text-red-900/90 dark:text-red-100/90',
    iconClass: 'text-red-600 dark:text-red-400',
  },
};

export function DocsCallout({ variant = 'info', title, children }) {
  const config = VARIANTS[variant] || VARIANTS.info;
  const Icon = config.icon;

  return (
    <div className={clsx('my-6 flex gap-3 rounded-xl p-5 transition-all duration-300 hover:shadow-md', config.wrapper)}>
      <Icon className={clsx('mt-0.5 h-5 w-5 shrink-0', config.iconClass)} aria-hidden />
      <div className="min-w-0">
        {title ? <p className={clsx('mb-1 text-sm font-semibold', config.title)}>{title}</p> : null}
        <div className={clsx('text-sm leading-relaxed', config.body)}>{children}</div>
      </div>
    </div>
  );
}
