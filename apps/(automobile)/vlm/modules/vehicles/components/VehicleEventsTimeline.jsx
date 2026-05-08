'use client';

import { Card } from '@webfudge/ui';
import { VEHICLE_EVENT_LABELS } from '../../../lib/constants/vehicleEventTypes';

function formatTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function VehicleEventsTimeline({ events = [] }) {
  return (
    <Card variant="elevated" className="p-4">
      <div className="space-y-3">
        {events.length === 0 ? (
          <p className="text-sm text-gray-500">No events yet.</p>
        ) : (
          events.map((event) => (
            <div key={event.id} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
              <p className="text-sm font-semibold text-gray-900">
                {VEHICLE_EVENT_LABELS[event.eventType] || event.eventType}
              </p>
              <p className="text-xs text-gray-500">{formatTime(event.createdAt)}</p>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}

