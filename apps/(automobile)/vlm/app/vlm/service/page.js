'use client';

import { useEffect, useState } from 'react';
import { Card, LoadingSpinner } from '@webfudge/ui';
import VLMPageHeader from '../../../components/VLMPageHeader';
import { serviceRecordService } from '../../../lib/api';

export default function ServicePage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await serviceRecordService.getAll({ sort: 'createdAt:desc', 'pagination[pageSize]': 100 });
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
      <VLMPageHeader title="Service" subtitle="Service history and maintenance records" />
      <Card variant="elevated" className="p-6">
        {loading ? <LoadingSpinner message="Loading service records..." /> : <p>Total records: {rows.length}</p>}
      </Card>
    </div>
  );
}

