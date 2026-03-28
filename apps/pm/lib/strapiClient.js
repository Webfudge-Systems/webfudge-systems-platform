const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1337';

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
      this.token =
        localStorage.getItem('strapi_token') ||
        localStorage.getItem('auth-token') ||
        localStorage.getItem('xtrawrkx-authToken');
    }
    return this.token;
  }

  removeToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('strapi_token');
    }
  }

  getCurrentOrgId() {
    if (typeof window === 'undefined') return null;
    const id = localStorage.getItem('current-org-id');
    return id ? id : null;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}/api${endpoint}`;
    const token = this.getToken();
    const orgId = this.getCurrentOrgId();

    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...(orgId && { 'X-Organization-Id': orgId }),
        ...options.headers,
      },
      ...options,
    };

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }

      return response;
    } catch (error) {
      console.error(`Strapi API Error (${endpoint}):`, error);
      throw error;
    }
  }

  buildQueryString(params, prefix = '') {
    const parts = [];
    for (const key in params) {
      if (Object.prototype.hasOwnProperty.call(params, key)) {
        const value = params[key];
        const paramKey = prefix ? `${prefix}[${key}]` : key;
        if (value === null || value === undefined) continue;
        else if (typeof value === 'object' && !Array.isArray(value)) {
          parts.push(this.buildQueryString(value, paramKey));
        } else if (Array.isArray(value)) {
          value.forEach((item, index) => {
            if (typeof item === 'object') {
              parts.push(this.buildQueryString(item, `${paramKey}[${index}]`));
            } else {
              parts.push(`${paramKey}[${index}]=${encodeURIComponent(item)}`);
            }
          });
        } else {
          parts.push(`${paramKey}=${encodeURIComponent(value)}`);
        }
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

  async getXtrawrkxUsers(params = {}) {
    const queryParams = {
      'pagination[page]': params['pagination[page]'] ?? params.page ?? 1,
      'pagination[pageSize]': params['pagination[pageSize]'] ?? params.pageSize ?? 25,
      ...(params.populate && { populate: params.populate }),
    };
    return this.get('/users', queryParams);
  }
}

export default new StrapiClient();
