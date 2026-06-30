'use client';

import { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  GripVertical,
  Plus,
  Trash2,
} from 'lucide-react';
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  BLOCK_TYPES,
  CALLOUT_VARIANTS,
  TEXT_ALIGNS,
  createBlock,
} from '../../lib/blocks';
import RichTextEditor from './RichTextEditor';

function Field({ label, children }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-brand-dark">{label}</label>
      {children}
    </div>
  );
}

const inputClass =
  'block w-full rounded-lg border border-brand-border bg-white px-3 py-2 text-sm text-brand-foreground focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20';

export default function BlockEditor({ blocks = [], onChange }) {
  const [expandedBlocks, setExpandedBlocks] = useState(() => new Set(blocks.map((block, index) => block.id || `idx-${index}`)));
  const [removeTarget, setRemoveTarget] = useState(null);

  function updateBlock(index, patch) {
    const next = blocks.map((block, i) => (i === index ? { ...block, ...patch } : block));
    onChange(next);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function updateNested(index, key, value) {
    updateBlock(index, { [key]: value });
  }

  function removeBlock(index) {
    onChange(blocks.filter((_, i) => i !== index));
    setRemoveTarget(null);
  }

  function addBlock(type) {
    const block = createBlock(type);
    onChange([...blocks, block]);
    setExpandedBlocks((prev) => new Set([...prev, block.id]));
  }

  function onDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = blocks.findIndex((block) => block.id === active.id);
    const newIndex = blocks.findIndex((block) => block.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onChange(arrayMove(blocks, oldIndex, newIndex));
  }

  return (
    <div className="space-y-4">
      {blocks.length === 0 ? (
        <p className="rounded-lg border border-dashed border-brand-border bg-brand-light px-4 py-6 text-center text-sm text-brand-text-muted">
          No content blocks yet. Add a block below.
        </p>
      ) : null}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={blocks.map((b, idx) => b.id || `idx-${idx}`)} strategy={verticalListSortingStrategy}>
          {blocks.map((block, index) => {
            const blockKey = block.id || `idx-${index}`;
            const blockLabel = BLOCK_TYPES.find((t) => t.id === block.type)?.label || block.type;
            const isExpanded = expandedBlocks.has(blockKey);
            const blockSummary = getBlockSummary(block);
            return (
            <SortableBlock key={blockKey} id={blockKey}>
              <div className="mb-3 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setExpandedBlocks((prev) => {
                      const next = new Set(prev);
                      if (next.has(blockKey)) next.delete(blockKey);
                      else next.add(blockKey);
                      return next;
                    });
                  }}
                  className="flex min-w-0 items-center gap-2 text-left text-xs font-semibold uppercase tracking-wide text-brand-text-muted hover:text-brand-dark"
                  aria-expanded={isExpanded}
                >
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <span>{blockLabel}</span>
                  <span className="truncate text-[10px] normal-case tracking-normal text-brand-text-muted">
                    {blockSummary}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setRemoveTarget({ index, label: `${blockLabel} block`, summary: blockSummary })}
                  className="rounded p-1 text-red-600 hover:bg-red-50"
                  aria-label={`Remove ${blockLabel} block`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {isExpanded ? (
                <>
              {block.type === 'heading' && (
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Level">
                    <select value={block.level || 2} onChange={(e) => updateBlock(index, { level: Number(e.target.value) })} className={inputClass}>
                      {[1, 2, 3, 4, 5, 6].map((n) => (
                        <option key={n} value={n}>H{n}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Alignment">
                    <select value={block.style?.align || 'left'} onChange={(e) => updateBlock(index, { style: { ...block.style, align: e.target.value } })} className={inputClass}>
                      {TEXT_ALIGNS.map((a) => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </Field>
                  <div className="sm:col-span-3">
                    <Field label="Heading text">
                      <input type="text" value={block.text || ''} onChange={(e) => updateBlock(index, { text: e.target.value })} className={inputClass} />
                    </Field>
                  </div>
                </div>
              )}

              {block.type === 'paragraph' && (
                <div className="space-y-3">
                  <Field label="Alignment">
                    <select value={block.style?.align || 'left'} onChange={(e) => updateBlock(index, { style: { ...block.style, align: e.target.value } })} className={inputClass}>
                      {TEXT_ALIGNS.map((a) => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </Field>
                  <Field label="Paragraph">
                    <RichTextEditor value={block.text || ''} onChange={(value) => updateBlock(index, { text: value })} />
                  </Field>
                </div>
              )}

              {block.type === 'callout' && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Variant">
                    <select value={block.variant || 'info'} onChange={(e) => updateBlock(index, { variant: e.target.value })} className={inputClass}>
                      {CALLOUT_VARIANTS.map((v) => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </Field>
                  <Field label="Title">
                    <input type="text" value={block.title || ''} onChange={(e) => updateBlock(index, { title: e.target.value })} className={inputClass} />
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label="Body">
                      <RichTextEditor value={block.body || ''} onChange={(value) => updateBlock(index, { body: value })} />
                    </Field>
                  </div>
                </div>
              )}

          {block.type === 'steps' && (
            <div className="space-y-3">
              {(block.steps || []).map((step, stepIndex) => (
                <div key={stepIndex} className="rounded-lg border border-brand-border bg-brand-light/50 p-3">
                  <div className="mb-2 flex justify-between">
                    <span className="text-xs font-medium text-brand-text-muted">Step {stepIndex + 1}</span>
                    <button type="button" onClick={() => updateNested(index, 'steps', block.steps.filter((_, i) => i !== stepIndex))} className="text-xs text-red-600">Remove</button>
                  </div>
                  <input type="text" value={step.title || ''} placeholder="Title" onChange={(e) => {
                    const steps = [...block.steps];
                    steps[stepIndex] = { ...step, title: e.target.value };
                    updateNested(index, 'steps', steps);
                  }} className={`${inputClass} mb-2`} />
                  <textarea rows={2} value={step.description || ''} placeholder="Description" onChange={(e) => {
                    const steps = [...block.steps];
                    steps[stepIndex] = { ...step, description: e.target.value };
                    updateNested(index, 'steps', steps);
                  }} className={`${inputClass} resize-y`} />
                </div>
              ))}
              <button type="button" onClick={() => updateNested(index, 'steps', [...(block.steps || []), { title: 'New step', description: '' }])} className="text-sm text-brand-primary hover:underline">
                + Add step
              </button>
            </div>
          )}

          {block.type === 'features' && (
            <div className="space-y-3">
              {(block.items || []).map((item, itemIndex) => (
                <div key={itemIndex} className="rounded-lg border border-brand-border bg-brand-light/50 p-3">
                  <div className="mb-2 flex justify-between">
                    <span className="text-xs font-medium text-brand-text-muted">Feature {itemIndex + 1}</span>
                    <button type="button" onClick={() => updateNested(index, 'items', block.items.filter((_, i) => i !== itemIndex))} className="text-xs text-red-600">Remove</button>
                  </div>
                  <input type="text" value={item.title || ''} placeholder="Title" onChange={(e) => {
                    const items = [...block.items];
                    items[itemIndex] = { ...item, title: e.target.value };
                    updateNested(index, 'items', items);
                  }} className={`${inputClass} mb-2`} />
                  <textarea rows={2} value={item.description || ''} placeholder="Description" onChange={(e) => {
                    const items = [...block.items];
                    items[itemIndex] = { ...item, description: e.target.value };
                    updateNested(index, 'items', items);
                  }} className={`${inputClass} resize-y`} />
                </div>
              ))}
              <button type="button" onClick={() => updateNested(index, 'items', [...(block.items || []), { title: 'New feature', description: '' }])} className="text-sm text-brand-primary hover:underline">
                + Add feature
              </button>
            </div>
          )}

          {block.type === 'table' && (
            <div className="space-y-3">
              <Field label="Headers (comma-separated)">
                <input type="text" value={(block.headers || []).join(', ')} onChange={(e) => updateBlock(index, { headers: e.target.value.split(',').map((h) => h.trim()) })} className={inputClass} />
              </Field>
              <Field label="Rows (one per line, cells comma-separated)">
                <textarea rows={4} value={(block.rows || []).map((row) => row.join(', ')).join('\n')} onChange={(e) => updateBlock(index, { rows: e.target.value.split('\n').filter(Boolean).map((line) => line.split(',').map((c) => c.trim())) })} className={`${inputClass} resize-y font-mono text-xs`} />
              </Field>
            </div>
          )}

              {block.type === 'code' && (
            <div className="grid gap-3">
              <Field label="Language">
                <input type="text" value={block.language || ''} onChange={(e) => updateBlock(index, { language: e.target.value })} className={inputClass} placeholder="javascript" />
              </Field>
              <Field label="Code">
                <textarea rows={6} value={block.code || ''} onChange={(e) => updateBlock(index, { code: e.target.value })} className={`${inputClass} resize-y font-mono text-xs`} />
              </Field>
            </div>
              )}

              {block.type === 'walkthrough' && (
                <div className="space-y-3">
                  {(block.steps || []).map((step, stepIndex) => (
                    <div key={stepIndex} className="rounded-lg border border-brand-border bg-brand-light/50 p-3">
                      <div className="mb-2 flex justify-between">
                        <span className="text-xs font-medium text-brand-text-muted">Walkthrough step {stepIndex + 1}</span>
                        <button type="button" onClick={() => updateNested(index, 'steps', block.steps.filter((_, i) => i !== stepIndex))} className="text-xs text-red-600">Remove</button>
                      </div>
                      <input type="text" value={step.title || ''} placeholder="Title" onChange={(e) => {
                        const steps = [...block.steps];
                        steps[stepIndex] = { ...step, title: e.target.value };
                        updateNested(index, 'steps', steps);
                      }} className={`${inputClass} mb-2`} />
                      <textarea rows={2} value={step.description || ''} placeholder="Description" onChange={(e) => {
                        const steps = [...block.steps];
                        steps[stepIndex] = { ...step, description: e.target.value };
                        updateNested(index, 'steps', steps);
                      }} className={`${inputClass} resize-y`} />
                    </div>
                  ))}
                  <button type="button" onClick={() => updateNested(index, 'steps', [...(block.steps || []), { title: 'New step', description: '' }])} className="text-sm text-brand-primary hover:underline">
                    + Add walkthrough step
                  </button>
                </div>
              )}

              {block.type === 'image' && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Image URL">
                    <input type="text" value={block.src || ''} onChange={(e) => updateBlock(index, { src: e.target.value })} className={inputClass} placeholder="https://..." />
                  </Field>
                  <Field label="Alt text">
                    <input type="text" value={block.alt || ''} onChange={(e) => updateBlock(index, { alt: e.target.value })} className={inputClass} />
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label="Caption">
                      <input type="text" value={block.caption || ''} onChange={(e) => updateBlock(index, { caption: e.target.value })} className={inputClass} />
                    </Field>
                  </div>
                </div>
              )}

              {block.type === 'componentEmbed' && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Story ID">
                    <input type="text" value={block.storyId || ''} onChange={(e) => updateBlock(index, { storyId: e.target.value })} className={inputClass} placeholder="doc-components-overview--article-and-prose" />
                  </Field>
                  <Field label="Title">
                    <input type="text" value={block.title || ''} onChange={(e) => updateBlock(index, { title: e.target.value })} className={inputClass} />
                  </Field>
                </div>
              )}

              {block.type === 'mermaid' && (
                <Field label="Mermaid code">
                  <textarea rows={6} value={block.code || ''} onChange={(e) => updateBlock(index, { code: e.target.value })} className={`${inputClass} resize-y font-mono text-xs`} />
                </Field>
              )}

              {block.type === 'appDiagram' && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Backend name">
                    <input type="text" value={block.backend?.name || ''} onChange={(e) => updateBlock(index, { backend: { ...block.backend, name: e.target.value } })} className={inputClass} />
                  </Field>
                  <Field label="Backend port">
                    <input type="text" value={block.backend?.port || ''} onChange={(e) => updateBlock(index, { backend: { ...block.backend, port: e.target.value } })} className={inputClass} />
                  </Field>
                </div>
              )}

              {block.type === 'divider' && (
                <p className="text-sm text-brand-text-muted">Horizontal divider — no extra fields.</p>
              )}
                </>
              ) : (
                <p className="rounded-lg bg-brand-light/60 px-3 py-2 text-xs text-brand-text-muted">
                  Panel collapsed. Expand to edit fields.
                </p>
              )}
            </SortableBlock>
          );
          })}
        </SortableContext>
      </DndContext>

      <div className="flex flex-wrap gap-2">
        {BLOCK_TYPES.map((type) => (
          <button
            key={type.id}
            type="button"
            onClick={() => addBlock(type.id)}
            className="inline-flex items-center gap-1 rounded-lg border border-brand-border bg-white px-3 py-1.5 text-xs font-medium text-brand-foreground hover:bg-brand-hover"
          >
            <Plus className="h-3.5 w-3.5" />
            {type.label}
          </button>
        ))}
      </div>

      {removeTarget ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alertdialog" aria-modal="false" aria-labelledby="remove-block-title">
          <p id="remove-block-title" className="font-semibold">Remove {removeTarget.label}?</p>
          <p className="mt-1">
            This removes {removeTarget.summary !== 'No summary yet' ? `"${removeTarget.summary}"` : 'this block'} from the draft editor. Save changes to persist the removal.
          </p>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={() => setRemoveTarget(null)} className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700">
              Keep block
            </button>
            <button type="button" onClick={() => removeBlock(removeTarget.index)} className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white">
              Remove {removeTarget.label}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SortableBlock({ id, children }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="rounded-xl border border-brand-border bg-white p-4 shadow-soft">
      <div className="mb-2 flex justify-end">
        <button
          type="button"
          className="cursor-grab rounded p-1 text-brand-text-muted hover:bg-brand-hover"
          {...attributes}
          {...listeners}
          title="Drag to reorder"
          aria-label="Reorder block"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </div>
      {children}
    </div>
  );
}

function getBlockSummary(block) {
  if (block.text) return String(block.text).replace(/<[^>]+>/g, '').slice(0, 56);
  if (block.title) return String(block.title).slice(0, 56);
  if (block.caption) return String(block.caption).slice(0, 56);
  if (block.code) return 'Code configured';
  if (block.steps?.length) return `${block.steps.length} steps`;
  if (block.items?.length) return `${block.items.length} items`;
  return 'No summary yet';
}
