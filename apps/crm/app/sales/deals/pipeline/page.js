'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card } from '@webfudge/ui';
import CRMPageHeader from '../../../../components/CRMPageHeader';
import dealService from '../../../../lib/api/dealService';

const STAGES = ['Lead', 'Qualified', 'Proposal', 'Negotiation', 'Won'];

export default function PipelinePage() {
  const [stagesData, setStagesData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await dealService.getPipeline();
        const data = Array.isArray(res?.data) ? res.data : [];
        const byStage = {};
        STAGES.forEach((s) => (byStage[s] = []));
        data.forEach((d) => {
          const stage = d.stage || 'Lead';
          if (!byStage[stage]) byStage[stage] = [];
          byStage[stage].push(d);
        });
        if (!cancelled) {
          setStagesData(
            STAGES.map((label) => ({
              label,
              deals: byStage[label] || [],
            }))
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <CRMPageHeader
        title="Pipeline"
        subtitle="Deal stages and value"
        breadcrumb={[
          { label: 'Sales', href: '/sales' },
          { label: 'Deals', href: '/sales/deals' },
          { label: 'Pipeline', href: '/sales/deals/pipeline' },
        ]}
      />

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading pipeline...</div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {stagesData.map(({ label, deals }) => (
            <Card key={label} className="min-w-[280px] flex-shrink-0 border border-gray-200 p-4">
              <h3 className="font-semibold text-brand-dark mb-3">{label}</h3>
              <div className="space-y-2">
                {deals.length === 0 ? (
                  <p className="text-sm text-gray-500">No deals</p>
                ) : (
                  deals.map((d) => (
                    <Link key={d.id} href={`/sales/deals/${d.id}`}>
                      <div className="p-3 bg-brand-light rounded-lg border border-gray-100 hover:border-brand-primary/20 transition-colors cursor-pointer">
                        <p className="font-medium text-sm text-brand-dark">{d.name || 'Unnamed'}</p>
                        {d.value != null && (
                          <p className="text-xs text-gray-600 mt-1">₹{Number(d.value).toLocaleString()}</p>
                        )}
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
