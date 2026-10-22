/** Strapi API base URL (no trailing slash). Backend default port is 1338. */
export const STRAPI_API_URL = (
  process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://localhost:1338'
).replace(/\/$/, '');

/** Browser-side API base — same-origin proxy avoids CORS. */
export const STRAPI_BROWSER_API_BASE = '/api/backend';

/** Server-side full API prefix */
export const STRAPI_SERVER_API_BASE = `${STRAPI_API_URL}/api`;

export function getStrapiApiBase() {
  if (typeof window !== 'undefined') {
    return STRAPI_BROWSER_API_BASE;
  }
  return STRAPI_SERVER_API_BASE;
}
