'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Edit2,
  Trash2,
  Eye,
  FileText,
  Upload,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Loader2,
  CheckCircle,
  AlertTriangle,
  History,
  FileCode,
} from 'lucide-react';
import {
  getAllPages,
  deletePage,
  getApps,
  getFeedback,
  deleteApp,
  publishHtmlDocumentation,
} from '../../lib/api/documentationService';
import { strapiClient } from '../../lib/strapiClient';
import SiteContentEditor from '../../components/admin/SiteContentEditor';
import CategorySelect from '../../components/admin/CategorySelect';
import { GlassMetricCard } from '@webfudge/ui/doc-components';
import { motion, AnimatePresence } from 'framer-motion';

const STATUS_COLORS = {
  published: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  draft: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  archived: 'bg-slate-500/10 text-slate-500 dark:text-slate-400',
};

const glass = { backdropFilter: 'blur(16px) saturate(140%)', WebkitBackdropFilter: 'blur(16px) saturate(140%)' };
const panelStyle = { background: 'var(--admin-panel)', border: '1px solid var(--admin-border)', ...glass };
const softPanelStyle = { background: 'var(--admin-panel-soft)', border: '1px solid var(--admin-border)', ...glass };

function relativeTime(value) {
  if (!value) return '';
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return '';
  const diff = Date.now() - then;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(value).toLocaleDateString();
}

