import assert from 'node:assert/strict';
import prisma from '../src/db/config.js';
import { createApplication } from '../src/app.js';

export { prisma };
export async function start(options = {}) {
  const runtime = await createApplication(options);
  await new Promise(resolve => runtime.httpServer.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${runtime.httpServer.address().port}`;
  return { ...runtime, base };
}
export function browser(base) {
  const cookies = new Map();
  let csrf;
  async function call(path, { method = 'GET', body, raw = false } = {}) {
    if (method !== 'GET' && !csrf && !raw) csrf = (await call('/api/auth/csrf')).body.csrfToken;
    const response = await fetch(base + path, { method, headers: { Origin: 'http://localhost:5173', Cookie: [...cookies].map(([k,v]) => `${k}=${v}`).join('; '), ...(body ? { 'Content-Type': 'application/json' } : {}), ...(csrf && !raw ? { 'X-CSRF-Token': csrf } : {}) }, body: body ? JSON.stringify(body) : undefined });
    for (const header of response.headers.getSetCookie()) { const [pair] = header.split(';'); const index = pair.indexOf('='); cookies.set(pair.slice(0,index),pair.slice(index+1)); }
    return { status: response.status, body: await response.json() };
  }
  return { call, cookies };
}
export function assertSafe(value) {
 const json = JSON.stringify(value);
 assert.equal(json.includes('"password"'), false);
 assert.equal(json.includes('"googleSub"'), false);
 assert.equal(json.includes('"digest"'), false);
}
export async function clearDatabase({ preserveTags = false } = {}) {
  if (!new URL(process.env.DATABASE_URL).pathname.startsWith('/lfg_test')) throw new Error('Refusing to clear a non-test database');
  await prisma.lobbyTag.deleteMany(); await prisma.lobbyParticipant.deleteMany(); await prisma.lobby.deleteMany();
  await prisma.emailToken.deleteMany(); await prisma.session.deleteMany(); await prisma.user.deleteMany(); await prisma.game.deleteMany();
  if (!preserveTags) await prisma.tag.deleteMany();
}
