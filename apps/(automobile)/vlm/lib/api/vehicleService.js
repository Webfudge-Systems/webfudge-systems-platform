import strapiClient from '../strapiClient';
import { VEHICLE_EVENT_TYPES } from '../constants/vehicleEventTypes';
import { deriveVehicleStatusFromEvents, sortVehicleEventsChronological } from '../utils/deriveVehicleStatusFromEvents';
import {
  buildListQuery,
  normalizeStrapiEntry,
  normalizeStrapiListResponse,
  normalizeStrapiOneResponse,
} from './strapiContentApi';

const ENDPOINT = '/vehicles';
const EVENTS_ENDPOINT = '/vehicle-events';

function normalizeVehicle(row) {
  return normalizeStrapiEntry(row);
}

async function fetchVehicleEvents(vehicleId, options = {}) {
  const response = await strapiClient.get(
    EVENTS_ENDPOINT,
    buildListQuery({
      'pagination[pageSize]': options.pageSize ?? 200,
      sort: options.sort ?? 'createdAt:asc',
      populate: ['vehicle', 'createdBy', 'organization'],
      filters: { vehicle: { id: { $eq: Number(vehicleId) } } },
    })
  );
  return normalizeStrapiListResponse(response).data;
}

async function appendEvent(vehicleId, eventType, metadata = {}) {
  return strapiClient.post(EVENTS_ENDPOINT, {
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
    const normalized = normalizeStrapiListResponse(response, normalizeVehicle);
    const rows = Array.isArray(normalized.data) ? normalized.data : [];
    const withStatus = await Promise.all(
      rows.map(async (vehicle) => {
        const events = await fetchVehicleEvents(vehicle.id, { pageSize: 100, sort: 'createdAt:asc' });
        const derivedStatus = deriveVehicleStatusFromEvents(events);
        return { ...vehicle, derivedStatus };
      })
    );
    return { ...normalized, data: withStatus };
  },

  async getOne(id, options = {}) {
    const response = await strapiClient.get(`${ENDPOINT}/${id}`, {
      populate: options.populate ?? ['organization', 'createdBy'],
    });
    return normalizeStrapiOneResponse(response, normalizeVehicle);
  },

  async getOneWithLifecycle(id) {
    const vehicleRes = await this.getOne(id, {
      populate: ['organization', 'createdBy'],
    });
    const vehicle = vehicleRes?.data;
    if (!vehicle) return { data: null };
    const events = await fetchVehicleEvents(vehicle.id);
    const orderedEvents = sortVehicleEventsChronological(events);
    const derivedStatus = deriveVehicleStatusFromEvents(orderedEvents);
    return {
      data: {
        ...vehicle,
        events: orderedEvents,
        derivedStatus,
      },
    };
  },

  async create(payload) {
    const response = await strapiClient.post(ENDPOINT, { data: payload });
    const created = normalizeStrapiOneResponse(response, normalizeVehicle).data;
    if (created?.id) {
      await appendEvent(created.id, VEHICLE_EVENT_TYPES.CREATED, {
        note: 'Vehicle created',
      });
    }
    return { data: created, id: created?.id };
  },

  async update(id, payload) {
    const response = await strapiClient.put(`${ENDPOINT}/${id}`, { data: payload });
    return normalizeStrapiOneResponse(response, normalizeVehicle);
  },

  async delete(id) {
    await strapiClient.delete(`${ENDPOINT}/${id}`);
    return {};
  },

  appendEvent,
  fetchVehicleEvents,
};

