'use client';

import { useEffect, useState } from 'react';
import { Card, LoadingSpinner } from '@webfudge/ui';
import VLMPageHeader from '../../../components/VLMPageHeader';
import { allocationService } from '../../../lib/api';

export default function AllocationsPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await allocationService.getAll({ sort: 'createdAt:desc', 'pagination[pageSize]': 100 });
        if (!cancelled) setRows(res?.data || []);
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
      <VLMPageHeader title="Allocations" subtitle="Vehicle to dealer assignment history" />
      <Card variant="elevated" className="p-6">
        {loading ? <LoadingSpinner message="Loading allocations..." /> : <p>Total allocations: {rows.length}</p>}
      </Card>
    </div>
  );
}

