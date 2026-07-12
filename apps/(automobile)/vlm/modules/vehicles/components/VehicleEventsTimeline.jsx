'use client';

import { ActivitiesTimeline, Card } from '@webfudge/ui';
import { VEHICLE_EVENT_LABELS } from '../../../lib/constants/vehicleEventTypes';

function mapEventToTimelineItem(event) {
  const eventType = String(event?.eventType || '').toUpperCase();
  const action =
    eventType === 'CREATED'
      ? 'create'
      : eventType === 'INACTIVE'
        ? 'delete'
        : eventType === 'WARRANTY_CLAIM'
          ? 'comment'
          : 'update';

  return {
    id: event.id,
    action,
    summary: VEHICLE_EVENT_LABELS[event.eventType] || event.eventType || 'Lifecycle event',
    createdAt: event.createdAt,
    meta: event.metadata,
    actor: event.createdBy,
  };
}

export default function VehicleEventsTimeline({ events = [] }) {
  const items = events.map(mapEventToTimelineItem);

  return (
    <Card variant="elevated" className="p-6">
      <ActivitiesTimeline items={items} />
    </Card>
  );
}
