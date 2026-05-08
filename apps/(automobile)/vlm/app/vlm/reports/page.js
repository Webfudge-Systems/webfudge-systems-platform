'use client';

import { useEffect, useState } from 'react';
import { Card, LoadingSpinner } from '@webfudge/ui';
import VLMPageHeader from '../../../components/VLMPageHeader';
import { reportService } from '../../../lib/api';

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await reportService.getDashboardSummary();
        if (!cancelled) setSummary(res);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <VLMPageHeader title="Reports" subtitle="Lifecycle analytics and operational summaries" />
      <Card variant="elevated" className="space-y-2 p-6">
        {loading ? (
          <LoadingSpinner message="Loading report summary..." />
        ) : (
          <>
            <p>Total vehicles: {summary?.totalVehicles || 0}</p>
            <p>Total allocations: {summary?.totalAllocations || 0}</p>
            <p>Total service records: {summary?.totalServiceRecords || 0}</p>
            <p>Total warranty records: {summary?.totalWarrantyRecords || 0}</p>
          </>
        )}
      </Card>
    </div>
  );
}

