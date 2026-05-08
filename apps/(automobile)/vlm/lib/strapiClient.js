const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === 'production' ? 'https://api.webfudge.in' : 'http://localhost:1337');

class StrapiClient {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.token = null;
  }

  setToken(token) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('strapi_token', token);
    }
  }

  getToken() {
    if (this.token) return this.token;
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('strapi_token') || localStorage.getItem('auth-token');
    }
    return this.token;
  }

  getCurrentOrgId() {
    if (typeof window === 'undefined') return null;
    const id = localStorage.getItem('current-org-id');
    return id || null;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}/api${endpoint}`;
    const token = this.getToken();
    const orgId = this.getCurrentOrgId();
    const { headers: optionHeaders, body, ...rest } = options;

    const config = {
      method: 'GET',
      ...rest,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...(orgId && { 'X-Organization-Id': orgId }),
        ...(optionHeaders && typeof optionHeaders === 'object' ? optionHeaders : {}),
      },
    };

    if (body !== undefined && body !== null) {
      const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
      if (typeof body === 'string' || isFormData) config.body = body;
      else config.body = JSON.stringify(body);
    }

    const response = await fetch(url, config);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) return response.json();
    return response;
  }

  buildQueryString(params, prefix = '') {
    const parts = [];
    for (const key in params) {
      if (!Object.prototype.hasOwnProperty.call(params, key)) continue;
      const value = params[key];
      const paramKey = prefix ? `${prefix}[${key}]` : key;
      if (value === null || value === undefined) continue;
      if (typeof value === 'object' && !Array.isArray(value)) {
        parts.push(this.buildQueryString(value, paramKey));
      } else if (Array.isArray(value)) {
        value.forEach((item, index) => {
          if (typeof item === 'object') parts.push(this.buildQueryString(item, `${paramKey}[${index}]`));
          else parts.push(`${paramKey}[${index}]=${encodeURIComponent(item)}`);
        });
      } else {
        parts.push(`${paramKey}=${encodeURIComponent(value)}`);
      }
    }
    return parts.filter(Boolean).join('&');
  }

  async get(endpoint, params = {}) {
    const queryString = this.buildQueryString(params);
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    return this.request(url, { method: 'GET' });
  }

  async post(endpoint, data = {}) {
    return this.request(endpoint, { method: 'POST', body: data });
  }

  async put(endpoint, data = {}) {
    return this.request(endpoint, { method: 'PUT', body: data });
  }

  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
}

const strapiClient = new StrapiClient();
export default strapiClient;

