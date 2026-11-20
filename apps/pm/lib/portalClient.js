/**
 * Client portal (W10) API client. Uses the portal session token only — never the team's
 * `auth-token` — so a team login on the same browser cannot leak into the portal or the reverse.
 */

const DEFAULT_API_BASE_URL =
  process.env.NODE_ENV === 'production' ? 'https://api.webfudge.in' : 'http://localhost:1338';
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_BASE_URL;

const TOKEN_KEY = 'wf-portal-token';

export class PortalApiError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function safeStorage() {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

export const getPortalToken = () => safeStorage()?.getItem(TOKEN_KEY) || null;
export const setPortalToken = (token) => safeStorage()?.setItem(TOKEN_KEY, token);
export const clearPortalToken = () => safeStorage()?.removeItem(TOKEN_KEY);

export async function portalRequest(path, { method = 'GET', body } = {}) {
  const token = getPortalToken();
  const res = await fetch(`${API_BASE_URL}/api/portal${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const code = json?.error?.details?.code;
    if (res.status === 401 || res.status === 403) clearPortalToken();
    throw new PortalApiError(res.status, json?.error?.message || 'Something went wrong. Please try again.', code);
  }
  return json?.data;
}

export const fileUrl = (url) => (url && url.startsWith('/') ? `${API_BASE_URL}${url}` : url);
