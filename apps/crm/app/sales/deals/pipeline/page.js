'use client';

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Briefcase, Plus, GripVertical, TrendingUp } from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  useDroppable,
  useDraggable,
  pointerWithin,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { LoadingSpinner, TabsWithActions } from '@webfudge/ui';
import CRMPageHeader from '../../../../components/CRMPageHeader';
import dealService from '../../../../lib/api/dealService';
import WonDealProjectModal from '../../../../components/WonDealProjectModal';

/** Must stay aligned with Strapi deal.stage enum. */
const STAGES = [
  { key: 'discovery', label: 'Discovery' },
  { key: 'prospect', label: 'Prospect' },
  { key: 'proposal', label: 'Proposal' },
  { key: 'negotiation', label: 'Negotiation' },
  { key: 'won', label: 'Won' },
  { key: 'lost', label: 'Lost' },
];

const STAGE_STYLES = {
  discovery: {
    header: 'bg-blue-50 border-blue-200',
    dot: 'bg-blue-400',
    text: 'text-blue-700',
    badge: 'bg-blue-100 text-blue-700',
    dropActive: 'border-blue-400 bg-blue-50/80 shadow-lg shadow-blue-100',
  },
  prospect: {
    header: 'bg-violet-50 border-violet-200',
    dot: 'bg-violet-400',
    text: 'text-violet-700',
    badge: 'bg-violet-100 text-violet-700',
    dropActive: 'border-violet-400 bg-violet-50/80 shadow-lg shadow-violet-100',
  },
  proposal: {
    header: 'bg-amber-50 border-amber-200',
    dot: 'bg-amber-400',
    text: 'text-amber-700',
    badge: 'bg-amber-100 text-amber-700',
    dropActive: 'border-amber-400 bg-amber-50/80 shadow-lg shadow-amber-100',
  },
  negotiation: {
    header: 'bg-orange-50 border-orange-200',
    dot: 'bg-orange-400',
    text: 'text-orange-700',
    badge: 'bg-orange-100 text-orange-700',
    dropActive: 'border-orange-400 bg-orange-50/80 shadow-lg shadow-orange-100',
  },
  won: {
    header: 'bg-emerald-50 border-emerald-200',
    dot: 'bg-emerald-400',
    text: 'text-emerald-700',
    badge: 'bg-emerald-100 text-emerald-700',
    dropActive: 'border-emerald-400 bg-emerald-50/80 shadow-lg shadow-emerald-100',
  },
  lost: {
    header: 'bg-red-50 border-red-200',
    dot: 'bg-red-400',
    text: 'text-red-700',
    badge: 'bg-red-100 text-red-700',
    dropActive: 'border-red-400 bg-red-50/80 shadow-lg shadow-red-100',
  },
};

const PRIORITY_PILL = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-gray-100 text-gray-500',
};

function formatINR(v) {
  if (v == null || Number.isNaN(Number(v))) return null;
  return '₹' + Number(v).toLocaleString('en-IN');
}

function dealCompany(d) {
  return (
    d?.leadCompany?.companyName ||
    d?.leadCompany?.name ||
    d?.clientAccount?.companyName ||
    d?.clientAccount?.name ||
    null
  );
}

// ─────────────────────────────────────────────
// Deal card (draggable)
// ─────────────────────────────────────────────

