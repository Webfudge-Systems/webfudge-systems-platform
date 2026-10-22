'use client';

import { DocsProse } from '@webfudge/ui/doc-components';

/**
 * Renders pre-processed HTML from Strapi's `content` field inside DocsProse.
 * The HTML was sanitized server-side during ingestion (rehype-sanitize).
 */
export default function MarkdownRenderer({ html, className }) {
  if (!html) return null;

  return (
    <DocsProse className={className}>
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </DocsProse>
  );
}