export default function AdminDashboard() {
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const activeTab = ['upload', 'site', 'apps', 'feedback'].includes(requestedTab) ? requestedTab : 'upload';
  const [toast, setToast] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [pages, setPages] = useState([]);
  const [fetchingPages, setFetchingPages] = useState(true);

  const [apps, setApps] = useState([]);
  const [fetchingApps, setFetchingApps] = useState(false);

  const [feedback, setFeedback] = useState([]);
  const [fetchingFeedback, setFetchingFeedback] = useState(false);
  const [feedbackStats, setFeedbackStats] = useState({ helpful: 0, notHelpful: 0, total: 0 });

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const loadPages = useCallback(async () => {
    setFetchingPages(true);
    try {
      const data = await getAllPages();
      setPages(data);
    } catch (err) {
      showToast('Failed to load pages: ' + err.message, 'error');
    }
    setFetchingPages(false);
  }, [showToast]);

  const loadApps = useCallback(async () => {
    setFetchingApps(true);
    try {
      const data = await getApps();
      setApps(data);
    } catch (err) {
      showToast('Failed to load apps', 'error');
    }
    setFetchingApps(false);
  }, [showToast]);

  const loadFeedback = useCallback(async () => {
    setFetchingFeedback(true);
    try {
      const data = await getFeedback();
      setFeedback(data);
      const helpful = data.filter((item) => item.helpful === true).length;
      const notHelpful = data.filter((item) => item.helpful === false).length;
      setFeedbackStats({ helpful, notHelpful, total: data.length });
    } catch (err) {
      showToast('Failed to load feedback', 'error');
    }
    setFetchingFeedback(false);
  }, [showToast]);

  useEffect(() => {
    loadPages();
  }, [loadPages]);

  useEffect(() => {
    if (activeTab === 'apps') loadApps();
    if (activeTab === 'feedback') loadFeedback();
  }, [activeTab, loadApps, loadFeedback]);

  async function handleDelete(id) {
    try {
      await deletePage(id);
      setPages((prev) => prev.filter((p) => p.id !== id));
      setDeleteTarget(null);
      showToast('Page deleted successfully');
    } catch (err) {
      showToast('Delete failed: ' + err.message, 'error');
    }
  }

  async function handleDeleteApp(slug) {
    try {
      await deleteApp(slug);
      setApps((prev) => prev.filter((a) => a.slug !== slug));
      setDeleteTarget(null);
      showToast('Application deleted successfully');
    } catch (err) {
      showToast('Delete failed: ' + err.message, 'error');
    }
  }

  const totalPages = pages.length;
  const publishedPages = pages.filter((p) => p.status === 'published').length;
  const draftPages = pages.filter((p) => p.status === 'draft').length;

  const recentPages = [...pages]
    .filter((p) => p.updatedAt || p.createdAt)
    .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
    .slice(0, 5);

  return (
    <div className="space-y-8" style={{ color: 'var(--admin-text-soft)' }}>
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed right-6 top-6 z-[120] flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-xl ${
              toast.type === 'error' ? 'bg-red-500' : 'bg-emerald-500'
            }`}
          >
            {toast.type === 'error' ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header summary */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl p-5" style={softPanelStyle}>
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight" style={{ color: 'var(--admin-text)' }}>
            {getTabTitle(activeTab)}
          </h2>
          <p className="mt-1 text-xs" style={{ color: 'var(--admin-muted)' }}>
            Upload HTML once, edit the extracted overview, choose where it appears, and give viewers a direct documentation link.
          </p>
        </div>
        <a
          href="#html-upload"
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold text-white transition hover:opacity-90"
          style={{ background: 'var(--admin-accent)' }}
        >
          <Upload className="h-4 w-4" />
          Upload HTML
        </a>
      </div>

      {/* Dashboard metrics — restored inside the single Ingestion Portal */}
      {activeTab === 'upload' && (
        <div className="grid gap-4 sm:grid-cols-3">
          <GlassMetricCard title="Total Pages" value={totalPages} icon={FileText} accentColor="#2563eb" />
          <GlassMetricCard title="Published" value={publishedPages} icon={CheckCircle2} accentColor="#10b981" />
          <GlassMetricCard title="Drafts" value={draftPages} icon={AlertTriangle} accentColor="#f59e0b" />
        </div>
      )}

      <div>
        <AnimatePresence mode="wait">
          {activeTab === 'upload' && (
            <motion.div
              key="tab-upload-dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="space-y-6"
            >
              {fetchingPages ? (
                <SkeletonLoader count={4} />
              ) : pages.length === 0 ? (
                <div className="rounded-2xl border border-dashed p-12 text-center" style={{ borderColor: 'var(--admin-border-strong)', background: 'var(--admin-panel)' }}>
                  <FileText className="mx-auto mb-4 h-12 w-12" style={{ color: 'var(--admin-muted)' }} />
                  <h3 className="text-lg font-bold" style={{ color: 'var(--admin-text)' }}>No Documentation Pages Yet</h3>
                  <p className="mt-1 text-sm" style={{ color: 'var(--admin-muted)' }}>
                    Upload an HTML file below to create the first viewer overview.
                  </p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl" style={panelStyle}>
                  <table className="hidden w-full border-collapse text-left text-sm lg:table">
                    <thead>
                      <tr className="text-xs font-bold uppercase tracking-wider" style={{ background: 'var(--admin-panel-soft)', color: 'var(--admin-muted)' }}>
                        <th className="px-6 py-4">Title</th>
                        <th className="px-6 py-4">Category</th>
                        <th className="px-6 py-4">Application</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pages.map((page) => (
                        <tr key={page.id} className="group border-t" style={{ borderColor: 'var(--admin-border)' }}>
                          <td className="px-6 py-4 font-semibold" style={{ color: 'var(--admin-text)' }}>
                            <span>{page.title}</span>
                            <span className="ml-2 font-mono text-xs font-normal" style={{ color: 'var(--admin-muted)' }}>/{page.slug}</span>
                          </td>
                          <td className="px-6 py-4" style={{ color: 'var(--admin-muted)' }}>{page.category || 'General'}</td>
                          <td className="px-6 py-4">
                            {page.application?.name ? (
                              <span className="inline-block rounded-md px-2 py-0.5 text-[10px] font-bold text-white" style={{ backgroundColor: page.application.color || '#2563eb' }}>
                                {page.application.name}
                              </span>
                            ) : '—'}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold capitalize ${STATUS_COLORS[page.status] || ''}`}>
                              {page.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1.5 opacity-70 transition-opacity group-hover:opacity-100">
                              {page.status === 'published' && (
                                <Link href={`/docs/${page.slug}`} className="rounded-lg p-2 transition-colors hover:bg-blue-500/10" title="View" aria-label={`View ${page.title}`} style={{ color: 'var(--admin-muted)' }}>
                                  <Eye className="h-4 w-4" />
                                </Link>
                              )}
                              <Link href={`/admin/${page.id}/edit`} className="rounded-lg p-2 transition-colors hover:bg-blue-500/10" title="Edit" aria-label={`Edit ${page.title}`} style={{ color: 'var(--admin-muted)' }}>
                                <Edit2 className="h-4 w-4" />
                              </Link>
                              <button type="button" onClick={() => setDeleteTarget({ type: 'page', id: page.id, name: page.title })} className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-500" title="Delete" aria-label={`Delete ${page.title}`}>
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="lg:hidden">
                    {pages.map((page) => (
                      <article key={page.id} className="space-y-4 border-t p-4 first:border-t-0" style={{ borderColor: 'var(--admin-border)' }}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="truncate text-sm font-bold" style={{ color: 'var(--admin-text)' }}>{page.title}</h3>
                            <p className="mt-1 truncate font-mono text-[11px]" style={{ color: 'var(--admin-muted)' }}>/{page.slug}</p>
                          </div>
                          <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold capitalize ${STATUS_COLORS[page.status] || ''}`}>
                            {page.status}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {page.status === 'published' && (
                            <Link href={`/docs/${page.slug}`} className="rounded-lg border px-3 py-2 text-xs font-bold" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-soft)' }} aria-label={`View ${page.title}`}>View</Link>
                          )}
                          <Link href={`/admin/${page.id}/edit`} className="rounded-lg border px-3 py-2 text-xs font-bold" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-soft)' }} aria-label={`Edit ${page.title}`}>Edit</Link>
                          <button type="button" onClick={() => setDeleteTarget({ type: 'page', id: page.id, name: page.title })} className="rounded-lg border border-red-500/30 px-3 py-2 text-xs font-bold text-red-500" aria-label={`Delete ${page.title}`}>Delete</button>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent updates — derived from real page data */}
              <div className="rounded-2xl p-6" style={panelStyle}>
                <h3 className="mb-4 flex items-center gap-2 text-base font-bold" style={{ color: 'var(--admin-text)' }}>
                  <History className="h-5 w-5" style={{ color: 'var(--admin-muted)' }} />
                  Recent Updates
                </h3>
                {recentPages.length === 0 ? (
                  <p className="text-xs" style={{ color: 'var(--admin-muted)' }}>No recent activity yet.</p>
                ) : (
                  <div className="space-y-3">
                    {recentPages.map((page) => (
                      <div key={page.id} className="flex items-center justify-between border-b pb-2.5 text-xs last:border-b-0" style={{ borderColor: 'var(--admin-border)' }}>
                        <div className="min-w-0">
                          <p className="truncate font-semibold" style={{ color: 'var(--admin-text-soft)' }}>{page.title}</p>
                          <p className="mt-0.5 truncate font-mono" style={{ color: 'var(--admin-muted)' }}>/{page.slug}</p>
                        </div>
                        <span className="shrink-0 font-mono" style={{ color: 'var(--admin-muted)' }}>{relativeTime(page.updatedAt || page.createdAt)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <UploadPortal showToast={showToast} onRefresh={loadPages} pages={pages} />
            </motion.div>
          )}

          {activeTab === 'site' && (
            <motion.div key="tab-site" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15 }} className="rounded-2xl p-6" style={panelStyle}>
              <SiteContentEditor />
            </motion.div>
          )}

          {activeTab === 'apps' && (
            <motion.div key="tab-apps" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15 }} className="space-y-6">
              {fetchingApps ? (
                <SkeletonLoader count={3} />
              ) : apps.length === 0 ? (
                <div className="rounded-2xl border border-dashed p-10 text-center text-sm" style={{ borderColor: 'var(--admin-border-strong)', color: 'var(--admin-muted)' }}>
                  No applications found.
                </div>
              ) : (
                <div className="grid gap-6 sm:grid-cols-3">
                  {apps.map((app) => (
                    <div key={app.id} className="group relative overflow-hidden rounded-2xl p-5 transition-all hover:shadow-xl" style={panelStyle}>
                      <div className="absolute bottom-0 left-0 top-0 w-1.5" style={{ backgroundColor: app.color || '#2563eb' }} />
                      <div className="mb-4 flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-base font-bold" style={{ color: 'var(--admin-text)' }}>{app.name}</h3>
                          <p className="mt-0.5 font-mono text-[10px]" style={{ color: 'var(--admin-muted)' }}>SLUG: {app.slug}</p>
                        </div>
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${app.isActive !== false ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-500/10 text-slate-400'}`}>
                          {app.isActive !== false ? 'active' : 'inactive'}
                        </span>
                      </div>
                      <p className="mb-6 line-clamp-2 text-xs leading-relaxed" style={{ color: 'var(--admin-muted)' }}>{app.description}</p>
                      <div className="flex items-center justify-between border-t pt-4 text-xs" style={{ borderColor: 'var(--admin-border)' }}>
                        <span className="font-semibold" style={{ color: 'var(--admin-muted)' }}>Order: {app.order || 0}</span>
                        <div className="flex items-center gap-3">
                          <button type="button" onClick={() => setDeleteTarget({ type: 'app', id: app.slug, name: app.name || app.slug })} className="text-slate-400 transition-colors hover:text-red-500" title="Delete App" aria-label={`Delete application ${app.name || app.slug}`}>
                            <Trash2 className="h-4 w-4" />
                          </button>
                          <Link href="/admin?tab=site" className="font-bold hover:underline" style={{ color: 'var(--admin-accent)' }}>Edit Hub Settings</Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'feedback' && (
            <motion.div key="tab-feedback" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15 }} className="space-y-6">
              {fetchingFeedback ? (
                <SkeletonLoader count={2} />
              ) : (
                <>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <FeedbackStat icon={CheckCircle2} value={feedbackStats.helpful} label="Helpful Votes" tone="emerald" />
                    <FeedbackStat icon={XCircle} value={feedbackStats.notHelpful} label="Not Helpful Votes" tone="red" />
                    <FeedbackStat icon={MessageSquare} value={feedbackStats.total} label="Total Submissions" tone="blue" />
                  </div>

                  <div className="overflow-hidden rounded-2xl" style={panelStyle}>
                    <div className="border-b px-6 py-4" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-panel-soft)' }}>
                      <h3 className="text-sm font-bold" style={{ color: 'var(--admin-text)' }}>Recent Feedback Details</h3>
                    </div>
                    {feedback.length === 0 ? (
                      <div className="p-8 text-center" style={{ color: 'var(--admin-muted)' }}>No feedback submissions found.</div>
                    ) : (
                      <div>
                        {feedback.map((item, i) => (
                          <div key={i} className="flex gap-4 border-b p-6 last:border-b-0" style={{ borderColor: 'var(--admin-border)' }}>
                            <span className="mt-0.5">
                              {item.helpful ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>{item.pageTitle || 'Core Document'}</span>
                                <span className="font-mono text-[10px]" style={{ color: 'var(--admin-muted)' }}>/{item.pageSlug}</span>
                                <span className="ml-auto text-[10px]" style={{ color: 'var(--admin-muted)' }}>{new Date(item.createdAt).toLocaleDateString()}</span>
                              </div>
                              {item.comment && (
                                <p className="mt-2 rounded-xl border p-3 text-xs leading-relaxed" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-panel-soft)', color: 'var(--admin-text-soft)' }}>{item.comment}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <DeleteConfirmation
        target={deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          if (deleteTarget.type === 'page') handleDelete(deleteTarget.id);
          if (deleteTarget.type === 'app') handleDeleteApp(deleteTarget.id);
        }}
      />
    </div>
  );
}

function FeedbackStat({ icon: Icon, value, label, tone }) {
  const tones = {
    emerald: 'bg-emerald-500/10 text-emerald-500',
    red: 'bg-red-500/10 text-red-500',
    blue: 'bg-blue-500/10 text-blue-500',
  };
  return (
    <div className="flex items-center gap-4 rounded-2xl p-5" style={panelStyle}>
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tones[tone] || tones.blue}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-2xl font-extrabold" style={{ color: 'var(--admin-text)' }}>{value}</p>
        <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-muted)' }}>{label}</p>
      </div>
    </div>
  );
}

function getTabTitle(tab) {
  return {
    pages: 'Ingestion Portal',
    upload: 'Ingestion Portal',
    site: 'Site Content',
    apps: 'Applications',
    feedback: 'User Feedback',
  }[tab] || 'Ingestion Portal';
}

function DeleteConfirmation({ target, onCancel, onConfirm }) {
  if (!target) return null;

  const noun = target.type === 'app' ? 'application' : 'documentation page';
  const impact = target.type === 'app'
    ? 'This also removes the application navigation links connected to this slug.'
    : 'This removes the page from the documentation index.';

  return (
    <div className="admin-shell fixed inset-0 z-[120] flex items-center justify-center px-4 backdrop-blur-sm" style={{ background: 'rgba(2,6,18,0.6)' }} role="alertdialog" aria-modal="true" aria-labelledby="delete-title">
      <div className="w-full max-w-md rounded-2xl border border-red-500/30 p-6 shadow-2xl" style={{ background: 'var(--admin-panel)' }}>
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-red-500/10 p-2 text-red-500">
            <Trash2 className="h-5 w-5" />
          </span>
          <div>
            <h2 id="delete-title" className="text-lg font-black" style={{ color: 'var(--admin-text)' }}>Delete {noun}?</h2>
            <p className="mt-2 text-sm leading-6" style={{ color: 'var(--admin-text-soft)' }}>
              You are deleting <strong style={{ color: 'var(--admin-text)' }}>{target.name}</strong>. {impact} This cannot be undone.
            </p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onCancel} className="rounded-xl border px-4 py-2 text-sm font-bold" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-soft)' }}>
            Keep it
          </button>
          <button type="button" onClick={onConfirm} className="rounded-xl bg-red-500 px-4 py-2 text-sm font-bold text-white hover:bg-red-600">
            Delete {target.type === 'app' ? 'application' : 'page'}
          </button>
        </div>
      </div>
    </div>
  );
}

function SkeletonLoader({ count = 3 }) {
  return (
    <div className="space-y-4">
      {Array(count).fill(0).map((_, i) => (
        <div key={i} className="h-16 animate-pulse rounded-2xl" style={softPanelStyle} />
      ))}
    </div>
  );
}

// --- Single HTML ingestion portal ---
function UploadPortal({ showToast, onRefresh, pages = [] }) {
  const [uploading, setUploading] = useState(false);
  const [htmlFile, setHtmlFile] = useState(null);
  const [htmlPreview, setHtmlPreview] = useState(null);
  const [parsingHtml, setParsingHtml] = useState(false);
  const [htmlCategory, setHtmlCategory] = useState('Getting Started');
  const [htmlDisplayMode, setHtmlDisplayMode] = useState('themed');
  const [decisionOpen, setDecisionOpen] = useState(false);
  const [applicationDetails, setApplicationDetails] = useState({
    name: '',
    slug: '',
    description: '',
    color: '#2563eb',
  });
  const [publishedPage, setPublishedPage] = useState(null);

  const htmlRef = useRef(null);

  const inputStyle = { background: 'var(--admin-panel-soft)', borderColor: 'var(--admin-border)', color: 'var(--admin-text)' };
  const htmlPages = pages.filter((page) => page.sourceType === 'html').slice(0, 6);
  const isApplicationSection = htmlCategory === 'Applications';
  const isRawMode = htmlDisplayMode === 'raw';
  const htmlSource = htmlPreview?.htmlSource || htmlPreview?.rawHtml || '';
  const resolvedApplicationDetails = {
    name: applicationDetails.name || htmlPreview?.title || '',
    slug: applicationDetails.slug || slugify(applicationDetails.name || htmlPreview?.title || ''),
    description: applicationDetails.description || htmlPreview?.description || '',
    color: applicationDetails.color || '#2563eb',
  };
  const canPublishHtml = Boolean(
    htmlPreview?.title &&
    htmlSource &&
    (!isApplicationSection || (resolvedApplicationDetails.name && resolvedApplicationDetails.slug))
  );

  useEffect(() => {
    if (!isApplicationSection || !htmlPreview) return;
    setApplicationDetails((prev) => ({
      ...prev,
      name: prev.name || htmlPreview.title || '',
      slug: prev.slug || slugify(htmlPreview.title || ''),
      description: prev.description || htmlPreview.description || '',
    }));
  }, [isApplicationSection, htmlPreview]);

  const handleUploadZoneKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      htmlRef.current?.click();
    }
  };

  const handleHtmlFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.name.endsWith('.html') && !f.name.endsWith('.htm')) {
      showToast('Please upload an HTML file', 'error');
      return;
    }
    setHtmlFile(f);
    setPublishedPage(null);
    parseHtmlFile(f);
  };

  const parseHtmlFile = async (f) => {
    setParsingHtml(true);
    try {
      const fd = new FormData();
      fd.append('file', f);
      const res = await strapiClient.postForm('/documentation/upload-html', fd);
      setHtmlPreview(res.data);
      setDecisionOpen(true);
      showToast('HTML read successfully. Choose where this should be added.');
    } catch (err) {
      showToast('Failed to read HTML: ' + err.message, 'error');
    }
    setParsingHtml(false);
  };

  const handleOverviewTextChange = (value) => {
    setHtmlPreview((prev) => {
      const blocks = Array.isArray(prev?.contentBlocks) ? [...prev.contentBlocks] : [];
      const index = blocks.findIndex((block) => block.id === 'html-overview' || block.type === 'paragraph');
      if (index >= 0) {
        blocks[index] = { ...blocks[index], text: value };
      } else {
        blocks.push({ id: 'html-overview', type: 'paragraph', text: value });
      }
      return { ...prev, contentBlocks: blocks };
    });
  };

  const handlePublishHtml = async () => {
    if (!htmlPreview) return;
    setUploading(true);
    try {
      const payload = {
        title: htmlPreview.title,
        description: htmlPreview.description,
        contentBlocks: htmlPreview.contentBlocks,
        content: htmlPreview.description,
        category: htmlCategory,
        status: 'published',
        sourceType: 'html',
        htmlSource,
        htmlFileName: htmlPreview.htmlFileName || htmlFile?.name || '',
        htmlDisplayMode,
        sourceHash: htmlPreview.sourceHash || '',
        applicationDetails: isApplicationSection ? resolvedApplicationDetails : null,
      };
      const created = await publishHtmlDocumentation(payload);
      setPublishedPage(created);
      showToast('HTML documentation published successfully');
      onRefresh();
    } catch (err) {
      showToast('Failed to publish HTML page: ' + err.message, 'error');
    }
    setUploading(false);
  };

  const overviewText = htmlPreview?.contentBlocks?.find((block) => block.id === 'html-overview' || block.type === 'paragraph')?.text || '';

  return (
    <div id="html-upload" className="space-y-6 rounded-2xl p-6" style={panelStyle}>
      <IngestionDecisionDialog
        open={decisionOpen}
        section={htmlCategory}
        mode={htmlDisplayMode}
        onSectionChange={(next) => {
          setHtmlCategory(next);
          if (next === 'Applications') setHtmlDisplayMode('themed');
        }}
        onModeChange={setHtmlDisplayMode}
        onClose={() => setDecisionOpen(false)}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-black" style={{ color: 'var(--admin-text)' }}>Upload HTML documentation</h3>
            <p className="mt-1 text-sm leading-6" style={{ color: 'var(--admin-muted)' }}>
              The backend reads the HTML, extracts a viewer-friendly overview, and keeps the full HTML in Strapi for the direct documentation view.
            </p>
          </div>

          <div
            onClick={() => htmlRef.current?.click()}
            onKeyDown={handleUploadZoneKeyDown}
            role="button"
            tabIndex={0}
            aria-label="Choose an HTML file to ingest"
            className="flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-all hover:border-blue-500/50"
            style={{ borderColor: 'var(--admin-border-strong)', background: 'var(--admin-panel-soft)' }}
          >
            <FileCode className="mb-3 h-10 w-10" style={{ color: 'var(--admin-accent)' }} />
            {htmlFile ? (
              <>
                <p className="text-sm font-bold" style={{ color: 'var(--admin-text)' }}>{htmlFile.name}</p>
                <p className="mt-1 text-xs" style={{ color: 'var(--admin-muted)' }}>Upload another HTML file to replace this draft.</p>
              </>
            ) : (
              <>
                <p className="text-sm font-bold" style={{ color: 'var(--admin-text-soft)' }}>Drag and drop HTML here</p>
                <p className="mt-1 text-xs" style={{ color: 'var(--admin-muted)' }}>Accepts .html and .htm files</p>
              </>
            )}
            <input ref={htmlRef} type="file" accept=".html,.htm" className="sr-only" onChange={handleHtmlFileChange} />
          </div>

          {parsingHtml ? (
            <div className="flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-accent)', background: 'var(--admin-accent-soft)' }}>
              <Loader2 className="h-4 w-4 animate-spin" /> Reading HTML and extracting overview...
            </div>
          ) : null}

          {publishedPage?.slug ? (
            <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-panel-soft)' }}>
              <p className="text-sm font-bold" style={{ color: 'var(--admin-text)' }}>Published successfully</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href={`/docs/${publishedPage.slug}`} className="rounded-xl border px-3 py-2 text-xs font-bold" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-soft)' }}>
                  View overview
                </Link>
                <a href={`/docs/html/${publishedPage.slug}`} target="_blank" rel="noreferrer" className="rounded-xl px-3 py-2 text-xs font-bold text-white" style={{ background: 'var(--admin-accent)' }}>
                  View documentation
                </a>
              </div>
            </div>
          ) : null}
        </div>

        <div className="space-y-4 rounded-2xl p-5" style={softPanelStyle}>
          <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-muted)' }}>Extracted overview editor</h3>
          {!htmlPreview ? (
            <p className="rounded-xl border border-dashed p-6 text-sm leading-6" style={{ borderColor: 'var(--admin-border-strong)', color: 'var(--admin-muted)' }}>
              Upload an HTML file to choose a destination section and edit the fields for that section.
            </p>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2 grid gap-3 rounded-2xl border p-4 sm:grid-cols-3" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-panel)' }}>
                  <ExtractedDetail label="HTML file" value={htmlPreview.htmlFileName || htmlFile?.name || 'Uploaded HTML'} />
                  <ExtractedDetail label="Destination" value={htmlCategory || 'Uncategorized'} />
                  <ExtractedDetail label="Publish mode" value={isRawMode ? 'Upload HTML as-is' : 'Theme extracted content'} />
                  <ExtractedDetail label="Stored HTML" value={htmlSource ? `${Math.round(htmlSource.length / 1024)} KB ready` : 'Waiting for backend'} />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-[10px] font-bold uppercase" style={{ color: 'var(--admin-muted)' }}>Viewer title</label>
                  <input type="text" value={htmlPreview.title || ''} onChange={(e) => setHtmlPreview({ ...htmlPreview, title: e.target.value })} className="w-full rounded-lg border p-2 text-sm focus:outline-none" style={inputStyle} />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-[10px] font-bold uppercase" style={{ color: 'var(--admin-muted)' }}>Viewer description</label>
                  <textarea value={htmlPreview.description || ''} onChange={(e) => setHtmlPreview({ ...htmlPreview, description: e.target.value })} rows={3} className="w-full resize-y rounded-lg border p-2 text-sm focus:outline-none" style={inputStyle} />
                </div>
                {!isRawMode || isApplicationSection ? (
                  <div className="sm:col-span-2">
                  <label className="mb-1 block text-[10px] font-bold uppercase" style={{ color: 'var(--admin-muted)' }}>Overview content shown before the button</label>
                  <textarea value={overviewText} onChange={(e) => handleOverviewTextChange(e.target.value)} rows={4} className="w-full resize-y rounded-lg border p-2 text-sm focus:outline-none" style={inputStyle} />
                  </div>
                ) : null}
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-[10px] font-bold uppercase" style={{ color: 'var(--admin-muted)' }}>Section</label>
                  <CategorySelect value={htmlCategory} onChange={setHtmlCategory} className="w-full rounded-lg border p-2 text-sm focus:outline-none" style={inputStyle} />
                  <p className="mt-1 text-[11px]" style={{ color: 'var(--admin-muted)' }}>
                    Choose where this item appears in the public docs navigation. Select Applications only when this HTML is for a product/app.
                  </p>
                </div>

                {isApplicationSection ? (
                  <div className="sm:col-span-2 rounded-2xl border p-4" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-panel)' }}>
                    <p className="mb-3 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-muted)' }}>New application details</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-[10px] font-bold uppercase" style={{ color: 'var(--admin-muted)' }}>Application name</label>
                        <input
                          type="text"
                          value={applicationDetails.name}
                          onChange={(e) => setApplicationDetails((prev) => ({ ...prev, name: e.target.value, slug: prev.slug || slugify(e.target.value) }))}
                          className="w-full rounded-lg border p-2 text-sm focus:outline-none"
                          style={inputStyle}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] font-bold uppercase" style={{ color: 'var(--admin-muted)' }}>Application slug</label>
                        <input
                          type="text"
                          value={applicationDetails.slug}
                          onChange={(e) => setApplicationDetails((prev) => ({ ...prev, slug: slugify(e.target.value) }))}
                          className="w-full rounded-lg border p-2 text-sm focus:outline-none"
                          style={inputStyle}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] font-bold uppercase" style={{ color: 'var(--admin-muted)' }}>Brand color</label>
                        <input
                          type="color"
                          value={applicationDetails.color}
                          onChange={(e) => setApplicationDetails((prev) => ({ ...prev, color: e.target.value }))}
                          className="h-10 w-full rounded-lg border p-1"
                          style={inputStyle}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="mb-1 block text-[10px] font-bold uppercase" style={{ color: 'var(--admin-muted)' }}>Application description</label>
                        <textarea
                          value={applicationDetails.description}
                          onChange={(e) => setApplicationDetails((prev) => ({ ...prev, description: e.target.value }))}
                          rows={2}
                          className="w-full resize-y rounded-lg border p-2 text-sm focus:outline-none"
                          style={inputStyle}
                        />
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-panel)' }}>
                <p className="mb-3 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-muted)' }}>Viewer preview</p>
                <span className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide" style={{ background: 'var(--admin-accent-soft)', color: 'var(--admin-accent)' }}>{htmlCategory || 'Uncategorized'}</span>
                {isApplicationSection && applicationDetails.name ? (
                  <span className="ml-2 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide" style={{ background: applicationDetails.color, color: '#fff' }}>
                    {applicationDetails.name}
                  </span>
                ) : null}
                <h4 className="mt-3 text-xl font-black" style={{ color: 'var(--admin-text)' }}>{htmlPreview.title}</h4>
                <p className="mt-2 text-sm leading-6" style={{ color: 'var(--admin-text-soft)' }}>{htmlPreview.description}</p>
                {overviewText ? <p className="mt-3 text-sm leading-6" style={{ color: 'var(--admin-muted)' }}>{overviewText}</p> : null}
                {isApplicationSection ? (
                  <button type="button" disabled className="mt-4 rounded-xl px-4 py-2 text-xs font-bold text-white opacity-90" style={{ background: 'var(--admin-accent)' }}>
                    View Documentation
                  </button>
                ) : isRawMode ? (
                  <p className="mt-4 rounded-xl border px-4 py-3 text-xs font-semibold" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-muted)' }}>
                    Sidebar item will open the uploaded HTML directly.
                  </p>
                ) : null}
              </div>

              <button
                type="button"
                onClick={handlePublishHtml}
                disabled={uploading || !canPublishHtml}
                className="w-full rounded-xl px-5 py-3 text-sm font-bold text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                style={{ background: 'var(--admin-accent)' }}
              >
                {uploading ? 'Publishing...' : 'Publish HTML Overview'}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="rounded-2xl p-5" style={softPanelStyle}>
        <h3 className="mb-3 text-sm font-bold" style={{ color: 'var(--admin-text)' }}>Recently ingested HTML</h3>
        {htmlPages.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--admin-muted)' }}>No HTML uploads published yet.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {htmlPages.map((page) => (
              <div key={page.id} className="rounded-xl border p-4" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-panel)' }}>
                <p className="truncate text-sm font-bold" style={{ color: 'var(--admin-text)' }}>{page.title}</p>
                <p className="mt-1 text-xs" style={{ color: 'var(--admin-muted)' }}>{page.category || 'General'}</p>
                <div className="mt-3 flex gap-2">
                  <Link href={`/docs/${page.slug}`} className="rounded-lg border px-3 py-1.5 text-xs font-bold" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-soft)' }}>Overview</Link>
                  {(page.category === 'Applications' || page.htmlDisplayMode === 'raw') ? (
                    <a href={`/docs/html/${page.slug}`} target="_blank" rel="noreferrer" className="rounded-lg px-3 py-1.5 text-xs font-bold text-white" style={{ background: 'var(--admin-accent)' }}>View HTML</a>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ExtractedDetail({ label, value }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-muted)' }}>{label}</p>
      <p className="mt-1 truncate text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>{value}</p>
    </div>
  );
}

