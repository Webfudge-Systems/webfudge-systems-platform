'use client';

import { useEffect, useState } from 'react';
import { Eye, Save, RefreshCw } from 'lucide-react';
import { Tabs } from '@webfudge/ui/components';
import BlockEditor from './BlockEditor';
import { authService } from '@webfudge/auth';
import { createBlock } from '../../lib/blocks';
import BlockRenderer from '../BlockRenderer';

const inputClass =
  'block w-full rounded-lg border border-brand-border bg-white px-3 py-2 text-sm text-brand-foreground focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20';

function Field({ label, children, className = '' }) {
  return (
    <div className={className}>
      <label className="mb-1 block text-xs font-medium text-brand-dark">{label}</label>
      {children}
    </div>
  );
}

function PageMetaEditor({ page, onChange }) {
  return (
    <div className="mb-6 grid gap-4 sm:grid-cols-2">
      <Field label="Category" className="sm:col-span-1">
        <input type="text" value={page.category || ''} onChange={(e) => onChange({ ...page, category: e.target.value })} className={inputClass} />
      </Field>
      <Field label="Title" className="sm:col-span-2">
        <input type="text" value={page.title || ''} onChange={(e) => onChange({ ...page, title: e.target.value })} className={inputClass} />
      </Field>
      <Field label="Description" className="sm:col-span-2">
        <textarea rows={2} value={page.description || ''} onChange={(e) => onChange({ ...page, description: e.target.value })} className={`${inputClass} resize-none`} />
      </Field>
      {page.callout ? (
        <div className="sm:col-span-2 rounded-xl border border-brand-border bg-brand-light/40 p-4 space-y-3">
          <p className="text-xs font-semibold uppercase text-brand-text-muted">Callout</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Variant">
              <select value={page.callout.variant || 'tip'} onChange={(e) => onChange({ ...page, callout: { ...page.callout, variant: e.target.value } })} className={inputClass}>
                {['tip', 'info', 'warning', 'danger'].map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </Field>
            <Field label="Title" className="sm:col-span-2">
              <input type="text" value={page.callout.title || ''} onChange={(e) => onChange({ ...page, callout: { ...page.callout, title: e.target.value } })} className={inputClass} />
            </Field>
            <Field label="Body" className="sm:col-span-3">
              <textarea rows={2} value={page.callout.body || ''} onChange={(e) => onChange({ ...page, callout: { ...page.callout, body: e.target.value } })} className={`${inputClass} resize-none`} />
            </Field>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function AppEditor({ app, onChange }) {
  function updateFeature(index, patch) {
    const features = app.features.map((f, i) => (i === index ? { ...f, ...patch } : f));
    onChange({ ...app, features });
  }

  function updateStep(index, patch) {
    const gettingStarted = app.gettingStarted.map((s, i) => (i === index ? { ...s, ...patch } : s));
    onChange({ ...app, gettingStarted });
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name">
          <input type="text" value={app.name || ''} onChange={(e) => onChange({ ...app, name: e.target.value })} className={inputClass} />
        </Field>
        <Field label="Slug">
          <input type="text" value={app.slug || ''} readOnly className={`${inputClass} bg-brand-light`} />
        </Field>
        <Field label="Tagline" className="sm:col-span-2">
          <input type="text" value={app.tagline || ''} onChange={(e) => onChange({ ...app, tagline: e.target.value })} className={inputClass} />
        </Field>
        <Field label="Description" className="sm:col-span-2">
          <textarea rows={3} value={app.description || ''} onChange={(e) => onChange({ ...app, description: e.target.value })} className={`${inputClass} resize-y`} />
        </Field>
        <Field label="Brand color">
          <div className="flex gap-2">
            <input type="color" value={app.color || '#F5630F'} onChange={(e) => onChange({ ...app, color: e.target.value })} className="h-10 w-14 rounded border border-brand-border" />
            <input type="text" value={app.color || ''} onChange={(e) => onChange({ ...app, color: e.target.value })} className={inputClass} />
          </div>
        </Field>
      </div>

      <div>
        <h4 className="mb-3 text-sm font-semibold text-brand-dark">Features</h4>
        <div className="space-y-3">
          {(app.features || []).map((feature, index) => (
            <div key={index} className="rounded-lg border border-brand-border p-3">
              <input type="text" value={feature.title} onChange={(e) => updateFeature(index, { title: e.target.value })} className={`${inputClass} mb-2`} placeholder="Title" />
              <textarea rows={2} value={feature.description} onChange={(e) => updateFeature(index, { description: e.target.value })} className={`${inputClass} resize-y`} placeholder="Description" />
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="mb-3 text-sm font-semibold text-brand-dark">Getting Started Steps</h4>
        <div className="space-y-3">
          {(app.gettingStarted || []).map((step, index) => (
            <div key={index} className="rounded-lg border border-brand-border p-3">
              <input type="text" value={step.title} onChange={(e) => updateStep(index, { title: e.target.value })} className={`${inputClass} mb-2`} placeholder="Title" />
              <textarea rows={2} value={step.description} onChange={(e) => updateStep(index, { description: e.target.value })} className={`${inputClass} resize-y`} placeholder="Description" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function NavigationEditor({ navigation, onChange }) {
  function updateSection(sectionIndex, patch) {
    onChange(navigation.map((section, i) => (i === sectionIndex ? { ...section, ...patch } : section)));
  }

  function updateItem(sectionIndex, itemIndex, patch) {
    const section = navigation[sectionIndex];
    const items = section.items.map((item, i) => (i === itemIndex ? { ...item, ...patch } : item));
    updateSection(sectionIndex, { items });
  }

  return (
    <div className="space-y-4">
      {navigation.map((section, sectionIndex) => (
        <div key={section.key || sectionIndex} className="rounded-xl border border-brand-border bg-white p-4">
          <div className="mb-3 grid gap-3 sm:grid-cols-2">
            <Field label="Section title">
              <input type="text" value={section.title} onChange={(e) => updateSection(sectionIndex, { title: e.target.value })} className={inputClass} />
            </Field>
            <Field label="Key">
              <input type="text" value={section.key} onChange={(e) => updateSection(sectionIndex, { key: e.target.value })} className={inputClass} />
            </Field>
          </div>
          <div className="space-y-2">
            {section.items.map((item, itemIndex) => (
              <div key={itemIndex} className="grid gap-2 sm:grid-cols-2">
                <input type="text" value={item.label} placeholder="Label" onChange={(e) => updateItem(sectionIndex, itemIndex, { label: e.target.value })} className={inputClass} />
                <input type="text" value={item.href} placeholder="/path" onChange={(e) => updateItem(sectionIndex, itemIndex, { href: e.target.value })} className={inputClass} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function SiteContentEditor() {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [activeApp, setActiveApp] = useState('crm');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    loadContent();
  }, []);

  async function loadContent() {
    setLoading(true);
    try {
      const res = await fetch('/api/site-content');
      const json = await res.json();
      setContent(json.data);
      setHasUnsavedChanges(false);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
    setLoading(false);
  }

  async function saveContent() {
    setSaving(true);
    setMessage(null);
    try {
      const token = authService.getToken();
      const res = await fetch('/api/site-content', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ data: content }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Save failed');
      setContent(json.data);
      setHasUnsavedChanges(false);
      setMessage({ type: 'success', text: 'Site content saved successfully.' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
    setSaving(false);
  }

  function updateContent(next) {
    setContent(next);
    setHasUnsavedChanges(true);
  }

  function applyTemplate(target) {
    if (target === 'home') {
      const hero = createBlock('heading');
      hero.level = 2;
      hero.text = 'Build faster with the Webfudge docs platform';
      const intro = createBlock('paragraph');
      intro.text = '<p>Explore guides, architecture overviews, and app-specific workflows in one place.</p>';
      const flow = createBlock('mermaid');
      flow.code = 'flowchart LR\n  Hub[Docs Hub] --> Apps[Application Docs]\n  Apps --> Publish[Publish Pipeline]\n  Publish --> Editor[Block Editor]';
      const walkthrough = createBlock('walkthrough');
      walkthrough.steps = [
        { title: 'Choose an application', description: 'Open an app hub to see docs and quick actions.' },
        { title: 'Review setup guides', description: 'Follow onboarding and environment setup steps.' },
        { title: 'Ship updates', description: 'Use the admin publish flow to roll out docs changes.' },
      ];
      updateContent({
        ...content,
        home: { ...content.home, blocks: [hero, intro, flow, walkthrough] },
      });
    }

    if (target === 'system') {
      const heading = createBlock('heading');
      heading.level = 2;
      heading.text = 'System architecture at a glance';
      const diagram = createBlock('appDiagram');
      const embed = createBlock('componentEmbed');
      embed.title = 'Docs Shell Demo';
      updateContent({
        ...content,
        systemOverview: { ...content.systemOverview, blocks: [heading, diagram, embed] },
      });
    }
  }

  if (loading || !content) {
    return (
      <div className="flex items-center justify-center py-12 text-brand-text-muted text-sm">
        Loading site content…
      </div>
    );
  }

  const appSlugs = Object.keys(content.applications || {});

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-brand-text-muted">
            Edit homepage, system overview, navigation, and application hub content.
          </p>
          {hasUnsavedChanges ? (
            <p className="mt-1 text-xs font-semibold text-amber-600">Unsaved changes</p>
          ) : (
            <p className="mt-1 text-xs text-brand-text-muted">All changes saved</p>
          )}
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={loadContent} className="inline-flex items-center gap-1.5 rounded-lg border border-brand-border px-3 py-2 text-sm hover:bg-brand-hover">
            <RefreshCw className="h-4 w-4" />
            Reload
          </button>
          <button type="button" onClick={saveContent} disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white hover:bg-brand-primary/90 disabled:opacity-60">
            <Save className="h-4 w-4" />
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>

      {message ? (
        <div className={`rounded-lg px-4 py-3 text-sm ${message.type === 'error' ? 'border border-red-200 bg-red-50 text-red-800' : 'border border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
          {message.text}
        </div>
      ) : null}

      <Tabs
        variant="default"
        defaultTab="home"
        tabs={[
          {
            id: 'home',
            label: 'Homepage',
            content: (
              <div className="mt-4">
                <PageMetaEditor page={content.home} onChange={(home) => updateContent({ ...content, home })} />
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-brand-dark">Content blocks</h4>
                  <button type="button" onClick={() => applyTemplate('home')} className="text-xs font-medium text-brand-primary hover:underline">
                    Apply immersive template
                  </button>
                </div>
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
                  <BlockEditor blocks={content.home.blocks || []} onChange={(blocks) => updateContent({ ...content, home: { ...content.home, blocks } })} />
                  <PreviewPanel blocks={content.home.blocks || []} />
                </div>
              </div>
            ),
          },
          {
            id: 'system',
            label: 'System Overview',
            content: (
              <div className="mt-4">
                <PageMetaEditor page={content.systemOverview} onChange={(systemOverview) => updateContent({ ...content, systemOverview })} />
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-brand-dark">Content blocks</h4>
                  <button type="button" onClick={() => applyTemplate('system')} className="text-xs font-medium text-brand-primary hover:underline">
                    Apply architecture template
                  </button>
                </div>
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
                  <BlockEditor blocks={content.systemOverview.blocks || []} onChange={(blocks) => updateContent({ ...content, systemOverview: { ...content.systemOverview, blocks } })} />
                  <PreviewPanel blocks={content.systemOverview.blocks || []} />
                </div>
              </div>
            ),
          },
          {
            id: 'navigation',
            label: 'Navigation',
            content: (
              <div className="mt-4">
                <NavigationEditor navigation={content.navigation || []} onChange={(navigation) => updateContent({ ...content, navigation })} />
              </div>
            ),
          },
          {
            id: 'applications',
            label: 'Applications',
            content: (
              <div className="mt-4 space-y-4">
                <div className="flex flex-wrap gap-2">
                  {appSlugs.map((slug) => (
                    <button
                      key={slug}
                      type="button"
                      onClick={() => setActiveApp(slug)}
                      className={`rounded-lg px-3 py-1.5 text-sm font-medium ${activeApp === slug ? 'bg-brand-primary text-white' : 'border border-brand-border bg-white hover:bg-brand-hover'}`}
                    >
                      {content.applications[slug]?.name || slug}
                    </button>
                  ))}
                </div>
                <AppEditor
                  app={content.applications[activeApp]}
                  onChange={(app) => updateContent({
                    ...content,
                    applications: { ...content.applications, [activeApp]: app },
                  })}
                />
              </div>
            ),
          },
          {
            id: 'preview',
            label: 'Live Site Preview',
            content: (
              <div className="mt-4">
                <SitePreview content={content} />
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}

function PreviewPanel({ blocks }) {
  return (
    <aside className="rounded-xl border border-brand-border bg-white p-4 xl:sticky xl:top-6 xl:max-h-[75vh] xl:overflow-auto">
      <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-brand-text-muted">
        <Eye className="h-3.5 w-3.5" />
        Preview
      </p>
      <BlockRenderer blocks={blocks} />
    </aside>
  );
}

/**
 * Live mock of the public documentation site, driven entirely by the current
 * (unsaved) editor state so admins see selections and changes reflected
 * immediately: navigation sidebar, homepage hero/blocks, and application hub.
 */
function SitePreview({ content }) {
  const [section, setSection] = useState('home');
  const navigation = Array.isArray(content.navigation) ? content.navigation : [];
  const apps = Object.values(content.applications || {});
  const page = section === 'system' ? content.systemOverview : content.home;

  return (
    <div className="admin-site-preview">
      <div className="flex items-center gap-2 border-b border-brand-border bg-brand-light/70 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
        <div className="ml-3 flex-1 truncate rounded-md bg-white px-3 py-1 text-[11px] font-medium text-brand-text-muted">
          docs.webfudge.in
        </div>
        <div className="flex gap-1">
          {[
            { id: 'home', label: 'Home' },
            { id: 'system', label: 'System' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSection(t.id)}
              className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition ${
                section === t.id ? 'bg-brand-primary text-white' : 'text-brand-text-muted hover:bg-brand-hover'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid max-h-[72vh] grid-cols-1 overflow-auto md:grid-cols-[230px_1fr]">
        <aside className="hidden border-r border-brand-border bg-brand-light/40 p-4 md:block">
          <p className="mb-3 text-sm font-black tracking-tight text-brand-dark">Webfudge Docs</p>
          <nav className="space-y-4">
            {navigation.length === 0 ? (
              <p className="text-xs text-brand-text-muted">No navigation sections yet.</p>
            ) : null}
            {navigation.map((sec, i) => (
              <div key={sec.key || i}>
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-brand-text-muted">{sec.title || 'Section'}</p>
                <ul className="space-y-1">
                  {(sec.items || []).map((item, j) => (
                    <li key={j} className="truncate rounded-md px-2 py-1 text-xs text-brand-text-light hover:bg-white hover:text-brand-primary">
                      {item.label || item.href || 'Untitled'}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </aside>

        <main className="p-6 sm:p-8">
          {page?.category ? (
            <span className="rounded-full bg-brand-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-brand-primary">
              {page.category}
            </span>
          ) : null}
          <h1 className="mt-3 text-3xl font-black tracking-tight text-brand-dark">{page?.title || 'Untitled'}</h1>
          {page?.description ? (
            <p className="mt-2 text-[15px] leading-relaxed text-brand-text-light">{page.description}</p>
          ) : null}
          <div className="mt-6 border-t border-brand-border pt-6">
            <BlockRenderer blocks={page?.blocks || []} />
          </div>

          {section === 'home' && apps.length > 0 ? (
            <div className="mt-10">
              <h2 className="mb-4 text-lg font-bold text-brand-dark">Applications</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {apps.map((app) => (
                  <div key={app.slug || app.name} className="rounded-xl border border-brand-border bg-white p-4">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ background: app.color || '#F5630F' }} />
                      <p className="font-bold text-brand-dark">{app.name}</p>
                    </div>
                    {app.tagline ? <p className="mt-1 text-xs font-medium text-brand-primary">{app.tagline}</p> : null}
                    {app.description ? <p className="mt-2 text-sm leading-relaxed text-brand-text-light">{app.description}</p> : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
}
