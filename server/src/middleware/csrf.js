import { randomBytes, timingSafeEqual } from 'node:crypto';
import { cookieOptions } from '../services/session.service.js';
import { AppError } from '../lib/errors.js';

const name = () => process.env.NODE_ENV === 'production' ? '__Host-csrf' : 'csrf';
export function issueCsrf(req, res) {
  const token = req.cookies[name()] || randomBytes(32).toString('hex');
  res.cookie(name(), token, { ...cookieOptions(), httpOnly: false, maxAge: 7 * 86400_000 });
  res.set('Cache-Control', 'no-store').json({ csrfToken: token });
}
export function csrfProtection(req, _res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const allowed = (process.env.CLIENT_URL || 'http://localhost:5173').split(',').map(s => s.trim());
  const origin = req.get('origin');
  const cookie = req.cookies[name()];
  const header = req.get('x-csrf-token');
  if ((origin && !allowed.includes(origin)) || !/^[a-f0-9]{64}$/.test(cookie || '') || !/^[a-f0-9]{64}$/.test(header || '') || !timingSafeEqual(Buffer.from(cookie), Buffer.from(header))) {
    return next(new AppError(403, 'Please reload the page and try again.', 'CSRF_INVALID'));
  }
  next();
}
