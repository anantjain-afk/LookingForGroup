import { BACKEND_ORIGIN } from '../../deployment';
// HTTP requests must use Vercel's same-origin proxy so session cookies work
// even if an older deployment still has VITE_API_URL set to Render.
const API_BASE_URL = '';
export const SOCKET_BASE_URL = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3000' : BACKEND_ORIGIN);
export class ApiError extends Error {
  constructor(message, status, code) { super(message); this.status = status; this.code = code; }
}
let csrfPromise;
async function csrfToken() {
  if (!csrfPromise) csrfPromise = fetch(`${API_BASE_URL}/api/auth/csrf`, { credentials: 'include' })
    .then(async response => { if (!response.ok) throw new Error('Server unavailable'); return (await response.json()).csrfToken; })
    .catch(error => { csrfPromise = null; throw error; });
  return csrfPromise;
}
export async function apiFetch(endpoint, options = {}, retryCsrf = true) {
  const method = options.method || 'GET';
  const mutation = !['GET', 'HEAD'].includes(method);
  try {
    const headers = { ...(mutation ? { 'Content-Type': 'application/json', 'X-CSRF-Token': await csrfToken() } : {}), ...options.headers };
    const response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, method, headers, credentials: 'include' });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = typeof body.error === 'string' ? body.error : body.error?.message || body.message || 'Request failed. Please retry.';
      const code = body.error?.code;
      if (code === 'CSRF_INVALID' && retryCsrf) { csrfPromise = null; return apiFetch(endpoint, options, false); }
      throw new ApiError(message, response.status, code);
    }
    return body;
  } catch (error) {
    if (error instanceof ApiError || error.name === 'AbortError') throw error;
    throw new ApiError('The server may be waking up or unavailable. Please retry shortly.', 0, 'NETWORK_ERROR');
  }
}
export const apiGet = (endpoint, options) => apiFetch(endpoint, { ...options, method: 'GET' });
const write = method => (endpoint, data, options) => apiFetch(endpoint, { ...options, method, body: JSON.stringify(data ?? {}) });
export const apiPost = write('POST');
export const apiPut = write('PUT');
export const apiPatch = write('PATCH');
export const apiDelete = (endpoint, options) => apiFetch(endpoint, { ...options, method: 'DELETE' });
export default API_BASE_URL;
