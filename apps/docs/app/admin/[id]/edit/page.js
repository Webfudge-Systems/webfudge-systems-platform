'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import DocPageForm from '../../../../components/DocPageForm';
import { uploadMarkdown, updatePage } from '../../../../lib/api/documentationService';
import { strapiClient } from '../../../../lib/strapiClient';

export default function EditDocPage() {
  const router = useRouter();
  const { id } = useParams();

  const [page, setPage] = useState(null);
  const [fetching, setFetching] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (id) {
      strapiClient.get(`/documentation-pages/${id}`)
        .then((res) => { setPage(res?.data); setFetching(false); })
        .catch(() => { setError('Page not found'); setFetching(false); });
    }
  }, [id]);

  async function handleSubmit(payload, mode) {
    setSubmitting(true);
    setError(null);
    try {
      if (mode === 'upload') {
        await uploadMarkdown(payload);
      } else {
        const { applicationId, application, ...rest } = payload;
        await updatePage(id, {
          ...rest,
          ...(applicationId || application ? { application: applicationId || application } : {}),
        });
      }
      router.push('/admin');
    } catch (err) {
      setError(err.message || 'Failed to update page');
      setSubmitting(false);
    }
  }

  if (fetching) {
    return (
      <div className="flex items-center justify-center py-20 text-brand-text-muted text-sm">
        Loading…
      </div>
    );
  }

  if (error && !page) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10">
        <p className="text-red-600 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="rounded-2xl border p-5" style={{ background: 'var(--admin-panel-soft)', borderColor: 'var(--admin-border)' }}>
        <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--admin-accent)' }}>Guided authoring</p>
        <h2 className="mt-2 text-2xl font-black tracking-tight" style={{ color: 'var(--admin-text)' }}>Edit documentation page</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6" style={{ color: 'var(--admin-muted)' }}>
          Editing {page?.title || 'this page'}. Save as draft while shaping content, then use the final checklist before publishing.
        </p>
      </section>
      <DocPageForm
        initialData={page}
        onSubmit={handleSubmit}
        onCancel={() => router.push('/admin')}
        submitting={submitting}
        error={error}
      />
    </div>
  );
}
