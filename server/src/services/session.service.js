import jwt from 'jsonwebtoken';
import prisma from '../db/config.js';
import { AppError } from '../lib/errors.js';

export const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000;
export const userSelect = { id: true, email: true, username: true, avatar: true, bio: true, karmaScore: true, createdAt: true, updatedAt: true, emailVerifiedAt: true };
export const sessionCookieName = () => process.env.NODE_ENV === 'production' ? '__Host-session' : 'session';
export const cookieOptions = () => ({ httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/' });
export function signingSecret() {
  const value = process.env.JWT_SECRET;
  if (!value || value.length < 32) throw new Error('JWT_SECRET must contain at least 32 characters');
  return value;
}
export function signToken(payload, audience, expiresIn) {
  return jwt.sign(payload, signingSecret(), { audience, issuer: 'lfg', expiresIn, algorithm: 'HS256' });
}
export function verifySignedToken(token, audience) {
  try { return jwt.verify(token, signingSecret(), { audience, issuer: 'lfg', algorithms: ['HS256'] }); }
  catch { throw new AppError(401, 'Your session has expired. Please sign in again.', 'UNAUTHENTICATED'); }
}
export async function createSession(userId, res) {
  const session = await prisma.session.create({ data: { userId, expiresAt: new Date(Date.now() + SESSION_DURATION) } });
  res.cookie(sessionCookieName(), signToken({ sid: session.id }, 'session', '7d'), { ...cookieOptions(), maxAge: SESSION_DURATION });
  return session;
}
export async function findSession(id) {
  if (typeof id !== 'string') throw new AppError(401, 'Please sign in.', 'UNAUTHENTICATED');
  const session = await prisma.session.findUnique({ where: { id }, include: { user: { select: userSelect } } });
  if (!session || session.expiresAt <= new Date()) throw new AppError(401, 'Your session has expired. Please sign in again.', 'UNAUTHENTICATED');
  return session;
}
export async function authenticateSocket(socket, next) {
  try {
    const payload = verifySignedToken(socket.handshake.auth?.ticket, 'socket');
    const session = await findSession(payload.sid);
    socket.data.sessionId = session.id;
    socket.data.userId = session.userId;
    socket.data.user = session.user;
    socket.data.sessionExpiresAt = session.expiresAt;
    next();
  } catch (error) { next(new Error(error.status === 401 ? error.message : 'Authentication unavailable. Please retry.')); }
}
