import strapiClient from '../strapiClient';
import { VEHICLE_EVENT_TYPES } from '../constants/vehicleEventTypes';
import { buildListQuery, normalizeStrapiListResponse, normalizeStrapiOneResponse } from './strapiContentApi';

const ENDPOINT = '/allocations';

async function createVehicleEvent(vehicleId, eventType, metadata = {}) {
  return strapiClient.post('/vehicle-events', {
    data: {
      vehicle: Number(vehicleId),
      eventType,
      metadata,
    },
  });
}

export default {
  async getAll(params = {}) {
    const response = await strapiClient.get(ENDPOINT, buildListQuery(params));
    return normalizeStrapiListResponse(response);
  },

  async allocate({ vehicleId, dealerId, ...payload }) {
    const allocationRes = await strapiClient.post(ENDPOINT, {
      data: {
        vehicle: Number(vehicleId),
        dealerId: dealerId ?? null,
        ...payload,
      },
    });
    await createVehicleEvent(vehicleId, VEHICLE_EVENT_TYPES.ALLOCATED, {
      dealer_id: dealerId ?? null,
      ...payload,
    });
    return normalizeStrapiOneResponse(allocationRes);
  },
};

