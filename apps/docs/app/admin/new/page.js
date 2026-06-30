'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DocPageForm from '../../../components/DocPageForm';
import { uploadMarkdown, createPage } from '../../../lib/api/documentationService';

export default function NewDocPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(payload, mode) {
    setSubmitting(true);
    setError(null);
    try {
      if (mode === 'upload') {
        await uploadMarkdown(payload);
      } else {
        const { applicationId, application, ...rest } = payload;
        await createPage({
          ...rest,
          ...(applicationId || application ? { application: applicationId || application } : {}),
        });
      }
      router.push('/admin');
    } catch (err) {
      setError(err.message || 'Failed to create page');
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="rounded-2xl border p-5" style={{ background: 'var(--admin-panel-soft)', borderColor: 'var(--admin-border)' }}>
        <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--admin-accent)' }}>Guided authoring</p>
        <h2 className="mt-2 text-2xl font-black tracking-tight" style={{ color: 'var(--admin-text)' }}>Add documentation page</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6" style={{ color: 'var(--admin-muted)' }}>
          Upload a README or start from blank, map the page metadata, review blocks or Markdown, then confirm the publish checklist.
        </p>
      </section>
      <DocPageForm
        onSubmit={handleSubmit}
        onCancel={() => router.push('/admin')}
        submitting={submitting}
        error={error}
      />
    </div>
  );
}