function IngestionDecisionDialog({ open, section, mode, onSectionChange, onModeChange, onClose }) {
  if (!open) return null;

  const isApplication = section === 'Applications';

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center px-4" style={{ background: 'rgba(2, 6, 18, 0.48)' }} role="dialog" aria-modal="true">
      <div className="w-full max-w-2xl rounded-3xl border p-6 shadow-2xl" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-panel)' }}>
        <p className="text-xs font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--admin-muted)' }}>HTML uploaded</p>
        <h2 className="mt-2 text-2xl font-black" style={{ color: 'var(--admin-text)' }}>Where should this be added?</h2>
        <p className="mt-2 text-sm leading-6" style={{ color: 'var(--admin-text-soft)' }}>
          Pick the docs section first. The editor will adapt to that destination.
        </p>

        <div className="mt-5">
          <label className="mb-1 block text-[10px] font-bold uppercase" style={{ color: 'var(--admin-muted)' }}>Destination section</label>
          <CategorySelect value={section} onChange={onSectionChange} className="w-full rounded-xl border p-3 text-sm focus:outline-none" style={{ background: 'var(--admin-panel-soft)', borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }} />
        </div>

        {!isApplication ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => onModeChange('raw')}
              className="rounded-2xl border p-4 text-left transition hover:opacity-90"
              style={mode === 'raw'
                ? { borderColor: 'var(--admin-accent-ring)', background: 'var(--admin-accent-soft)' }
                : { borderColor: 'var(--admin-border)', background: 'var(--admin-panel-soft)' }}
            >
              <span className="text-sm font-bold" style={{ color: 'var(--admin-text)' }}>Upload HTML as it is</span>
              <span className="mt-1 block text-xs leading-5" style={{ color: 'var(--admin-muted)' }}>
                Sidebar opens the original uploaded HTML directly. Best for full existing pages.
              </span>
            </button>
            <button
              type="button"
              onClick={() => onModeChange('themed')}
              className="rounded-2xl border p-4 text-left transition hover:opacity-90"
              style={mode === 'themed'
                ? { borderColor: 'var(--admin-accent-ring)', background: 'var(--admin-accent-soft)' }
                : { borderColor: 'var(--admin-border)', background: 'var(--admin-panel-soft)' }}
            >
              <span className="text-sm font-bold" style={{ color: 'var(--admin-text)' }}>Extract and tweak with theme</span>
              <span className="mt-1 block text-xs leading-5" style={{ color: 'var(--admin-muted)' }}>
                Create a Webfudge themed docs page from the extracted title, description, and overview.
              </span>
            </button>
          </div>
        ) : (
          <div className="mt-5 rounded-2xl border p-4" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-panel-soft)' }}>
            <p className="text-sm font-bold" style={{ color: 'var(--admin-text)' }}>Application upload</p>
            <p className="mt-1 text-xs leading-5" style={{ color: 'var(--admin-muted)' }}>
              This creates a product/app overview with a View Documentation button that opens the uploaded HTML.
            </p>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button type="button" onClick={onClose} className="rounded-xl px-5 py-2.5 text-sm font-bold text-white" style={{ background: 'var(--admin-accent)' }}>
            Continue editing
          </button>
        </div>
      </div>
    </div>
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
