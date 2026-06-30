export function DocsArticle({ category, title, description, children }) {
  return (
    <article>
      {category ? (
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-brand-primary">{category}</p>
      ) : null}
      <header className="mb-8 border-b border-brand-border pb-8">
        <h1 className="text-3xl font-bold tracking-tight text-brand-dark sm:text-4xl">{title}</h1>
        {description ? (
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-brand-text-light">{description}</p>
        ) : null}
      </header>
      {children}
    </article>
  );
}
