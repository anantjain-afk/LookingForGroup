import { randomBytes, createHash } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { z } from 'zod';
import prisma from '../db/config.js';
import { AppError, parse } from '../lib/errors.js';
import { createSession, cookieOptions, sessionCookieName, signToken } from '../services/session.service.js';
import { sendMail, mailConfigured } from '../services/mail.service.js';
import { privateUser } from '../services/auth.service.js';

const email = z.string().trim().email().max(254).transform(value => value.toLowerCase());
const password = z.string().min(10, 'Use at least 10 characters for your password.').refine(value => Buffer.byteLength(value) <= 72, 'Password is too long.');
const digest = value => createHash('sha256').update(value).digest('hex');
const googleClient = new OAuth2Client();
const message = 'If that account exists, an email with the next steps will arrive shortly.';

async function deliverToken(req, user, purpose) {
  const token = randomBytes(32).toString('hex');
  await prisma.$transaction([
    prisma.emailToken.deleteMany({ where: { userId: user.id, purpose } }),
    prisma.emailToken.create({ data: { digest: digest(token), userId: user.id, purpose, expiresAt: new Date(Date.now() + (purpose === 'reset' ? 30 * 60_000 : 24 * 3600_000)) } }),
  ]);
  const base = process.env.PUBLIC_APP_URL || 'http://localhost:5173';
  const url = new URL(purpose === 'reset' ? '/reset-password' : '/verify-email', base);
  // Fragments do not appear in HTTP logs or Referer headers.
  url.hash = token;
  await (req.app.locals.sendMail || sendMail)({ to: user.email, subject: purpose === 'reset' ? 'Reset your password' : 'Verify your email', text: `${purpose === 'reset' ? 'Reset your password' : 'Verify your email'}: ${url}\n\nIf you did not request this, you can ignore this message.` });
}