function DealCardInner({ deal }) {
  const company = dealCompany(deal);
  const value = formatINR(deal.value);

  return (
    <>
      <div className="flex items-start justify-between gap-1">
        <p className="line-clamp-2 flex-1 text-sm font-semibold leading-snug text-gray-900">
          {deal.name || 'Unnamed deal'}
        </p>
        <GripVertical className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-300 opacity-0 transition-opacity group-hover:opacity-100" />
      </div>

      {company ? (
        <p className="mt-0.5 truncate text-xs text-gray-500">{company}</p>
      ) : null}

      {value ? (
        <p className="mt-2 text-sm font-bold text-gray-800">{value}</p>
      ) : null}

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {deal.priority ? (
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${PRIORITY_PILL[deal.priority] || 'bg-gray-100 text-gray-500'
              }`}
          >
            {deal.priority}
          </span>
        ) : null}
        {deal.expectedCloseDate ? (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500">
            {new Date(deal.expectedCloseDate).toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
            })}
          </span>
        ) : null}
      </div>

      {deal.probability != null ? (
        <div className="mt-2.5">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-gray-400">Win probability</p>
            <p className="text-[10px] font-semibold text-gray-500">{deal.probability}%</p>
          </div>
          <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-orange-400 to-pink-400 transition-all"
              style={{ width: `${Math.min(100, deal.probability)}%` }}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}

function DealCard({ deal, overlay = false }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: String(deal.id),
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={[
        'group relative cursor-grab rounded-xl border bg-white p-3.5 transition-all active:cursor-grabbing',
        isDragging
          ? 'opacity-25 shadow-none'
          : 'border-gray-200 shadow-sm hover:border-orange-200 hover:shadow-md',
        overlay ? 'rotate-1 border-orange-300 shadow-2xl ring-2 ring-orange-400/30 !opacity-100' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <DealCardInner deal={deal} />
    </div>
  );
}

// ─────────────────────────────────────────────
// Stage column (droppable)
// ─────────────────────────────────────────────

function StageColumn({ stageKey, label, deals, isOver }) {
  const { setNodeRef } = useDroppable({ id: stageKey });
  const style = STAGE_STYLES[stageKey] || STAGE_STYLES.discovery;
  const totalValue = deals.reduce((sum, d) => sum + (Number(d.value) || 0), 0);

  return (
    <div
      ref={setNodeRef}
      className={[
        'flex min-h-[420px] min-w-[272px] max-w-[300px] flex-shrink-0 flex-col rounded-2xl border transition-all duration-150',
        isOver ? style.dropActive : 'border-gray-200 bg-gray-50/60',
      ].join(' ')}
    >
      {/* Header */}
      <div
        className={`flex items-center justify-between rounded-t-2xl border-b px-4 py-3 ${style.header}`}
      >
        <div className="flex items-center gap-2">
          <h3 className={`text-[11px] font-extrabold uppercase tracking-widest ${style.text}`}>
            {label}
          </h3>
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${style.badge}`}>
          {deals.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto p-3">
        {deals.length === 0 ? (
          <div
            className={`flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed p-4 text-center transition-colors ${isOver
              ? 'border-current bg-white/80'
              : 'border-gray-200 bg-white/40'
              }`}
          >
            <p className="text-[11px] text-gray-400">
              {isOver ? 'Release to move here' : 'No deals'}
            </p>
          </div>
        ) : (
          deals.map((d) => <DealCard key={d.id} deal={d} />)
        )}
      </div>

      {/* Footer: total value */}
      {totalValue > 0 ? (
        <div className="flex items-center gap-1.5 border-t border-gray-200 px-4 py-2.5">
          <TrendingUp className="h-3.5 w-3.5 text-gray-400" />
          <p className="text-xs font-semibold text-gray-500">
            {formatINR(totalValue)}
          </p>
        </div>
      ) : null}
    </div>
  );
}

// ─────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────

export default function PipelinePage() {
  const router = useRouter();
  const [allDeals, setAllDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [activeId, setActiveId] = useState(null); // dragged deal id (string)
  const [overId, setOverId] = useState(null);     // currently hovered column key

  // Won-deal modal state
  const [wonModal, setWonModal] = useState({ open: false, dealId: null, dealName: '' });
  const [wonBusy, setWonBusy] = useState(false);

  // Sensors — require a tiny movement before starting drag (avoids killing clicks)
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
  );

  // ── Data loading ──────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await dealService.getPipeline();
        const data = Array.isArray(res?.data) ? res.data : [];
        if (!cancelled) setAllDeals(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Derived: stages ───────────────────────────
  const stagesData = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const byStage = {};
    STAGES.forEach(({ key }) => { byStage[key] = []; });

    allDeals.forEach((d) => {
      const stage = (d.stage || 'discovery').toLowerCase();
      if (!byStage[stage]) byStage[stage] = [];
      byStage[stage].push(d);
    });

    return STAGES.map(({ key, label }) => {
      let deals = byStage[key] || [];
      if (q) {
        deals = deals.filter((d) => {
          const name = (d.name || '').toLowerCase();
          const co = (dealCompany(d) || '').toLowerCase();
          return name.includes(q) || co.includes(q);
        });
      }
      return { key, label, deals };
    });
  }, [allDeals, searchQuery]);

  const filteredStages = useMemo(() => {
    if (activeTab === 'all') return stagesData;
    return stagesData.filter(({ key }) => key === activeTab);
  }, [stagesData, activeTab]);

  const tabItems = useMemo(
    () => [
      {
        key: 'all',
        label: 'All stages',
        count: stagesData.reduce((sum, s) => sum + s.deals.length, 0),
      },
      ...STAGES.map(({ key, label }) => ({
        key,
        label,
        count: stagesData.find((s) => s.key === key)?.deals.length ?? 0,
      })),
    ],
    [stagesData]
  );

  // ── Active deal object (for DragOverlay) ──────
  const activeDeal = useMemo(() => {
    if (!activeId) return null;
    return allDeals.find((d) => String(d.id) === activeId) ?? null;
  }, [activeId, allDeals]);

  // ── Drag handlers ─────────────────────────────
  const handleDragStart = useCallback(({ active }) => {
    setActiveId(String(active.id));
  }, []);

  const handleDragOver = useCallback(({ over }) => {
    setOverId(over?.id ?? null);
  }, []);

  const handleDragEnd = useCallback(
    async ({ active, over }) => {
      setActiveId(null);
      setOverId(null);

      if (!over) return;

      const dealId = String(active.id);
      const newStage = String(over.id); // column key

      const deal = allDeals.find((d) => String(d.id) === dealId);
      if (!deal) return;

      const oldStage = (deal.stage || 'discovery').toLowerCase();
      if (oldStage === newStage) return;

      // Optimistic update
      setAllDeals((prev) =>
        prev.map((d) =>
          String(d.id) === dealId ? { ...d, stage: newStage } : d
        )
      );

      try {
        await dealService.update(dealId, { stage: newStage });
      } catch {
        // Revert on failure
        setAllDeals((prev) =>
          prev.map((d) =>
            String(d.id) === dealId ? { ...d, stage: oldStage } : d
          )
        );
        return;
      }

      // Prompt delivery project creation when moved to "won"
      if (newStage === 'won') {
        setWonModal({ open: true, dealId: Number(dealId), dealName: deal.name || '' });
      }
    },
    [allDeals]
  );

  // ── Won modal actions ─────────────────────────
  const handleWonSkip = useCallback(async () => {
    setWonModal((s) => ({ ...s, open: false }));
  }, []);

  const handleWonCreateProject = useCallback(async () => {
    const { dealId } = wonModal;
    if (!dealId) return;
    setWonBusy(true);
    try {
      await dealService.createDeliveryProject(dealId);
      setWonModal({ open: false, dealId: null, dealName: '' });
      router.push('/clients/projects');
    } catch {
      setWonModal((s) => ({ ...s, open: false }));
    } finally {
      setWonBusy(false);
    }
  }, [wonModal, router]);

  const hasDeals = stagesData.some((s) => s.deals.length > 0);
  const totalValue = allDeals.reduce((sum, d) => sum + (Number(d.value) || 0), 0);
  const totalDeals = allDeals.length;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <CRMPageHeader
        title="Pipeline"
        subtitle={
          totalDeals > 0
            ? `${totalDeals} deal${totalDeals !== 1 ? 's' : ''} · ${formatINR(totalValue) ?? '—'} total value`
            : 'Deal stages and value'
        }
        breadcrumb={[
          { label: 'Sales', href: '/sales' },
          { label: 'Deals', href: '/sales/deals' },
          { label: 'Pipeline', href: '/sales/deals/pipeline' },
        ]}
        showActions
        onAddClick={() => router.push('/sales/deals/new')}
        onFilterClick={() => { }}
        onImportClick={() => { }}
        onExportClick={() => { }}
      />

      <TabsWithActions
        tabs={tabItems.map((item) => ({
          key: item.key,
          label: item.label,
          badge: String(item.count),
        }))}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        showSearch
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search deals or companies…"
        showAdd
        addTitle="Add Deal"
        onAddClick={() => router.push('/sales/deals/new')}
        showViewToggle
        activeView="board"
        onViewChange={(view) => {
          if (view === 'list') router.push('/sales/deals');
        }}
        listViewTitle="Table view"
        boardViewTitle="Pipeline view"
        showFilter
        onFilterClick={() => { }}
      />

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex min-h-[420px] flex-col items-center justify-center p-12">
            <LoadingSpinner size="lg" message="Loading pipeline…" />
          </div>
        ) : !hasDeals && !searchQuery ? (
          <div className="flex min-h-[360px] flex-col items-center justify-center p-10 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
              <Briefcase className="h-7 w-7 text-gray-400" />
            </div>
            <h3 className="text-base font-semibold text-gray-800">No deals yet</h3>
            <p className="mt-1 text-sm text-gray-500">Create your first deal to start building the pipeline.</p>
            <button
              type="button"
              onClick={() => router.push('/sales/deals/new')}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 active:opacity-80"
            >
              <Plus className="h-4 w-4" />
              Add Deal
            </button>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={pointerWithin}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-4 overflow-x-auto p-4 pb-5 md:p-5">
              {filteredStages.map(({ key, label, deals }) => (
                <StageColumn
                  key={key}
                  stageKey={key}
                  label={label}
                  deals={deals}
                  isOver={overId === key}
                />
              ))}

              {filteredStages.length === 0 ? (
                <div className="flex min-h-[360px] min-w-full items-center justify-center rounded-2xl border border-dashed border-gray-200 p-8 text-center">
                  <div>
                    <Briefcase className="mx-auto mb-3 h-10 w-10 text-gray-300" />
                    <p className="text-sm text-gray-500">No deals match your search.</p>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Ghost card floating under the cursor */}
            <DragOverlay dropAnimation={{ duration: 180, easing: 'ease' }}>
              {activeDeal ? (
                <div className="w-[272px] rotate-1 rounded-xl border border-orange-300 bg-white p-3.5 shadow-2xl ring-2 ring-orange-400/30">
                  <DealCardInner deal={activeDeal} />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      {/* Won deal → delivery project modal */}
      <WonDealProjectModal
        open={wonModal.open}
        dealName={wonModal.dealName}
        busy={wonBusy}
        onClose={() => setWonModal((s) => ({ ...s, open: false }))}
        onSkipProject={handleWonSkip}
        onCreateProject={handleWonCreateProject}
      />
    </div>
  );
}
