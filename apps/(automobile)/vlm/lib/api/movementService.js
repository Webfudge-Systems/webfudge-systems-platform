import strapiClient from '../strapiClient';
import { buildListQuery, normalizeStrapiListResponse } from './strapiContentApi';

export default {
  async getEventsByVehicle(vehicleId, params = {}) {
    const response = await strapiClient.get(
      '/vehicle-events',
      buildListQuery({
        ...params,
        sort: params.sort ?? 'createdAt:asc',
        filters: {
          ...(params.filters || {}),
          vehicle: { id: { $eq: Number(vehicleId) } },
        },
      })
    );
    return normalizeStrapiListResponse(response);
  },
};

