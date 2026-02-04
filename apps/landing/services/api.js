/**
 * Landing App API Service
 * Handles non-auth API calls (apps, organizations, profile)
 * For authentication, use AuthService from @webfudge/auth
 */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1337';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  /**
   * Base request method with auth token handling
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null;

    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        const errorPayload = data.error || data;
        const message = errorPayload?.message || data.message || 'Request failed';
        const err = new Error(message);
        const field = errorPayload?.details?.field ?? errorPayload?.field;
        if (field != null) {
          err.field = field;
        }
        throw err;
      }

      return data;
    } catch (error) {
      console.error('API Request Error:', error);
      throw error;
    }
  }

  // User endpoints
  async getMe() {
    return this.request('/api/auth/me');
  }

  async updateProfile(userData) {
    return this.request('/api/users/me', {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  // Apps endpoints
  async getApps(category = null) {
    const query = category ? `?category=${category}` : '';
    return this.request(`/api/apps${query}`);
  }

  async getAppModules(appSlug) {
    return this.request(`/api/apps/${appSlug}/modules`);
  }

  async calculatePricing(appId, moduleIds, userCount) {
    return this.request('/api/apps/calculate-pricing', {
      method: 'POST',
      body: JSON.stringify({ appId, moduleIds, userCount }),
    });
  }

  // Organization endpoints
  async createOrganization(data) {
    return this.request('/api/organizations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async addAppToOrganization(organizationId, data) {
    return this.request(`/api/organizations/${organizationId}/add-app`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getOrganization(id) {
    return this.request(`/api/organizations/${id}`);
  }
}

export default new ApiService();
