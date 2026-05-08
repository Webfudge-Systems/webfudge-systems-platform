'use client';

import { useEffect, useState } from 'react';
import { vehicleService } from '../../../lib/api';

export default function useVehicles() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await vehicleService.getAll({ sort: 'createdAt:desc', 'pagination[pageSize]': 100 });
        if (!cancelled) setData(res?.data || []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { loading, data };
}

