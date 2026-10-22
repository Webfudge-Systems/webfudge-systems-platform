/**
 * Lightweight Strapi API client for apps/docs.
 *
 * Browser requests use /api/backend (same-origin proxy) to avoid CORS.
 * Admin mutations attach the Strapi JWT (auth-token) when signed in.
 */

import { getStrapiApiBase } from './strapiConfig';

async function getAuthToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth-token') || localStorage.getItem('strapi_token') || null;
}

function formatFetchError(err, url) {
  if (err?.message === 'Failed to fetch' || err?.name === 'TypeError') {
    return new Error(
      `Cannot reach the API (${url}). Ensure the Strapi backend is running on port 1338: cd apps/backend && npm run dev`
    );
  }
  return err;
}

async function parseErrorResponse(res) {
  const text = await res.text().catch(() => res.statusText);
  try {
    const json = JSON.parse(text);
    const message = json?.error?.message || json?.message || text;
    return `Strapi ${res.status}: ${message}`;
  } catch {
    return `Strapi ${res.status}: ${text}`;
  }
}

async function request(path, options = {}) {
  const url = `${getStrapiApiBase()}${path}`;
  const token = await getAuthToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  let res;
  try {
    res = await fetch(url, { ...options, headers });
  } catch (err) {
    throw formatFetchError(err, url);
  }

  if (!res.ok) {
    throw new Error(await parseErrorResponse(res));
  }

  return res.json();
}

async function requestFormData(path, formData) {
  const url = `${getStrapiApiBase()}${path}`;
  const token = await getAuthToken();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  let res;
  try {
    res = await fetch(url, { method: 'POST', headers, body: formData });
  } catch (err) {
    throw formatFetchError(err, url);
  }

  if (!res.ok) {
    throw new Error(await parseErrorResponse(res));
  }

  return res.json();
}

export const strapiClient = {
  get: (path, query = {}) => {
    const qs = new URLSearchParams(
      Object.entries(query)
        .filter(([, v]) => v != null && v !== '')
        .map(([k, v]) => [k, String(v)])
    ).toString();
    return request(`${path}${qs ? `?${qs}` : ''}`);
  },

  post: (path, body) =>
    request(path, { method: 'POST', body: JSON.stringify({ data: body }) }),

  put: (path, body) =>
    request(path, { method: 'PUT', body: JSON.stringify({ data: body }) }),

  delete: (path) =>
    request(path, { method: 'DELETE' }),

  postForm: (path, formData) =>
    requestFormData(path, formData),
};

export default strapiClient;
