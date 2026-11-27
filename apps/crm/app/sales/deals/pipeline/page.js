'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Briefcase, Plus, Kanban, Table2 } from 'lucide-react';
import { LoadingSpinner, TabsWithActions, ViewToggleGroup, ViewToggleButton } from '@webfudge/ui';
import CRMPageHeader from '../../../../components/CRMPageHeader';
import { DealsKanbanBoard, DEAL_PIPELINE_STAGES } from '../../../../components/DealsKanbanBoard';
import dealService from '../../../../lib/api/dealService';
import pipelineService, { dealPipelineId, dealStageKey, defaultPipelineOf } from '../../../../lib/api/pipelineService';
import WonDealProjectModal from '../../../../components/WonDealProjectModal';
import LostReasonModal from '../../../../components/LostReasonModal';
import { canEditCRMRecord, canWriteCRM } from '../../../../lib/rbac';

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

export default function PipelinePage() {
  const router = useRouter();
  const [allDeals, setAllDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [pipelines, setPipelines] = useState([]);
  const [pipelineId, setPipelineId] = useState(null);
  const [moveError, setMoveError] = useState('');

  const [wonModal, setWonModal] = useState({ open: false, dealId: null, dealName: '' });
  const [wonBusy, setWonBusy] = useState(false);
  const [lostModal, setLostModal] = useState(null); // G15: { dealId, dealName }
  const [lostBusy, setLostBusy] = useState(false);
  const canCreateDeals = canWriteCRM('deals');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [res, pipeRes] = await Promise.all([
          dealService.getPipeline(),
          pipelineService.list('deal').catch(() => ({ data: [] })),
        ]);
        const data = Array.isArray(res?.data) ? res.data : [];
        if (!cancelled) {
          setAllDeals(data);
          const list = pipeRes.data || [];
          setPipelines(list);
          let stored = null;
          try {
            stored = Number(window.localStorage.getItem('crm.deals.pipelineId')) || null;
          } catch {
            /* ignore */
          }
          const pick = list.find((p) => p.id === stored) || defaultPipelineOf(list);
          setPipelineId(pick?.id ?? null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /** Stages of the selected pipeline (falls back to the built-in stages if pipelines can't load). */
  const activePipeline = useMemo(
    () => pipelines.find((p) => p.id === pipelineId) || null,
    [pipelines, pipelineId]
  );
  const pipelineStages = useMemo(
    () =>
      activePipeline?.stages?.length
        ? activePipeline.stages
        : DEAL_PIPELINE_STAGES.map((s) => ({ ...s, kind: s.key === 'won' ? 'won' : s.key === 'lost' ? 'lost' : 'open' })),
    [activePipeline]
  );

  /** Deals in the selected pipeline, each tagged with its stage key for the board. */
  const pipelineDeals = useMemo(() => {
    if (!pipelines.length) return allDeals.map((d) => ({ ...d, stageKey: dealStageKey(d) }));
    return allDeals
      .filter((d) => dealPipelineId(d, pipelines) === pipelineId)
      .map((d) => ({ ...d, stageKey: dealStageKey(d) }));
  }, [allDeals, pipelines, pipelineId]);

  const stagesData = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const byStage = {};
    pipelineStages.forEach(({ key }) => {
      byStage[key] = [];
    });

    pipelineDeals.forEach((d) => {
      const stage = d.stageKey;
      if (!byStage[stage]) byStage[stage] = [];
      byStage[stage].push(d);
    });

    return pipelineStages.map(({ key, label, color }) => {
      let colDeals = byStage[key] || [];
      if (q) {
        colDeals = colDeals.filter((d) => {
          const name = (d.name || '').toLowerCase();
          const co = (dealCompany(d) || '').toLowerCase();
          return name.includes(q) || co.includes(q);
        });
      }
      return { key, label, color, deals: colDeals };
    });
  }, [pipelineDeals, pipelineStages, searchQuery]);

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
      ...pipelineStages.map(({ key, label }) => ({
        key,
        label,
        count: stagesData.find((s) => s.key === key)?.deals.length ?? 0,
      })),
    ],
    [stagesData, pipelineStages]
  );

  const selectPipeline = useCallback((id) => {
    setPipelineId(id);
    setActiveTab('all');
    try {
      window.localStorage.setItem('crm.deals.pipelineId', String(id));
    } catch {
      /* ignore */
    }
  }, []);

  const handlePipelineDealMove = useCallback(async (dealId, newStage) => {
    const deal = allDeals.find((d) => String(d.id) === dealId);
    if (!deal) return;
    if (!canEditCRMRecord('deals', deal)) return;
    const oldKey = dealStageKey(deal);
    if (oldKey === newStage) return;
    const target = pipelineStages.find((s) => s.key === newStage);
    setMoveError('');

    const previous = { pipelineStageKey: deal.pipelineStageKey, stage: deal.stage, pipeline: deal.pipeline };
    setAllDeals((prev) =>
      prev.map((d) => (String(d.id) === dealId ? { ...d, pipelineStageKey: newStage, pipeline: d.pipeline || pipelineId } : d))
    );

    try {
      const res = await dealService.update(
        dealId,
        pipelineId ? { pipeline: pipelineId, pipelineStageKey: newStage } : { stage: newStage }
      );
      const saved = res?.data;
      if (saved) {
        setAllDeals((prev) =>
          prev.map((d) =>
            String(d.id) === dealId
              ? { ...d, stage: saved.stage ?? d.stage, pipelineStageKey: saved.pipelineStageKey ?? newStage, probability: saved.probability ?? d.probability }
              : d
          )
        );
      }
    } catch (err) {
      setAllDeals((prev) => prev.map((d) => (String(d.id) === dealId ? { ...d, ...previous } : d)));
      setMoveError(err?.message || 'Could not move the deal');
      return;
    }

    if ((target?.kind || (newStage === 'won' ? 'won' : 'open')) === 'won') {
      setWonModal({ open: true, dealId: Number(dealId), dealName: deal.name || '' });
    }
    if ((target?.kind || (newStage === 'lost' ? 'lost' : 'open')) === 'lost') {
      setLostModal({ dealId: Number(dealId), dealName: deal.name || '' });
    }
  }, [allDeals, pipelineId, pipelineStages]);

  const goToDealsTable = useCallback(() => {
    try {
      window.localStorage.setItem('crm.deals.viewMode', 'table');
    } catch {
      /* ignore */
    }
    router.push('/sales/deals');
  }, [router]);

  const handleWonSkip = useCallback(async () => {
    setWonModal((s) => ({ ...s, open: false }));
  }, []);

  const handleWonCreateProject = useCallback(async (options = {}) => {
    const { dealId } = wonModal;
    if (!dealId) return;
    setWonBusy(true);
    try {
      await dealService.createDeliveryProject(dealId, options);
      setWonModal({ open: false, dealId: null, dealName: '' });
      router.push('/clients/projects');
    } catch {
      setWonModal((s) => ({ ...s, open: false }));
    } finally {
      setWonBusy(false);
    }
  }, [wonModal, router]);

  const hasDeals = stagesData.some((s) => s.deals.length > 0);
  const totalValue = pipelineDeals.reduce((sum, d) => sum + (Number(d.value) || 0), 0);
  const totalDeals = pipelineDeals.length;

  const pipelineViewSwitcher = (
    <ViewToggleGroup aria-label="Deals layout">
      <ViewToggleButton active={false} title="Table view" onClick={goToDealsTable}>
        <Table2 className="h-[18px] w-[18px]" strokeWidth={2} />
      </ViewToggleButton>
      <ViewToggleButton active title="Kanban view" onClick={() => {}}>
        <Kanban className="h-[18px] w-[18px]" strokeWidth={2} />
      </ViewToggleButton>
    </ViewToggleGroup>
  );

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
        onAddClick={canCreateDeals ? () => router.push('/sales/deals/new') : undefined}
        onFilterClick={() => {}}
        onImportClick={() => {}}
        onExportClick={() => {}}
      />

      {pipelines.length > 1 ? (
        <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Pipelines">
          {pipelines.map((p) => (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={p.id === pipelineId}
              onClick={() => selectPipeline(p.id)}
              className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${
                p.id === pipelineId
                  ? 'border-orange-500 bg-orange-500 text-white shadow-sm'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-orange-300 hover:text-orange-700'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      ) : null}

      {moveError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700" role="alert">
          {moveError}
        </p>
      ) : null}

      <TabsWithActions
        tabs={tabItems.map((item) => ({
          key: item.key,
          label: item.label,
          badge: String(item.count),
        }))}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        afterTabs={pipelineViewSwitcher}
        showSearch
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search deals or companies…"
        showAdd={canCreateDeals}
        addTitle="Add Deal"
        onAddClick={canCreateDeals ? () => router.push('/sales/deals/new') : undefined}
        showFilter
        onFilterClick={() => {}}
      />

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex min-h-[420px] flex-col items-center justify-center p-12">
            <LoadingSpinner size="lg" message="Loading pipeline…" />
          </div>
        ) : allDeals.length === 0 && !searchQuery ? (
          <div className="flex min-h-[360px] flex-col items-center justify-center p-10 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
              <Briefcase className="h-7 w-7 text-gray-400" />
            </div>
            <h3 className="text-base font-semibold text-gray-800">No deals yet</h3>
            <p className="mt-1 text-sm text-gray-500">
              {canCreateDeals ? 'Create your first deal to start building the pipeline.' : 'No deals are available yet.'}
            </p>
            {canCreateDeals ? (
              <button
                type="button"
                onClick={() => router.push('/sales/deals/new')}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 active:opacity-80"
              >
                <Plus className="h-4 w-4" />
                Add Deal
              </button>
            ) : null}
          </div>
        ) : (
          <DealsKanbanBoard
            stageColumns={filteredStages}
            dealsLookup={pipelineDeals}
            onMoveDeal={handlePipelineDealMove}
            getDealHref={(id) => `/sales/deals/${id}`}
            canMoveDeal={(deal) => canEditCRMRecord('deals', deal)}
          />
        )}
      </div>

      <LostReasonModal
        isOpen={!!lostModal}
        dealName={lostModal?.dealName}
        busy={lostBusy}
        onSkip={() => setLostModal(null)}
        onSave={async (lostReason) => {
          setLostBusy(true);
          try {
            await dealService.update(lostModal.dealId, { lostReason });
          } catch (err) {
            setMoveError(err?.message || 'Could not save the lost reason');
          } finally {
            setLostBusy(false);
            setLostModal(null);
          }
        }}
      />

      <WonDealProjectModal
        open={wonModal.open}
        dealName={wonModal.dealName}
        dealId={wonModal.dealId}
        busy={wonBusy}
        onClose={() => setWonModal((s) => ({ ...s, open: false }))}
        onSkipProject={handleWonSkip}
        onCreateProject={handleWonCreateProject}
      />
    </div>
  );
}
