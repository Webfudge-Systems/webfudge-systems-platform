'use client';

import { DocsBreadcrumbs, DocsFeedback, DocsTableOfContents } from '@webfudge/ui/doc-components';
import { submitFeedback } from '../lib/api/documentationService';
import Footer from './Footer';

export default function DocPageLayout({ crumbs = [], children, showToc = true, feedbackPage }) {
  function handleFeedbackSubmit(payload) {
    return submitFeedback({
      ...payload,
      pageId: feedbackPage?.id,
      pageSlug: feedbackPage?.slug,
      pageTitle: feedbackPage?.title || crumbs.at(-1)?.label,
    });
  }

  return (
    <div className="w-full">
      <div className={showToc ? "flex flex-col xl:flex-row xl:gap-10" : "w-full"}>
        <div className="flex-1 min-w-0">
          <DocsBreadcrumbs crumbs={crumbs} />
          {children}
          {feedbackPage !== false ? <DocsFeedback onSubmit={handleFeedbackSubmit} /> : null}
        </div>
        {showToc ? <DocsTableOfContents /> : null}
      </div>
      <Footer />
    </div>
  );
}
