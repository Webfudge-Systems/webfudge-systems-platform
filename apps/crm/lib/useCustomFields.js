'use client';

import { useCallback, useEffect, useState } from 'react';
import customFieldService from './api/customFieldService';

/**
 * Custom field definitions for one record type (ticket G1).
 * @param {'lead'|'contact'|'account'|'deal'} entity
 * @returns {{ fields: object[], loading: boolean, reload: () => Promise<void> }}
 */
export default function useCustomFields(entity) {
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      setFields(await customFieldService.list(entity));
    } catch {
      setFields([]);
    } finally {
      setLoading(false);
    }
  }, [entity]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { fields, loading, reload };
}
