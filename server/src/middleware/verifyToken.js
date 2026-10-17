import { findSession, verifySignedToken, sessionCookieName } from '../services/session.service.js';
import { AppError } from '../lib/errors.js';
/**
 * Middleware to verify JWT token from cookies
 * Protects routes that require authentication
 */
export const verifyToken = async (req, res, next) => {
  try {
    const payload = verifySignedToken(req.cookies[sessionCookieName()], 'session');
    req.session = await findSession(payload.sid);
    req.user = req.session.user;
    res.set('Cache-Control', 'no-store');
    next();
  } catch (error) { next(error); }
};
export function requireVerified(req, _res, next) {
  if (!req.user?.emailVerifiedAt) return next(new AppError(403, 'Verify your email before joining or hosting a lobby.', 'EMAIL_UNVERIFIED'));
  next();
}
