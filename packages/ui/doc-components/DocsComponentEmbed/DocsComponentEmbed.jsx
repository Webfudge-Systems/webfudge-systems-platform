export function DocsComponentEmbed({ storyId, title, devUrl = 'http://localhost:6010', className }) {
  const staticSrc = `/storybook/iframe.html?id=${storyId}&viewMode=story`;
  const devSrc = `${devUrl.replace(/\/$/, '')}/iframe.html?id=${storyId}&viewMode=story`;
  const src = process.env.NODE_ENV === 'development' ? devSrc : staticSrc;

  return (
    <div className={className}>
      <div className="overflow-hidden rounded-xl border border-brand-border bg-white shadow-soft">
        <div className="flex items-center justify-between gap-3 border-b border-brand-border px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-brand-dark">{title}</p>
            <p className="text-xs text-brand-text-muted">Interactive Storybook preview</p>
          </div>
          <a
            href={src}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-brand-border px-3 py-1.5 text-xs font-medium text-brand-foreground transition-colors hover:bg-brand-hover"
          >
            Open in Storybook
          </a>
        </div>
        <iframe
          title={title}
          src={src}
          className="h-[520px] w-full bg-white"
          loading="lazy"
        />
      </div>
    </div>
  );
}
