import strapiClient from '../strapiClient';
import { buildListQuery, normalizeStrapiListResponse, normalizeStrapiOneResponse } from './strapiContentApi';

const ENDPOINT = '/warranty-records';

export default {
  async getAll(params = {}) {
    const response = await strapiClient.get(ENDPOINT, buildListQuery(params));
    return normalizeStrapiListResponse(response);
  },

  async create(payload) {
    const response = await strapiClient.post(ENDPOINT, { data: payload });
    return normalizeStrapiOneResponse(response);
  },
};

