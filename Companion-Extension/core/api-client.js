// Companion Extension - API Client Wrapper
// Handles HTTP requests to the backend server with dynamic auth/identity headers

import { ClientManager } from './client-manager.js';

export class ApiClient {
  /**
   * Helper to perform fetch requests with configured headers
   * @param {string} endpoint - API path, e.g. '/api/connectors/jobs'
   * @param {Object} options - Standard fetch options
   */
  static async request(endpoint, options = {}) {
    const settings = await ClientManager.getSettings();
    const serverUrl = settings.server_url.replace(/\/$/, ''); // strip trailing slash
    const url = `${serverUrl}${endpoint}`;

    const headers = {
      ...options.headers,
    };

    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    // Attach identity headers
    if (settings.api_key) {
      headers['Authorization'] = `Bearer ${settings.api_key}`;
    }
    if (settings.client_id) {
      headers['X-Client-Id'] = settings.client_id;
    }
    if (settings.runtime_name) {
      headers['X-Runtime-Name'] = settings.runtime_name; // Forward compatibility
    }

    const fetchOptions = {
      ...options,
      headers,
    };

    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`API Request failed (${response.status}): ${errorText}`);
    }

    return response.json();
  }

  static async get(endpoint, headers = {}) {
    return ApiClient.request(endpoint, { method: 'GET', headers });
  }

  static async post(endpoint, body, headers = {}) {
    return ApiClient.request(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });
  }

  static async patch(endpoint, body, headers = {}) {
    return ApiClient.request(endpoint, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(body)
    });
  }

  static async delete(endpoint, headers = {}) {
    return ApiClient.request(endpoint, { method: 'DELETE', headers });
  }
}
