// Keep browser API cookies on the frontend origin. Socket.IO connects directly
// to the backend using a short-lived ticket instead of a third-party cookie.
import { BACKEND_ORIGIN } from '../deployment.js';
export default async function proxy(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const origin = process.env.API_ORIGIN || process.env.VITE_SOCKET_URL || BACKEND_ORIGIN;
  if (!origin || !/^https:\/\/[^/]+\/?$/.test(origin)) {
    return res.status(503).json({ error: { message: 'The server is temporarily unavailable.', code: 'API_UNAVAILABLE' } });
  }
  const path = req.query.path;
  if (typeof path !== 'string' || !/^[A-Za-z0-9/_-]+$/.test(path)) return res.status(400).json({ error: { message: 'Invalid API path.' } });
  const target = new URL(`/api/${path}`, origin);
  const query = new URL(req.url, 'https://proxy.invalid').searchParams;
  query.delete('path'); target.search = query.toString();
  const headers = {};
  for (const key of ['cookie', 'content-type', 'x-csrf-token', 'origin']) if (req.headers[key]) headers[key] = req.headers[key];
  try {
    const upstream = await fetch(target, { method: req.method, headers, redirect: 'manual', signal: AbortSignal.timeout(110_000), ...(!['GET', 'HEAD'].includes(req.method) ? { body: typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {}) } : {}) });
    res.status(upstream.status);
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json');
    const cookies = upstream.headers.getSetCookie();
    if (cookies.length) res.setHeader('Set-Cookie', cookies);
    const retry = upstream.headers.get('retry-after'); if (retry) res.setHeader('Retry-After', retry);
    res.end(Buffer.from(await upstream.arrayBuffer()));
  } catch { res.status(503).json({ error: { message: 'The server may be waking up. Please retry shortly.', code: 'NETWORK_ERROR' } }); }
}
