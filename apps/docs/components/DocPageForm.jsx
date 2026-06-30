'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Eye, FileText, Upload } from 'lucide-react';
import { getApps } from '../lib/api/documentationService';
import { blocksToMarkdown, markdownToBlocks } from '../lib/blocks';
import BlockEditor from './admin/BlockEditor';
import BlockRenderer from './BlockRenderer';
import CategorySelect from './admin/CategorySelect';

const inputClass =
  'block w-full rounded-lg border border-brand-border bg-white px-3 py-2.5 text-sm text-brand-foreground placeholder:text-brand-text-muted focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20';

const STEPS = [
  { id: 'source', label: 'Source', description: 'Upload README or start blank' },
  { id: 'metadata', label: 'Metadata', description: 'Title, category, app' },
  { id: 'content', label: 'Content', description: 'Blocks or Markdown' },
  { id: 'preview', label: 'Preview', description: 'Review rendered page' },
  { id: 'publish', label: 'Publish', description: 'Final checklist' },
];

export default function DocPageForm({ initialData = null, onSubmit, onCancel, submitting = false, error }) {
  const [apps, setApps] = useState([]);
  const [form, setForm] = useState({
    title: initialData?.title || '',
    description: initialData?.description || '',
    applicationId: initialData?.application?.id || '',
    category: initialData?.category || '',
    order: initialData?.order ?? 0,
    status: initialData?.status || 'draft',
  });
  const [file, setFile] = useState(null);
  const [uploadState, setUploadState] = useState(null);
  const [blocks, setBlocks] = useState(
    initialData?.contentBlocks?.length
      ? initialData.contentBlocks
      : markdownToBlocks(initialData?.markdownSource || '')
  );
  const [markdown, setMarkdown] = useState(initialData?.markdownSource || '');
  const [activeStep, setActiveStep] = useState(initialData ? 'metadata' : 'source');
  const [contentTab, setContentTab] = useState('blocks');
  const [publishConfirmed, setPublishConfirmed] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    getApps().then(setApps).catch(() => {});
  }, []);

  useEffect(() => {
    if (contentTab === 'markdown') {
      setMarkdown(blocksToMarkdown(blocks));
    }
  }, [contentTab, blocks]);

  function handleFileChange(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setUploadState({ type: 'reading', message: 'Reading Markdown file…' });
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      setMarkdown(text);
      setBlocks(markdownToBlocks(text));
      setUploadState({ type: 'success', message: 'README parsed. Review metadata and blocks next.' });
      setActiveStep('metadata');
      setForm((prev) => ({
        ...prev,
        title: prev.title || inferTitle(text, f.name),
        description: prev.description || inferDescription(text),
      }));
    };
    reader.onerror = () => {
      setUploadState({ type: 'error', message: 'Could not read this Markdown file.' });
    };
    reader.readAsText(f);
  }

  function handleField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function syncBlocksFromMarkdown() {
    setBlocks(markdownToBlocks(markdown));
    setContentTab('blocks');
  }

  function getValidationItems(markdownSource = contentTab === 'markdown' ? markdown : blocksToMarkdown(blocks)) {
    const hasContent = blocks.length > 0 || markdownSource.trim().length > 0;
    return [
      { id: 'title', label: 'Title is set', ok: form.title.trim().length > 0, required: true },
      { id: 'description', label: 'Description explains the page', ok: form.description.trim().length >= 20 },
      { id: 'category', label: 'Category is selected', ok: form.category.trim().length > 0 },
      { id: 'application', label: 'Application mapping reviewed', ok: Boolean(form.applicationId) },
      { id: 'content', label: 'Content is not empty', ok: hasContent, required: true },
    ];
  }

  function canSubmit(markdownSource) {
    return getValidationItems(markdownSource).filter((item) => item.required).every((item) => item.ok);
  }

  function submitWithStatus(status) {
    const markdownSource = contentTab === 'markdown' ? markdown : blocksToMarkdown(blocks);
    const contentBlocks = blocks;
    if (!canSubmit(markdownSource)) {
      setActiveStep('publish');
      return;
    }

    if (status === 'published' && !publishConfirmed) {
      setActiveStep('publish');
      return;
    }

    if (file) {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('title', form.title);
      fd.append('description', form.description);
      fd.append('category', form.category);
      fd.append('order', String(form.order));
      fd.append('status', status);
      if (form.applicationId) fd.append('applicationId', String(form.applicationId));
      onSubmit(fd, 'upload');
      return;
    }

    onSubmit({
      ...form,
      status,
      application: form.applicationId ? form.applicationId : null,
      markdownSource,
      contentBlocks,
    }, 'update');
  }

  return (
    <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-5">
        {STEPS.map((step, index) => {
          const isActive = activeStep === step.id;
          return (
            <button
              key={step.id}
              type="button"
              onClick={() => setActiveStep(step.id)}
              className={`rounded-2xl border p-4 text-left transition ${
                isActive
                  ? 'border-[#F5630F]/40 bg-[#F5630F]/10 text-white'
                  : 'border-white/10 bg-white/[0.04] text-gray-300 hover:bg-white/[0.07]'
              }`}
            >
              <span className="text-[11px] font-black uppercase tracking-[0.18em] text-[#F5630F]">Step {index + 1}</span>
              <span className="mt-1 block text-sm font-bold">{step.label}</span>
              <span className="mt-1 block text-xs text-gray-500">{step.description}</span>
            </button>
          );
        })}
      </div>

      <section className="rounded-2xl border border-white/10 bg-white p-5 shadow-2xl shadow-black/10">
        {activeStep === 'source' && (
          <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
            <div>
              <h3 className="text-lg font-black text-brand-dark">Choose a starting point</h3>
              <p className="mt-1 text-sm text-brand-text-muted">Upload Markdown to prefill content, or continue with a blank block editor.</p>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="mt-5 flex w-full cursor-pointer flex-col items-center rounded-xl border-2 border-dashed border-brand-border bg-brand-light px-6 py-10 text-center transition-colors hover:border-brand-primary"
              >
                <Upload className="mb-3 h-9 w-9 text-brand-primary" />
                <span className="text-sm font-semibold text-brand-foreground">{file ? file.name : 'Upload README.md'}</span>
                <span className="mt-1 text-xs text-brand-text-muted">Markdown is parsed into editable blocks before save.</span>
                <input ref={fileRef} type="file" accept=".md,text/markdown,text/plain" className="sr-only" onChange={handleFileChange} />
              </button>
              {uploadState ? (
                <p className={`mt-3 rounded-lg px-3 py-2 text-sm ${
                  uploadState.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
                }`}>
                  {uploadState.message}
                </p>
              ) : null}
            </div>
            <div className="rounded-xl border border-brand-border bg-brand-light/40 p-5">
              <FileText className="h-8 w-8 text-brand-primary" />
              <h4 className="mt-4 text-sm font-bold text-brand-dark">Start from blank</h4>
              <p className="mt-2 text-sm leading-6 text-brand-text-muted">Skip upload and create a page from metadata plus blocks or Markdown.</p>
              <button type="button" onClick={() => setActiveStep('metadata')} className="mt-4 rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white hover:bg-brand-primary/90">
                Continue blank
              </button>
            </div>
          </div>
        )}

        {activeStep === 'metadata' && (
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-brand-dark">Title <span className="text-red-500">*</span></label>
              <input type="text" required value={form.title} onChange={(e) => handleField('title', e.target.value)} className={inputClass} />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-brand-dark">Description</label>
              <textarea rows={3} value={form.description} onChange={(e) => handleField('description', e.target.value)} className={`${inputClass} resize-y`} placeholder="Summarize what this page helps the reader do." />
              {form.description && form.description.trim().length < 20 ? (
                <p className="mt-1 text-xs text-amber-600">A little more context will make this easier to scan in admin lists.</p>
              ) : null}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-brand-dark">Application mapping</label>
              <select value={form.applicationId} onChange={(e) => handleField('applicationId', e.target.value)} className={inputClass}>
                <option value="">No application selected</option>
                {apps.map((app) => <option key={app.id} value={app.id}>{app.name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-brand-dark">Category</label>
              <CategorySelect value={form.category} onChange={(val) => handleField('category', val)} className={inputClass} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-brand-dark">Order</label>
              <input type="number" min={0} value={form.order} onChange={(e) => handleField('order', Number(e.target.value))} className={inputClass} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-brand-dark">Current intent</label>
              <select value={form.status} onChange={(e) => handleField('status', e.target.value)} className={inputClass}>
                <option value="draft">Draft</option>
                <option value="published">Ready to publish</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>
        )}

        {activeStep === 'content' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-brand-text-muted">Edit blocks for structured pages, or switch to Markdown and parse it back into blocks.</p>
              <div className="rounded-xl border border-brand-border bg-brand-light p-1">
                {['blocks', 'markdown'].map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setContentTab(tab)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold capitalize ${contentTab === tab ? 'bg-white text-brand-primary shadow-sm' : 'text-brand-text-muted'}`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>
            {contentTab === 'blocks' ? (
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_460px]">
                <BlockEditor blocks={blocks} onChange={setBlocks} />
                <div className="xl:sticky xl:top-6 xl:max-h-[78vh] xl:overflow-auto">
                  <DocPreviewFrame form={form} blocks={blocks} apps={apps} />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-end">
                  <button type="button" onClick={syncBlocksFromMarkdown} className="text-sm font-medium text-brand-primary hover:underline">
                    Parse Markdown into blocks
                  </button>
                </div>
                <textarea
                  rows={18}
                  value={markdown}
                  onChange={(e) => setMarkdown(e.target.value)}
                  className={`${inputClass} resize-y font-mono text-xs`}
                  placeholder="## Heading&#10;&#10;Paragraph text…"
                />
              </div>
            )}
          </div>
        )}

        {activeStep === 'preview' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-brand-dark">
              <Eye className="h-4 w-4 text-brand-primary" />
              Rendered page preview
            </div>
            <DocPreviewFrame form={form} blocks={blocks} apps={apps} large />
          </div>
        )}

        {activeStep === 'publish' && (
          <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
            <div>
              <h3 className="text-lg font-black text-brand-dark">Publish checklist</h3>
              <p className="mt-1 text-sm text-brand-text-muted">Resolve required items before saving. Warnings can be saved as draft, but should be reviewed before publishing.</p>
              <div className="mt-4 space-y-2">
                {getValidationItems().map((item) => (
                  <div key={item.id} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                    item.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : item.required ? 'border-red-200 bg-red-50 text-red-800' : 'border-amber-200 bg-amber-50 text-amber-800'
                  }`}>
                    {item.ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                    {item.label}
                    {!item.required && !item.ok ? <span className="ml-auto text-xs font-semibold">Warning</span> : null}
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-brand-border bg-brand-light/40 p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-text-muted">Final confirmation</p>
              <p className="mt-2 text-sm leading-6 text-brand-text-light">Publishing makes this page available to readers if its route is exposed in navigation or direct links.</p>
              <label className="mt-4 flex items-start gap-2 text-sm font-medium text-brand-dark">
                <input
                  type="checkbox"
                  checked={publishConfirmed}
                  onChange={(e) => setPublishConfirmed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-brand-border text-brand-primary focus:ring-brand-primary"
                />
                I reviewed the preview and want to publish this page.
              </label>
              {form.status === 'published' && !publishConfirmed ? (
                <p className="mt-3 text-xs text-amber-700">Confirm this checklist to publish, or save as draft.</p>
              ) : null}
            </div>
          </div>
        )}
      </section>

      <div className="glass-panel sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border-white/10 bg-[#101018]/95 p-3">
        <p className="text-xs text-gray-400">Save drafts freely. Publishing requires the final checklist.</p>
        <div className="flex flex-wrap justify-end gap-3">
        <button type="button" onClick={onCancel} className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-white/[0.06]">
          Cancel
        </button>
        <button type="button" onClick={() => submitWithStatus('draft')} disabled={submitting} className="rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-gray-200 hover:bg-white/[0.06] disabled:opacity-60">
          {submitting ? 'Saving…' : 'Save draft'}
        </button>
        <button type="button" onClick={() => setActiveStep('preview')} className="rounded-lg border border-[#F5630F]/30 px-4 py-2 text-sm font-semibold text-[#F5630F] hover:bg-[#F5630F]/10">
          Preview
        </button>
        <button type="button" onClick={() => submitWithStatus('published')} disabled={submitting} className="rounded-lg bg-brand-primary px-5 py-2 text-sm font-semibold text-white hover:bg-brand-primary/90 disabled:opacity-60">
          {submitting ? 'Publishing…' : (initialData ? 'Publish update' : 'Publish page')}
        </button>
        </div>
      </div>
    </form>
  );
}

function slugify(value = '') {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/**
 * Renders the editor content the way the live documentation site presents it:
 * a browser-style chrome with the resolved URL, the page title, category badge,
 * description, and the rendered blocks. Updates live as the form changes.
 */
function DocPreviewFrame({ form, blocks, apps = [], large = false }) {
  const app = apps.find((a) => String(a.id) === String(form.applicationId));
  const slug = slugify(form.title) || 'page-slug';
  const url = app?.slug ? `/applications/${app.slug}/${slug}` : `/docs/${slug}`;
  const hasContent = blocks?.length > 0;

  return (
    <div className="overflow-hidden rounded-2xl border border-brand-border bg-white shadow-xl shadow-black/5">
      <div className="flex items-center gap-2 border-b border-brand-border bg-brand-light/70 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
        <div className="ml-3 flex-1 truncate rounded-md bg-white px-3 py-1 text-[11px] font-medium text-brand-text-muted">
          docs.webfudge.in{url}
        </div>
        <span className="hidden rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-600 sm:inline">
          Live
        </span>
      </div>
      <div className={`${large ? 'p-8 sm:p-10' : 'p-6'} max-h-[70vh] overflow-auto`}>
        <div className="mb-6 border-b border-brand-border pb-6">
          <div className="flex flex-wrap items-center gap-2">
            {form.category ? (
              <span className="rounded-full bg-brand-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-brand-primary">
                {form.category}
              </span>
            ) : null}
            {app ? (
              <span className="rounded-full bg-brand-light px-3 py-1 text-[11px] font-semibold text-brand-text-muted">
                {app.name}
              </span>
            ) : null}
            <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
              form.status === 'published'
                ? 'bg-emerald-500/10 text-emerald-600'
                : form.status === 'archived'
                  ? 'bg-slate-500/10 text-slate-500'
                  : 'bg-amber-500/10 text-amber-600'
            }`}>
              {form.status === 'published' ? 'Published' : form.status === 'archived' ? 'Archived' : 'Draft'}
            </span>
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-tight text-brand-dark">
            {form.title || 'Untitled page'}
          </h1>
          {form.description ? (
            <p className="mt-2 text-[15px] leading-relaxed text-brand-text-light">{form.description}</p>
          ) : null}
        </div>
        {hasContent ? (
          <BlockRenderer blocks={blocks} />
        ) : (
          <div className="rounded-xl border border-dashed border-brand-border p-10 text-center text-sm text-brand-text-muted">
            Add content blocks to see them rendered here.
          </div>
        )}
      </div>
    </div>
  );
}

function inferTitle(markdown, fallbackName) {
  const heading = markdown.match(/^#\s+(.+)$/m)?.[1];
  if (heading) return heading.trim();
  return fallbackName.replace(/\.(md|markdown|txt)$/i, '').replace(/[-_]/g, ' ');
}

function inferDescription(markdown) {
  return markdown
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith('#') && !line.startsWith('```'))
    ?.replace(/^[-*>]+\s*/, '')
    .slice(0, 180) || '';
}
