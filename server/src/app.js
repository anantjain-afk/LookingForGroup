import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { createClient } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';
import rateLimit from 'express-rate-limit';
import { requestBucket,rateLimitMessage } from './middleware/rate-limit.js';
import userRoutes from './routes/userRoutes.js';
import authRoutes from './routes/auth.routes.js';
import lobbyRoutes from './routes/lobby.routes.js';
import gameRoutes from './routes/game.routes.js';
import tagRoutes from './routes/tag.routes.js';
import { LobbyRealtime } from './socket/lobbyHandler.js';
import { csrfProtection } from './middleware/csrf.js';
import { authenticateSocket, signingSecret } from './services/session.service.js';

export async function createApplication({ sendMail, googleVerifier, catalog, iceProvider, reconnectGraceMs } = {}) {
  signingSecret();
  const app = express();
  app.locals.sendMail = sendMail;
  app.locals.googleVerifier = googleVerifier;
  app.locals.catalog = catalog;
  app.locals.iceProvider = iceProvider;
  app.set('trust proxy', 1);
  const origins = (process.env.CLIENT_URL || 'http://localhost:5173').split(',').map(s => s.trim());
  app.use(helmet());
  app.use(cors({ origin: origins, credentials: true }));
  app.use(express.json({ limit: '32kb' }));
  app.use(cookieParser());
  app.use('/api', csrfProtection);
  app.use('/api', rateLimit({ windowMs: 60_000, limit: 600, keyGenerator:requestBucket, message:rateLimitMessage, standardHeaders: 'draft-7', legacyHeaders: false }));
  const httpServer = createServer(app);
  const io = new Server(httpServer, { cors: { origin: origins, credentials: true }, maxHttpBufferSize: 32_768 });
  let redisClients = [];
  // One Render process uses Socket.IO's in-memory adapter. Redis is opt-in.
  if (process.env.REDIS_ENABLED === 'true') {
    if (!process.env.REDIS_URL) throw new Error('REDIS_URL is required when REDIS_ENABLED=true');
    const pub = createClient({ url: process.env.REDIS_URL, socket: { reconnectStrategy: false } });
    const sub = pub.duplicate();
    redisClients = [pub, sub];
    for (const client of redisClients) client.on('error', () => console.error('Redis connection failed'));
    await Promise.all(redisClients.map(client => client.connect()));
    io.adapter(createAdapter(pub, sub));
  }
  app.set('io', io);
  const realtime = new LobbyRealtime(io, reconnectGraceMs ? { graceMs: reconnectGraceMs } : {});
  app.locals.realtime = realtime;
  io.use(authenticateSocket);
  io.on('connection', socket => {
    socket.join(`session_${socket.data.sessionId}`);
    socket.join(`user_${socket.data.userId}`);
    const expiry = setTimeout(() => socket.disconnect(true), Math.max(0, socket.data.sessionExpiresAt - Date.now()));
    expiry.unref();
    socket.once('disconnect', () => clearTimeout(expiry));
    realtime.bind(socket);
  });
  app.use('/api', userRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/lobbies', lobbyRoutes);
  app.use('/api/games', gameRoutes);
  app.use('/api/tags', tagRoutes);
  app.get('/health', (_req, res) => res.json({ status: 'ok' }));
  app.use((err, req, res, _next) => {
    const status = err.status || (err.type === 'entity.parse.failed' ? 400 : err.code === 'P2002' ? 409 : 500);
    console.error(JSON.stringify({ event: 'request_failed', path: req.path, status, code: err.code || 'INTERNAL_ERROR' }));
    res.status(status).json({ error: { message: status >= 500 ? 'Something went wrong. Please retry.' : err.code === 'P2002' ? 'That value is already in use.' : err.message, code: err.code || 'REQUEST_FAILED' } });
  });
  return { app, io, httpServer, realtime, close: async () => {
    await realtime.stop();
    await new Promise(resolve => io.close(resolve));
    await Promise.all(redisClients.filter(client => client.isOpen).map(client => client.quit()));
  } };
}