export async function register(req, res) {
  const data = parse(z.object({ email, username: z.string().trim().min(3).max(20).regex(/^[A-Za-z0-9_]+$/, 'Use letters, numbers, and underscores for your username.'), password }), req.body);
  const existing = await prisma.user.findFirst({ where: { OR: [{ email: { equals: data.email, mode: 'insensitive' } }, { username: data.username }] } });
  if (existing) throw new AppError(409, 'That email or username is already in use.', 'ACCOUNT_EXISTS');
  const user = await prisma.user.create({ data: { ...data, password: await bcrypt.hash(data.password, 12) } });
  let verificationSent = true;
  try { await deliverToken(req, user, 'verify'); } catch { verificationSent = false; }
  await createSession(user.id, res);
  res.status(201).json({ user: await privateUser(user.id), verificationSent });
}
export async function login(req, res) {
  const data = parse(z.object({ email, password: z.string().min(1).max(256) }), req.body);
  const user = await prisma.user.findFirst({ where: { email: { equals: data.email, mode: 'insensitive' } } });
  // A fixed comparison prevents an obvious fast path for missing accounts.
  const valid = await bcrypt.compare(data.password, user?.password || '$2b$12$yHK7OVAFd1XXJPhhCx4zReCBM8S4WdbYkl2QXe1QaYl1VKhByWm1W');
  if (!user?.password || !valid) throw new AppError(401, 'Invalid email or password. Use Google if you registered with Google.', 'INVALID_CREDENTIALS');
  await createSession(user.id, res);
  res.json({ user: await privateUser(user.id) });
}
export async function logout(req, res) {
  await prisma.session.deleteMany({ where: { id: req.session.id } });
  req.app.get('io').in(`session_${req.session.id}`).disconnectSockets(true);
  res.clearCookie(sessionCookieName(), cookieOptions());
  res.clearCookie('token', { ...cookieOptions(), sameSite: 'none' });
  res.json({ message: 'Logged out' });
}
export function config(req, res) {
  res.json({ googleClientId: process.env.GOOGLE_CLIENT_ID || '', emailAvailable: Boolean(req.app.locals.sendMail) || mailConfigured() });
}
export async function google(req, res) {
  const { credential } = parse(z.object({ credential: z.string().min(1).max(10000) }), req.body);
  let payload;
  try {
    if (req.app.locals.googleVerifier) payload = await req.app.locals.googleVerifier(credential);
    else {
      if (!process.env.GOOGLE_CLIENT_ID) throw new AppError(503, 'Google sign-in is not configured.', 'GOOGLE_UNAVAILABLE');
      payload = (await googleClient.verifyIdToken({ idToken: credential, audience: process.env.GOOGLE_CLIENT_ID })).getPayload();
    }
  } catch (error) {
    if (error.status === 503) throw error;
    throw new AppError(401, 'Google sign-in could not be verified. Please try again.', 'GOOGLE_INVALID');
  }
  if (!payload?.sub || !payload.email || !payload.email_verified) throw new AppError(401, 'Please use a Google account with a verified email.', 'GOOGLE_INVALID');
  const googleEmail = payload.email.toLowerCase();
  if (req.path === '/google/link') {
    const { password: supplied } = parse(z.object({ password: z.string().min(1).max(256) }), req.body);
    const current = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (current.email.toLowerCase() !== googleEmail || !current.password || !await bcrypt.compare(supplied, current.password)) throw new AppError(403, 'Sign in with the matching Google account and confirm your current password.', 'LINK_PROOF_REQUIRED');
    if (current.googleSub && current.googleSub !== payload.sub) throw new AppError(409, 'A different Google account is already linked.', 'GOOGLE_ALREADY_LINKED');
    await prisma.user.update({ where: { id: current.id }, data: { googleSub: payload.sub, emailVerifiedAt: (googleEmail.endsWith('@gmail.com') || payload.hd) ? new Date() : current.emailVerifiedAt } });
    return res.json({ user: await privateUser(current.id) });
  }
  let user = await prisma.user.findUnique({ where: { googleSub: payload.sub } });
  if (!user) {
    const existing = await prisma.user.findFirst({ where: { email: { equals: googleEmail, mode: 'insensitive' } } });
    if (existing) throw new AppError(409, 'Sign in with your existing password, then connect Google from your profile.', 'ACCOUNT_LINK_REQUIRED');
    // A generated public handle avoids exposing a legal name or email address.
    user = await prisma.user.create({ data: { email: googleEmail, googleSub: payload.sub, username: `Player_${randomBytes(5).toString('hex')}`, emailVerifiedAt: (googleEmail.endsWith('@gmail.com') || payload.hd) ? new Date() : null } });
    if (!user.emailVerifiedAt) { try { await deliverToken(req, user, 'verify'); } catch { /* Verification can be resent from the banner. */ } }
  }
  await createSession(user.id, res);
  res.json({ user: await privateUser(user.id) });
}
export async function socketTicket(req, res) {
  res.set('Cache-Control', 'no-store').json({ ticket: signToken({ sid: req.session.id }, 'socket', '60s') });
}
export async function resendVerification(req, res) {
  if (!req.app.locals.sendMail && !mailConfigured()) throw new AppError(503, 'Email delivery is unavailable. Please retry later.', 'EMAIL_UNAVAILABLE');
  if (!req.user.emailVerifiedAt) await deliverToken(req, req.user, 'verify');
  res.status(202).json({ message });
}
export async function requestReset(req, res) {
  const data = parse(z.object({ email }), req.body);
  if (!req.app.locals.sendMail && !mailConfigured()) throw new AppError(503, 'Email delivery is unavailable. Please retry later.', 'EMAIL_UNAVAILABLE');
  const user = await prisma.user.findFirst({ where: { email: { equals: data.email, mode: 'insensitive' } } });
  if (user?.password) await deliverToken(req, user, 'reset');
  res.status(202).json({ message });
}
export async function consumeEmailToken(req, res) {
  const purpose = req.path === '/reset-password' ? 'reset' : 'verify';
  const input = parse(z.object({ token: z.string().regex(/^[a-f0-9]{64}$/), password: purpose === 'reset' ? password : z.string().optional() }), req.body);
  const tokenDigest = digest(input.token);
  const newHash = purpose === 'reset' ? await bcrypt.hash(input.password, 12) : undefined;
  const userId = await prisma.$transaction(async tx => {
    const token = await tx.emailToken.findUnique({ where: { digest: tokenDigest } });
    if (!token || token.purpose !== purpose || token.expiresAt <= new Date()) throw new AppError(400, 'That link is expired or has already been used.', 'TOKEN_INVALID');
    const consumed = await tx.emailToken.deleteMany({ where: { digest: tokenDigest, expiresAt: { gt: new Date() } } });
    if (consumed.count !== 1) throw new AppError(400, 'That link has already been used.', 'TOKEN_INVALID');
    await tx.user.update({ where: { id: token.userId }, data: { emailVerifiedAt: new Date(), ...(newHash ? { password: newHash } : {}) } });
    if (purpose === 'reset') await tx.session.deleteMany({ where: { userId: token.userId } });
    return token.userId;
  });
  if (purpose === 'reset') {
    req.app.get('io').in(`user_${userId}`).disconnectSockets(true);
    res.clearCookie(sessionCookieName(), cookieOptions());
  }
  res.json({ message: purpose === 'reset' ? 'Password updated. Please sign in.' : 'Email verified. You can now join and host lobbies.' });
}
