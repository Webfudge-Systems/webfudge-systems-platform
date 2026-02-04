// Use environment variable for API URL, fallback to localhost for development
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1337';

class StrapiClient {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.token = null;
  }

  /**
   * Set authentication token
   */
  setToken(token) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('strapi_token', token);
    }
  }

  /**
   * Get authentication token
   */
  getToken() {
    if (this.token) return this.token;
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('strapi_token');
    }
    return this.token;
  }

  /**
   * Remove authentication token
   */
  removeToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('strapi_token');
    }
  }

  /**
   * Make authenticated request
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}/api${endpoint}`;
    const token = this.getToken();

    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
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
        console.error(`API Error ${response.status} for ${url}:`, errorData);
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

  /**
   * Helper function to build Strapi query string from nested objects
   */
  buildQueryString(params, prefix = '') {
    const parts = [];

    for (const key in params) {
      if (params.hasOwnProperty(key)) {
        const value = params[key];
        const paramKey = prefix ? `${prefix}[${key}]` : key;

        if (value === null || value === undefined) {
          continue;
        } else if (typeof value === 'object' && !Array.isArray(value)) {
          // Recursively build nested objects
          parts.push(this.buildQueryString(value, paramKey));
        } else if (Array.isArray(value)) {
          // Handle arrays
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

  /**
   * GET request
   */
  async get(endpoint, params = {}) {
    const queryString = this.buildQueryString(params);
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    return this.request(url, { method: 'GET' });
  }

  /**
   * POST request
   */
  async post(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: data,
    });
  }

  /**
   * PUT request
   */
  async put(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: data,
    });
  }

  /**
   * DELETE request
   */
  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
}

export default new StrapiClient();
