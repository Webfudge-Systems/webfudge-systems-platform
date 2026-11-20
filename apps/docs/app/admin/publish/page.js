'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Sparkles, Upload } from 'lucide-react';
import { authService } from '@webfudge/auth';

const inputClass =
  'block w-full rounded-lg border border-brand-border bg-white px-3 py-2.5 text-sm text-brand-foreground focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20';

export default function PublishApplicationPage() {
  const router = useRouter();
  
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [publishConfirmed, setPublishConfirmed] = useState(false);
  const [form, setForm] = useState({
    title: '',
    slug: '',
    tagline: '',
    description: '',
    color: '#F5630F',
    category: 'Applications',
    status: 'published',
  });
  const [suggestedBlocks, setSuggestedBlocks] = useState([]);
  const [selectedBlockIds, setSelectedBlockIds] = useState(new Set());

  async function handleAnalyze(selectedFile) {
    if (!selectedFile) return;
    setLoading(true);
    setError(null);
    try {
      const token = authService.getToken();
      const body = new FormData();
      body.append('file', selectedFile);
      const res = await fetch('/api/admin/extract-readme', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Could not extract metadata');
      const data = json.data;
      setForm((prev) => ({
        ...prev,
        title: data.title || prev.title,
        slug: data.slug || prev.slug,
        tagline: data.tagline || prev.tagline,
        description: data.description || prev.description,
        color: data.color || prev.color,
        category: data.category || prev.category,
      }));
      if (data.suggestedBlocks && data.suggestedBlocks.length > 0) {
        setSuggestedBlocks(data.suggestedBlocks);
        setSelectedBlockIds(new Set(data.suggestedBlocks.map(b => b.id)));
      }
    } catch (err) {
      setError(err.message || 'Metadata extraction failed');
    }
    setLoading(false);
  }

  async function handlePublish(e) {
    e.preventDefault();
    if (!file) return;
    if (!publishConfirmed) {
      setError('Confirm the publish checklist before publishing this application.');
      return;
    }
    setPublishing(true);
    setError(null);
    setResult(null);
    try {
      const token = authService.getToken();
      const body = new FormData();
      body.append('file', file);
      Object.entries(form).forEach(([key, value]) => body.append(key, value));
      const blocksToPublish = suggestedBlocks
        .filter((b) => selectedBlockIds.has(b.id))
        .map((b) => b.blockProps);
      if (blocksToPublish.length > 0) {
        body.append('blocks', JSON.stringify(blocksToPublish));
      }
      const res = await fetch('/api/admin/publish-application', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Publishing failed');
      setResult(json.data);
    } catch (err) {
      setError(err.message || 'Publishing failed');
    }
    setPublishing(false);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="rounded-2xl border p-5" style={{ background: 'var(--admin-panel-soft)', borderColor: 'var(--admin-border)' }}>
        <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--admin-accent)' }}>Publish workflow</p>
        <h2 className="mt-2 text-2xl font-black tracking-tight" style={{ color: 'var(--admin-text)' }}>Publish new application</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6" style={{ color: 'var(--admin-muted)' }}>
          Upload a README, review extracted metadata and suggested blocks, then confirm the checklist before publishing to Applications.
        </p>
      </section>
      <form onSubmit={handlePublish} className="space-y-6">
        <div className="rounded-xl border border-brand-border bg-white p-6">
          <label className="mb-2 block text-sm font-medium text-brand-dark">README file</label>
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-brand-border p-4 hover:bg-brand-light">
            <Upload className="h-5 w-5 text-brand-primary" />
            <span className="text-sm text-brand-text-light">
              {file ? file.name : 'Choose README.md'}
            </span>
            <input
              type="file"
              accept=".md,text/markdown,text/plain"
              className="hidden"
              onChange={(e) => {
                const selected = e.target.files?.[0] || null;
                setFile(selected);
              }}
            />
          </label>

          <div className="mt-3">
            <button
              type="button"
              onClick={() => handleAnalyze(file)}
              disabled={!file || loading}
              className="inline-flex items-center gap-2 rounded-lg border border-brand-border px-3 py-2 text-sm hover:bg-brand-hover disabled:opacity-60"
            >
              <Sparkles className="h-4 w-4" />
              {loading ? 'Analyzing README…' : 'Suggest metadata from README'}
            </button>
          </div>
        </div>

        <div className="grid gap-4 rounded-xl border border-brand-border bg-white p-6 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-brand-dark">Application Name</label>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputClass} required />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-brand-dark">Slug</label>
            <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className={inputClass} required />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-brand-dark">Color</label>
            <input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className={inputClass} />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-brand-dark">Tagline</label>
            <input value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} className={inputClass} />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-brand-dark">Description</label>
            <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={`${inputClass} resize-y`} />
          </div>
        </div>

        {suggestedBlocks.length > 0 ? (
          <div className="rounded-xl border border-brand-border bg-brand-light/20 p-6">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-brand-dark">
              <Sparkles className="h-4 w-4 text-brand-primary" /> Recommended Visual Components
            </h3>
            <div className="space-y-3">
              {suggestedBlocks.map((block) => (
                <label key={block.id} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${selectedBlockIds.has(block.id) ? 'border-brand-primary bg-brand-primary/5' : 'border-brand-border bg-white hover:border-brand-primary/50'}`}>
                  <div className="flex h-5 items-center">
                    <input
                      type="checkbox"
                      checked={selectedBlockIds.has(block.id)}
                      onChange={(e) => {
                        const newSet = new Set(selectedBlockIds);
                        if (e.target.checked) newSet.add(block.id);
                        else newSet.delete(block.id);
                        setSelectedBlockIds(newSet);
                      }}
                      className="h-4 w-4 rounded border-brand-border text-brand-primary focus:ring-brand-primary"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-brand-dark">{block.name}</p>
                    <p className="mt-1 text-xs text-brand-text-muted">{block.reasoning}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        ) : null}

        {result ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Published successfully.{' '}
            <a className="underline" href={`/applications/${form.slug}`}>Open Viewer</a>
            {' · '}
            <a className="underline" href={`/applications/${form.slug}/docs`}>Open Official Documentation</a>
          </div>
        ) : null}

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">Publish checklist</p>
              <p className="mt-1">Confirm the app name, slug, description, and selected visual components are ready for public docs navigation.</p>
              <label className="mt-3 flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={publishConfirmed}
                  onChange={(e) => {
                    setPublishConfirmed(e.target.checked);
                    if (e.target.checked) setError(null);
                  }}
                  className="h-4 w-4 rounded border-amber-300 text-brand-primary focus:ring-brand-primary"
                />
                I reviewed this application and want to publish it.
              </label>
            </div>
          </div>
        </div>

        <div className="glass-panel sticky bottom-4 z-10 flex justify-end gap-3 rounded-2xl border-white/10 bg-[#101018]/95 p-3">
          <button type="button" onClick={() => router.push('/admin')} className="rounded-lg border border-brand-border px-4 py-2 text-sm hover:bg-brand-hover">
            Back
          </button>
          <button type="submit" disabled={!file || publishing} className="rounded-lg bg-brand-primary px-5 py-2 text-sm font-semibold text-white hover:bg-brand-primary/90 disabled:opacity-60">
            {publishing ? 'Publishing…' : 'Publish Application'}
          </button>
        </div>
      </form>
    </div>
  );
}
