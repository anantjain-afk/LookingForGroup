/**
 * API Configuration
 * Central configuration for all API requests
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

/**
 * Fetch wrapper with base URL
 * @param {string} endpoint - API endpoint (e.g., '/api/me')
 * @param {object} options - Fetch options (method, body, headers, etc.)
 * @returns {Promise<Response>}
 */
export const apiFetch = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;

  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: "include", // Include cookies in requests
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: response.statusText }));
    throw new Error(error.message || "API request failed");
  }

  return response.json();
};

/**
 * GET request helper
 */
export const apiGet = (endpoint, options = {}) =>
  apiFetch(endpoint, { method: "GET", ...options });

/**
 * POST request helper
 */
export const apiPost = (endpoint, data, options = {}) =>
  apiFetch(endpoint, {
    method: "POST",
    body: JSON.stringify(data),
    ...options,
  });

/**
 * PUT request helper
 */
export const apiPut = (endpoint, data, options = {}) =>
  apiFetch(endpoint, { method: "PUT", body: JSON.stringify(data), ...options });

/**
 * PATCH request helper
 */
export const apiPatch = (endpoint, data, options = {}) =>
  apiFetch(endpoint, {
    method: "PATCH",
    body: JSON.stringify(data),
    ...options,
  });

/**
 * DELETE request helper
 */
export const apiDelete = (endpoint, options = {}) =>
  apiFetch(endpoint, { method: "DELETE", ...options });

export default API_BASE_URL;
