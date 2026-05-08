'use client';

import { useEffect, useState } from 'react';
import { Card, LoadingSpinner } from '@webfudge/ui';
import VLMPageHeader from '../../../components/VLMPageHeader';
import { warrantyService } from '../../../lib/api';

export default function WarrantyPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await warrantyService.getAll({ sort: 'createdAt:desc', 'pagination[pageSize]': 100 });
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
      <VLMPageHeader title="Warranty" subtitle="Warranty claims and provider records" />
      <Card variant="elevated" className="p-6">
        {loading ? <LoadingSpinner message="Loading warranty records..." /> : <p>Total records: {rows.length}</p>}
      </Card>
    </div>
  );
}

