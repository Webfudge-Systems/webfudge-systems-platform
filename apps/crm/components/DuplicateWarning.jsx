'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import importService from '../lib/api/importService';

/**
 * Shows possible duplicates (same email, phone or company name) for a lead or contact (ticket G4).
 * Debounced; renders nothing when there are none.
 * @param {{ entity: 'lead'|'contact', email?: string, phone?: string, companyName?: string, excludeId?: number|string, allowMerge?: boolean }} props
 */
export default function DuplicateWarning({ entity, email, phone, companyName, excludeId, allowMerge = false }) {
  const [matches, setMatches] = useState([]);

  useEffect(() => {
    const has = (email && email.includes('@')) || (phone && phone.replace(/\D/g, '').length >= 8) || (companyName && companyName.trim().length >= 3);
    if (!has) {
      setMatches([]);
      return undefined;
    }
    let cancelled = false;
    const t = setTimeout(() => {
      importService
        .duplicates(entity, { email, phone, companyName, excludeId })
        .then((rows) => {
          if (!cancelled) setMatches(rows);
        })
        .catch(() => {});
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [entity, email, phone, companyName, excludeId]);

  if (!matches.length) return null;
  const base = entity === 'contact' ? '/sales/contacts' : '/sales/lead-companies';

  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="status">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
      <div className="min-w-0">
        <p className="font-medium">Possible duplicate{matches.length > 1 ? 's' : ''}</p>
        <ul className="mt-1 space-y-0.5">
          {matches.slice(0, 5).map((m) => (
            <li key={m.id}>
              <Link href={`${base}/${m.id}`} className="font-medium text-amber-900 underline">
                {m.label}
              </Link>{' '}
              <span className="text-amber-800">(same {m.matchedOn})</span>
              {allowMerge && entity === 'lead' && excludeId ? (
                <>
                  {' · '}
                  <Link href={`/sales/lead-companies/merge?keep=${m.id}&merge=${excludeId}`} className="font-medium text-orange-700 underline">
                    Merge
                  </Link>
                </>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
