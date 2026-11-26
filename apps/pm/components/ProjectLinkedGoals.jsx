'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Target } from 'lucide-react';
import { Card } from '@webfudge/ui';
import goalService from '../lib/api/goalService';
import { HealthChip, ProgressBar, krValueText } from './goals/goalUi';

/** W12: objectives with key results linked to this project or its tasks. Hidden when there are none. */
export default function ProjectLinkedGoals({ projectId }) {
  const [rows, setRows] = useState(null);

  useEffect(() => {
    let live = true;
    goalService
      .linkedToProject(projectId)
      .then((res) => live && setRows(Array.isArray(res?.data) ? res.data : []))
      .catch(() => live && setRows([]));
    return () => {
      live = false;
    };
  }, [projectId]);

  if (!rows || !rows.length) return null;

  return (
    <Card variant="elevated" className="rounded-xl">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
          <Target className="h-4 w-4 text-gray-400" aria-hidden />
          Linked goals
        </h3>
        <Link href="/goals" className="text-xs font-medium text-orange-600 hover:text-orange-700">
          All goals
        </Link>
      </div>
      <ul className="space-y-4">
        {rows.map((o) => (
          <li key={o.id} className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <p className="min-w-0 text-sm font-medium text-gray-900">{o.title}</p>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-gray-900">{Math.round(o.progress)}%</span>
            </div>
            <ProgressBar value={o.progress} health={o.health} size="sm" />
            <ul className="space-y-1.5 pl-2">
              {o.keyResults.map((kr) => (
                <li key={kr.id} className="flex items-center gap-2 text-xs text-gray-600">
                  <span className="min-w-0 flex-1 truncate" title={kr.title}>
                    {kr.title} · {krValueText(kr)}
                  </span>
                  <HealthChip value={kr.confidence} />
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </Card>
  );
}
