'use client';

/**
 * ProofViewer (W9 approvals & proofing; meant for reuse by W23 creative ops).
 *
 * Shows the versions (v1, v2, …) of a creative and lets reviewers pin comments on it:
 * - image: click anywhere to pin (x / y stored as % of the frame, so pins survive any display size)
 * - video: click the frame to pause and pin; the comment keeps the timestamp, and markers on the
 *   timeline jump back to it
 * - pdf / other files: preview or download, with general (unpinned) comments
 *
 * It owns no data fetching. Pass `versions` in the shape returned by the proofs API
 * (`/api/proofs/tasks/:id` or `/api/portal/projects/:id/tasks/:taskId/proofs`) and callbacks:
 *   onAddComment({ versionId, body, x, y, timestamp, internal }) → Promise
 *   onResolveComment?(comment, resolved) → Promise          (team only)
 *   renderActions?(version, { isLatest }) → ReactNode       (approve / request changes, upload, …)
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Download, FileText, Lock, MapPin, MessageSquare, Pause, Play, RotateCcw, X } from 'lucide-react';

export const PROOF_STATUS = {
  in_review: { label: 'In review', cls: 'bg-amber-50 text-amber-800 ring-amber-200' },
  approved: { label: 'Approved', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  changes_requested: { label: 'Changes requested', cls: 'bg-rose-50 text-rose-700 ring-rose-200' },
};

export function formatTimestamp(seconds) {
  const s = Math.max(0, Math.floor(Number(seconds) || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

function resolveUrl(url, apiBase) {
  if (!url) return null;
  if (/^https?:\/\//.test(url) || url.startsWith('blob:') || url.startsWith('data:')) return url;
  const b = String(apiBase || '').replace(/\/$/, '');
  return b ? `${b}${url.startsWith('/') ? url : `/${url}`}` : url;
}

const fmtDateTime = (iso) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
};

const PIN_WINDOW_SECONDS = 1.5;

export function ProofStatusPill({ status, className = '' }) {
  const s = PROOF_STATUS[status] || PROOF_STATUS.in_review;
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${s.cls} ${className}`}>{s.label}</span>;
}

function Pin({ n, x, y, active, resolved, pending, onClick }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      aria-label={pending ? 'New pin' : `Comment ${n}`}
      className={`absolute z-10 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white text-xs font-bold shadow-lg transition-transform ${
        pending ? 'bg-[#F5630F] text-white animate-pulse' : resolved ? 'bg-gray-400 text-white' : 'bg-[#F5630F] text-white'
      } ${active ? 'scale-125 ring-4 ring-[#F5630F]/30' : 'hover:scale-110'}`}
      style={{ left: `${x}%`, top: `${y}%` }}
    >
      {pending ? <MapPin className="h-3.5 w-3.5" /> : n}
    </button>
  );
}

function VideoStage({ src, pins, pending, activeId, onPick, onSelectPin, videoRef, canPin, markers }) {
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const toggle = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  };

  const visiblePins = pins.filter((p) => p.x != null && (p.timestamp == null || Math.abs(p.timestamp - time) <= PIN_WINDOW_SECONDS || p.id === activeId));

  return (
    <div className="flex w-full flex-col items-center">
      <div className="relative inline-block max-w-full">
        <video
          ref={videoRef}
          src={src}
          className="block max-h-[65vh] max-w-full rounded-lg bg-black"
          playsInline
          preload="metadata"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
          onSeeked={(e) => setTime(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
        />
        <div
          className={`absolute inset-0 ${canPin ? 'cursor-crosshair' : 'cursor-pointer'}`}
          onClick={(e) => {
            if (!canPin) return toggle();
            const v = videoRef.current;
            v?.pause();
            const r = e.currentTarget.getBoundingClientRect();
            onPick({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100, timestamp: v ? v.currentTime : null });
          }}
        >
          {visiblePins.map((p) => (
            <Pin key={p.id} n={p.n} x={p.x} y={p.y} resolved={p.resolved} active={p.id === activeId} onClick={() => onSelectPin(p)} />
          ))}
          {pending?.x != null ? <Pin pending x={pending.x} y={pending.y} /> : null}
        </div>
      </div>
      <div className="mt-3 flex w-full max-w-3xl items-center gap-3">
        <button type="button" onClick={toggle} className="rounded-full bg-gray-900 p-2 text-white hover:bg-black" aria-label={playing ? 'Pause' : 'Play'}>
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>
        <div className="relative flex-1">
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.01}
            value={Math.min(time, duration || 0)}
            onChange={(e) => {
              if (videoRef.current) videoRef.current.currentTime = Number(e.target.value);
            }}
            className="w-full accent-[#F5630F]"
            aria-label="Seek"
          />
          {duration > 0
            ? markers.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  title={`${formatTimestamp(m.timestamp)} — ${m.body}`}
                  onClick={() => onSelectPin(m)}
                  className={`absolute -top-2 h-2.5 w-2.5 -translate-x-1/2 rounded-full border border-white ${m.resolved ? 'bg-gray-400' : 'bg-[#F5630F]'} ${m.id === activeId ? 'scale-150' : ''}`}
                  style={{ left: `${Math.min(100, (m.timestamp / duration) * 100)}%` }}
                  aria-label={`Comment at ${formatTimestamp(m.timestamp)}`}
                />
              ))
            : null}
        </div>
        <span className="w-24 text-right text-xs tabular-nums text-gray-600">
          {formatTimestamp(time)} / {formatTimestamp(duration)}
        </span>
      </div>
    </div>
  );
}

function ImageStage({ src, alt, pins, pending, activeId, onPick, onSelectPin, canPin }) {
  return (
    <div className="relative inline-block max-w-full">
      <img src={src} alt={alt} className="block max-h-[65vh] max-w-full select-none rounded-lg" draggable={false} />
      <div
        className={`absolute inset-0 ${canPin ? 'cursor-crosshair' : ''}`}
        onClick={(e) => {
          if (!canPin) return;
          const r = e.currentTarget.getBoundingClientRect();
          onPick({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100, timestamp: null });
        }}
      >
        {pins.filter((p) => p.x != null).map((p) => (
          <Pin key={p.id} n={p.n} x={p.x} y={p.y} resolved={p.resolved} active={p.id === activeId} onClick={() => onSelectPin(p)} />
        ))}
        {pending?.x != null ? <Pin pending x={pending.x} y={pending.y} /> : null}
      </div>
    </div>
  );
}

function Composer({ pending, onClearPin, onSubmit, allowInternal, placeholder }) {
  const [body, setBody] = useState('');
  const [internal, setInternal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    if (pending) ref.current?.focus();
  }, [pending]);

  const submit = async (e) => {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    setError('');
    try {
      await onSubmit({ body: body.trim(), internal: allowInternal && internal });
      setBody('');
      setInternal(false);
    } catch (err) {
      setError(err?.message || 'Could not post the comment.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-2 border-t border-gray-100 p-3">
      {pending ? (
        <div className="flex items-center justify-between rounded-lg bg-orange-50 px-2.5 py-1.5 text-xs text-orange-900">
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {pending.x != null ? 'Pinned on the frame' : 'General comment'}
            {pending.timestamp != null ? ` at ${formatTimestamp(pending.timestamp)}` : ''}
          </span>
          <button type="button" onClick={onClearPin} className="rounded p-0.5 hover:bg-orange-100" aria-label="Remove pin">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <p className="text-[11px] text-gray-500">Click the creative to pin a comment to that spot.</p>
      )}
      <textarea
        ref={ref}
        rows={3}
        maxLength={5000}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(e);
        }}
        placeholder={placeholder || 'Leave feedback…'}
        aria-label="Comment"
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#F5630F] focus:outline-none focus:ring-2 focus:ring-[#F5630F]/20"
      />
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
      <div className="flex items-center justify-between gap-2">
        {allowInternal ? (
          <label className="inline-flex items-center gap-1.5 text-xs text-gray-600">
            <input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} className="accent-[#F5630F]" />
            <Lock className="h-3 w-3" /> Team only
          </label>
        ) : (
          <span />
        )}
        <button type="submit" disabled={busy || !body.trim()} className="rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-black disabled:opacity-50">
          {busy ? 'Posting…' : 'Comment'}
        </button>
      </div>
    </form>
  );
}

export function ProofViewer({
  versions = [],
  apiBase = '',
  canComment = true,
  allowInternal = false,
  onAddComment,
  onResolveComment,
  renderActions,
  emptyState = null,
  composerPlaceholder,
  className = '',
}) {
  const [versionId, setVersionId] = useState(versions[0]?.id ?? null);
  const [pending, setPending] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [showResolved, setShowResolved] = useState(false);
  const videoRef = useRef(null);
  const listRef = useRef(null);

  // Follow the newest version when one is added; keep the user's pick otherwise.
  const newestId = versions[0]?.id ?? null;
  useEffect(() => {
    setVersionId(newestId);
    setPending(null);
    setActiveId(null);
  }, [newestId]);

  const version = versions.find((v) => v.id === versionId) || versions[0] || null;
  const isLatest = version && version.id === newestId;

  const comments = useMemo(() => {
    let n = 0;
    return (version?.comments || []).map((c) => ({ ...c, n: c.x != null ? ++n : null }));
  }, [version]);
  const shown = comments.filter((c) => showResolved || !c.resolved);
  const resolvedCount = comments.length - comments.filter((c) => !c.resolved).length;

  const selectPin = useCallback((c) => {
    setActiveId(c.id);
    if (c.timestamp != null && videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = c.timestamp;
    }
    listRef.current?.querySelector(`[data-comment="${c.id}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, []);

  if (!versions.length) return emptyState;

  const src = resolveUrl(version?.file?.url, apiBase);
  const canPin = canComment && Boolean(onAddComment);
  const stageProps = {
    pins: shown,
    pending,
    activeId,
    onPick: (p) => {
      setPending(p);
      setActiveId(null);
    },
    onSelectPin: selectPin,
    canPin,
  };

  return (
    <div className={`overflow-hidden rounded-2xl border border-gray-200 bg-white ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-4 py-3">
        <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Versions">
          {versions.map((v) => (
            <button
              key={v.id}
              type="button"
              role="tab"
              aria-selected={v.id === version?.id}
              onClick={() => {
                setVersionId(v.id);
                setPending(null);
                setActiveId(null);
              }}
              className={`rounded-lg px-2.5 py-1 text-sm font-semibold ${v.id === version?.id ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              {v.label}
              {v.id === newestId ? <span className="ml-1 text-[10px] font-medium opacity-70">latest</span> : null}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ProofStatusPill status={version?.status} />
          {renderActions ? renderActions(version, { isLatest }) : null}
        </div>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-h-[320px] flex-col items-center justify-center bg-gray-50 p-4">
          {!src ? (
            <p className="text-sm text-gray-500">This version has no file.</p>
          ) : version.kind === 'video' ? (
            <VideoStage {...stageProps} src={src} videoRef={videoRef} markers={shown.filter((c) => c.timestamp != null)} />
          ) : version.kind === 'image' ? (
            <ImageStage {...stageProps} src={src} alt={version.file?.name || version.label} />
          ) : version.kind === 'pdf' ? (
            <iframe title={version.file?.name || 'PDF proof'} src={src} className="h-[65vh] w-full rounded-lg border border-gray-200 bg-white" />
          ) : (
            <div className="text-center">
              <FileText className="mx-auto h-10 w-10 text-gray-300" />
              <p className="mt-2 text-sm text-gray-700">{version.file?.name}</p>
            </div>
          )}
          <div className="mt-3 flex w-full flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
            <span>
              {version.uploadedBy?.name ? `${version.uploadedBy.name} · ` : ''}
              {fmtDateTime(version.createdAt)}
              {version.note ? ` · “${version.note}”` : ''}
            </span>
            {src ? (
              <a href={src} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 hover:text-[#F5630F]">
                <Download className="h-3.5 w-3.5" /> Download
              </a>
            ) : null}
          </div>
          {version.decision ? (
            <p className="mt-2 w-full rounded-lg bg-white px-3 py-2 text-xs text-gray-600 ring-1 ring-gray-200">
              {PROOF_STATUS[version.status]?.label || 'Decision'}
              {version.decision.by ? ` by ${version.decision.by.name}${version.decision.by.kind === 'client' ? ' (client)' : ''}` : ''}
              {version.decision.at ? `, ${fmtDateTime(version.decision.at)}` : ''}
              {version.decision.comment ? `: “${version.decision.comment}”` : ''}
            </p>
          ) : null}
        </div>

        <aside className="flex max-h-[80vh] flex-col border-t border-gray-100 lg:border-l lg:border-t-0">
          <div className="flex items-center justify-between px-3 py-2.5">
            <h3 className="inline-flex items-center gap-1.5 text-sm font-semibold">
              <MessageSquare className="h-4 w-4 text-gray-400" /> Comments
              <span className="text-xs font-normal text-gray-500">({comments.length - resolvedCount})</span>
            </h3>
            {resolvedCount ? (
              <button type="button" onClick={() => setShowResolved((s) => !s)} className="text-xs text-gray-500 hover:text-gray-800">
                {showResolved ? 'Hide' : 'Show'} resolved ({resolvedCount})
              </button>
            ) : null}
          </div>
          <ul ref={listRef} className="flex-1 space-y-2 overflow-y-auto px-3 pb-3">
            {shown.length === 0 ? <li className="py-6 text-center text-xs text-gray-500">No comments on {version.label} yet.</li> : null}
            {shown.map((c) => (
              <li
                key={c.id}
                data-comment={c.id}
                className={`cursor-pointer rounded-lg border p-2.5 text-sm transition-colors ${c.id === activeId ? 'border-[#F5630F] bg-orange-50/60' : 'border-gray-200 hover:border-gray-300'} ${c.resolved ? 'opacity-60' : ''}`}
                onClick={() => selectPin(c)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-1.5">
                    {c.n ? <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#F5630F] text-[10px] font-bold text-white">{c.n}</span> : null}
                    <span className="truncate font-medium">{c.author?.isYou ? 'You' : c.author?.name}</span>
                    {c.author?.kind === 'client' ? <span className="rounded bg-sky-50 px-1 text-[10px] font-medium text-sky-700">Client</span> : null}
                    {c.internal ? <Lock className="h-3 w-3 shrink-0 text-gray-400" aria-label="Team only" /> : null}
                  </div>
                  {c.timestamp != null ? <span className="shrink-0 rounded bg-gray-100 px-1.5 text-[11px] tabular-nums text-gray-700">{formatTimestamp(c.timestamp)}</span> : null}
                </div>
                <p className="mt-1 whitespace-pre-line text-gray-700">{c.body}</p>
                <div className="mt-1.5 flex items-center justify-between text-[11px] text-gray-400">
                  <span>{fmtDateTime(c.createdAt)}</span>
                  {onResolveComment ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onResolveComment(c, !c.resolved);
                      }}
                      className="inline-flex items-center gap-1 hover:text-gray-700"
                    >
                      {c.resolved ? <RotateCcw className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
                      {c.resolved ? 'Reopen' : 'Resolve'}
                    </button>
                  ) : c.resolved ? (
                    <span>Resolved</span>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
          {canComment && onAddComment ? (
            <Composer
              key={version.id}
              pending={pending}
              allowInternal={allowInternal}
              placeholder={composerPlaceholder}
              onClearPin={() => setPending(null)}
              onSubmit={async ({ body, internal }) => {
                await onAddComment({
                  versionId: version.id,
                  body,
                  internal,
                  x: pending?.x ?? null,
                  y: pending?.y ?? null,
                  timestamp: pending?.timestamp ?? (version.kind === 'video' && videoRef.current?.currentTime > 0 ? videoRef.current.currentTime : null),
                });
                setPending(null);
              }}
            />
          ) : null}
        </aside>
      </div>
    </div>
  );
}

export default ProofViewer;
