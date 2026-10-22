import { clsx } from 'clsx';

export function DocsProse({ className, children, as: Component = 'div' }) {
  return (
    <Component
      className={clsx(
        'docs-prose text-brand-foreground',
        '[&_h2]:mt-12 [&_h2]:mb-5 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:tracking-tight [&_h2]:text-brand-dark dark:[&_h2]:text-gray-100',
        '[&_h3]:mt-10 [&_h3]:mb-4 [&_h3]:text-xl [&_h3]:font-bold [&_h3]:tracking-tight [&_h3]:text-brand-dark dark:[&_h3]:text-gray-100',
        '[&_p]:mb-5 [&_p]:leading-relaxed [&_p]:text-brand-text-light dark:[&_p]:text-gray-300',
        '[&_ul]:mb-5 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6 [&_ul]:text-brand-text-light dark:[&_ul]:text-gray-300',
        '[&_ol]:mb-5 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-6 [&_ol]:text-brand-text-light dark:[&_ol]:text-gray-300',
        '[&_li]:leading-relaxed',
        '[&_a]:font-semibold [&_a]:text-brand-primary [&_a]:underline-offset-4 hover:[&_a]:underline transition-all',
        '[&_code]:rounded-md [&_code]:bg-orange-500/10 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.85em] [&_code]:text-orange-700 dark:[&_code]:bg-white/10 dark:[&_code]:text-gray-200 border border-orange-500/20 dark:border-white/10',
        '[&_pre]:mb-6 [&_pre]:overflow-x-auto [&_pre]:rounded-2xl [&_pre]:border [&_pre]:border-white/10 [&_pre]:bg-[#0c0c0c] [&_pre]:p-5 [&_pre]:text-sm [&_pre]:text-gray-100 [&_pre]:shadow-xl',
        '[&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-inherit [&_pre_code]:border-none',
        '[&_table]:mb-8 [&_table]:w-full [&_table]:border-collapse [&_table]:text-sm',
        '[&_th]:border-b [&_th]:border-brand-border [&_th]:bg-brand-light/50 [&_th]:px-4 [&_th]:py-3 [&_th]:text-left [&_th]:font-bold [&_th]:text-brand-dark dark:[&_th]:border-[#2a2a2a] dark:[&_th]:bg-[#1a1a1a]/50 dark:[&_th]:text-white',
        '[&_td]:border-b [&_td]:border-brand-border/60 [&_td]:px-4 [&_td]:py-3 [&_td]:align-top [&_td]:text-brand-text-light dark:[&_td]:border-[#2a2a2a]/60 dark:[&_td]:text-gray-300',
        '[&_hr]:my-10 [&_hr]:border-brand-border/60 dark:[&_hr]:border-[#2a2a2a]',
        '[&_strong]:font-bold [&_strong]:text-brand-dark dark:[&_strong]:text-white',
        className
      )}
    >
      {children}
    </Component>
  );
}
