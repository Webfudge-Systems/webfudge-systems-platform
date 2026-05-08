import { VEHICLE_EVENT_TYPES } from '../constants/vehicleEventTypes';

const STATUS_BY_EVENT = {
  [VEHICLE_EVENT_TYPES.CREATED]: 'CREATED',
  [VEHICLE_EVENT_TYPES.ALLOCATED]: 'ALLOCATED',
  [VEHICLE_EVENT_TYPES.DISPATCHED]: 'DISPATCHED',
  [VEHICLE_EVENT_TYPES.IN_TRANSIT]: 'IN_TRANSIT',
  [VEHICLE_EVENT_TYPES.DELIVERED]: 'DELIVERED',
  [VEHICLE_EVENT_TYPES.ACTIVE]: 'ACTIVE',
  [VEHICLE_EVENT_TYPES.INACTIVE]: 'INACTIVE',
  [VEHICLE_EVENT_TYPES.SERVICE_ADDED]: 'ACTIVE',
  [VEHICLE_EVENT_TYPES.WARRANTY_CLAIM]: 'ACTIVE',
};

export function sortVehicleEventsChronological(events = []) {
  return [...events].sort((a, b) => {
    const aTime = new Date(a?.createdAt || 0).getTime();
    const bTime = new Date(b?.createdAt || 0).getTime();
    return aTime - bTime;
  });
}

export function deriveVehicleStatusFromEvents(events = []) {
  const ordered = sortVehicleEventsChronological(events);
  if (!ordered.length) return 'UNKNOWN';
  const latest = ordered[ordered.length - 1];
  const latestType = latest?.eventType;
  return STATUS_BY_EVENT[latestType] || 'UNKNOWN';
}

