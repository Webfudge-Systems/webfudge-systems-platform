import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-brand-border dark:border-white/5 pt-12 pb-6 text-sm text-brand-text-muted">
      <div className="grid gap-8 grid-cols-2 md:grid-cols-4 max-w-5xl mx-auto mb-10">
        <div className="space-y-3">
          <h4 className="font-bold text-brand-dark dark:text-white text-xs uppercase tracking-wider">Resources</h4>
          <ul className="space-y-2 text-xs">
            <li><Link href="/getting-started" className="hover:text-brand-primary transition-colors">Setup guides</Link></li>
            <li><Link href="/system-overview" className="hover:text-brand-primary transition-colors">System Overview</Link></li>
            <li><Link href="/troubleshooting" className="hover:text-brand-primary transition-colors">Troubleshooting</Link></li>
          </ul>
        </div>
        <div className="space-y-3">
          <h4 className="font-bold text-brand-dark dark:text-white text-xs uppercase tracking-wider">Console</h4>
          <ul className="space-y-2 text-xs">
            <li><Link href="/admin" className="hover:text-brand-primary transition-colors">Ingestion console</Link></li>
            <li><Link href="/admin?tab=feedback" className="hover:text-brand-primary transition-colors">User feedback logs</Link></li>
            <li><Link href="/admin?tab=apps" className="hover:text-brand-primary transition-colors">Active applications</Link></li>
          </ul>
        </div>
        <div className="space-y-3">
          <h4 className="font-bold text-brand-dark dark:text-white text-xs uppercase tracking-wider">Platform</h4>
          <ul className="space-y-2 text-xs">
            <li><Link href="/" className="hover:text-brand-primary transition-colors">Docs homepage</Link></li>
            <li><Link href="/components" className="hover:text-brand-primary transition-colors">Component catalog</Link></li>
            <li><Link href="/glossary" className="hover:text-brand-primary transition-colors">Glossary</Link></li>
          </ul>
        </div>
        <div className="space-y-3">
          <h4 className="font-bold text-brand-dark dark:text-white text-xs uppercase tracking-wider">Security</h4>
          <ul className="space-y-2 text-xs">
            <li><Link href="/permissions" className="hover:text-brand-primary transition-colors">RBAC policies</Link></li>
            <li><Link href="/user-types" className="hover:text-brand-primary transition-colors">User directory</Link></li>
            <li><Link href="/system-overview" className="hover:text-brand-primary transition-colors">Architecture overview</Link></li>
          </ul>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-6 border-t border-brand-border/40 dark:border-white/5">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded bg-brand-primary text-[10px] font-bold text-white">W</span>
          <span className="text-xs font-semibold text-brand-dark dark:text-gray-300">Webfudge Systems Platform</span>
        </div>
        <p className="text-xs">Built with Webfudge © 2026. Version 1.0.0</p>
      </div>
    </footer>
  );
}
