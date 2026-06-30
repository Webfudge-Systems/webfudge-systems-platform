'use client';

import {
  DocsCallout,
  DocsComponentEmbed,
  DocsProse,
  DocsStepList,
  DocsWalkthrough,
} from '@webfudge/ui/doc-components';
import { clsx } from 'clsx';
import MermaidBlock from './MermaidBlock';
import { motion } from 'framer-motion';

function alignClass(align) {
  if (align === 'center') return 'text-center';
  if (align === 'right') return 'text-right';
  return 'text-left';
}

export default function BlockRenderer({ blocks = [] }) {
  if (!blocks?.length) return null;

  return (
    <div className="space-y-6">
      {blocks.map((block) => {
        const wrap = (node) => (
          <motion.div
            key={block.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {node}
          </motion.div>
        );
        switch (block.type) {
          case 'heading': {
            const Tag = `h${Math.min(6, Math.max(1, block.level || 2))}`;
            const sizeClass = block.level === 2 ? 'text-2xl mt-12 mb-6' : block.level === 3 ? 'text-xl mt-8 mb-4' : 'text-lg mt-6 mb-3';
            return wrap(
              <Tag className={clsx('font-bold text-brand-dark dark:text-white tracking-tight', sizeClass, alignClass(block.style?.align))}>
                {block.text}
              </Tag>
            );
          }
          case 'paragraph':
            return wrap(
              <div
                className={clsx('text-[15px] mb-6 text-brand-text-light dark:text-gray-300 leading-relaxed', alignClass(block.style?.align))}
                dangerouslySetInnerHTML={{ __html: normalizeHtml(block.text) }}
              />
            );
          case 'image':
            return wrap(
              <figure className="space-y-2">
                {block.src ? (
                  <img
                    src={block.src}
                    alt={block.alt || ''}
                    className="w-full rounded-xl border border-brand-border object-cover"
                  />
                ) : (
                  <div className="rounded-xl border border-dashed border-brand-border p-6 text-center text-sm text-brand-text-muted">
                    Add an image URL in the editor
                  </div>
                )}
                {block.caption ? (
                  <figcaption className="text-center text-xs text-brand-text-muted">{block.caption}</figcaption>
                ) : null}
              </figure>
            );
          case 'componentEmbed':
            return wrap(
              <DocsComponentEmbed
                storyId={block.storyId}
                title={block.title || 'Component demo'}
              />
            );
          case 'mermaid':
            return wrap(<MermaidBlock code={block.code} />);
          case 'walkthrough':
            return wrap(<DocsWalkthrough steps={block.steps || []} />);
          case 'callout':
            return wrap(
              <DocsCallout variant={block.variant || 'info'} title={block.title}>
                <div dangerouslySetInnerHTML={{ __html: normalizeHtml(block.body) }} />
              </DocsCallout>
            );
          case 'steps':
            return wrap(<DocsStepList steps={block.steps || []} />);
          case 'features':
            return wrap(
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {(block.items || []).map((item, index) => (
                  <div key={`${item.title}-${index}`} className="glass-panel rounded-xl p-5 transition-all hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(245,99,15,0.12)]">
                    <h3 className="mb-2 font-bold text-brand-dark dark:text-gray-100">{item.title}</h3>
                    <p className="text-sm text-brand-text-light dark:text-gray-400">{item.description}</p>
                  </div>
                ))}
              </div>
            );
          case 'table':
            return wrap(
              <div className="glass-panel mb-8 overflow-hidden rounded-2xl border-brand-border/40 dark:border-white/10">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead className="bg-brand-light/40 dark:bg-black/20 backdrop-blur-sm text-brand-dark dark:text-white border-b border-brand-border/30 dark:border-white/10">
                      <tr>
                        {(block.headers || []).map((header) => (
                          <th key={header} className="px-5 py-4 font-bold tracking-wide">{header}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border/20 dark:divide-white/5">
                      {(block.rows || []).map((row, rowIndex) => (
                        <tr key={rowIndex} className="transition-colors hover:bg-white/40 dark:hover:bg-white/5">
                          {row.map((cell, cellIndex) => (
                            <td key={cellIndex} className="px-5 py-4 text-brand-text-light dark:text-gray-300 align-top">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          case 'code':
            return wrap(
              <pre className="overflow-x-auto rounded-2xl border border-white/10 bg-[#0c0c0c] p-5 text-[13px] text-gray-100 shadow-xl">
                <code>{block.code}</code>
              </pre>
            );
          case 'divider':
            return wrap(<hr className="border-brand-border" />);
          case 'appDiagram':
            return wrap(
              <div className="glass-panel relative mb-12 mt-6 overflow-hidden rounded-3xl border-brand-border/40 p-10 text-center dark:border-white/10">
                {/* Background glow effect */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] bg-brand-primary/10 rounded-full blur-[120px] pointer-events-none" />
                
                <p className="text-xs font-bold uppercase tracking-widest text-brand-primary mb-8 relative z-10">Webfudge Platform Architecture</p>
                
                <div className="grid gap-6 sm:grid-cols-3 relative z-10">
                  {(block.apps || []).map((app, i) => (
                    <motion.div 
                      key={app.name} 
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="glass-panel rounded-2xl px-6 py-6 transition-colors hover:bg-glass-200"
                    >
                      <p className="font-bold text-lg text-brand-dark dark:text-white mb-3">{app.name}</p>
                      <div className="inline-flex items-center justify-center rounded-full bg-brand-primary/10 px-3 py-1.5 text-[11px] font-mono text-brand-primary dark:text-orange-400 border border-brand-primary/20">
                        PORT {app.port}
                      </div>
                    </motion.div>
                  ))}
                </div>
                
                {/* Connection lines */}
                <div className="relative h-20 w-full flex justify-center items-center z-0 my-2">
                  <div className="w-[2px] h-full bg-gradient-to-b from-brand-border/40 to-brand-primary/50 dark:from-white/10 dark:to-orange-500/50" />
                </div>
                
                {block.backend && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 }}
                    className="glass-panel relative z-10 mx-auto max-w-sm rounded-2xl border-brand-primary/30 px-8 py-8 shadow-[0_0_40px_rgba(245,99,15,0.15)]"
                  >
                    <p className="font-bold text-2xl tracking-tight text-brand-dark dark:text-white">{block.backend.name}</p>
                    <p className="mt-3 text-sm font-medium text-brand-text-light dark:text-gray-300">{block.backend.subtitle}</p>
                    <div className="mt-6 inline-flex items-center justify-center rounded-full bg-black/5 dark:bg-white/10 px-4 py-1.5 text-xs font-mono text-brand-text-muted dark:text-gray-400 border border-black/10 dark:border-white/10">
                      PORT {block.backend.port}
                    </div>
                  </motion.div>
                )}
              </div>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}

function normalizeHtml(value = '') {
  const html = String(value || '').trim();
  if (!html) return '<p></p>';
  if (html.startsWith('<')) return html;
  return `<p>${escapeHtml(html)}</p>`;
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
