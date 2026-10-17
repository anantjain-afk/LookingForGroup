import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { start, browser, prisma, clearDatabase, assertSafe } from './helpers.js';

test('password sessions, verification, single-use reset, Google linking, and CSRF', async () => {
 await clearDatabase();
 const inbox = [];
 const runtime = await start({ sendMail: async mail => inbox.push(mail), googleVerifier: async token => {
   if (token === 'invalid') throw new Error('invalid');
   return { sub: token, email: token === 'existing' ? 'player@example.com' : 'google@gmail.com', email_verified: true };
 } });
 try {
 const client = browser(runtime.base);
 assert.equal((await client.call('/api/auth/register', {method:'POST', raw:true, body:{}})).status, 403);
 const registration = await client.call('/api/auth/register', { method:'POST', body:{email:'Player@Example.com',username:'Player',password:'correct horse battery'} });
 assert.equal(registration.status,201); assertSafe(registration.body); assert.equal(inbox.length,1);
 const verification = new URL(inbox[0].text.split('\n')[0].split(': ').slice(1).join(': ')).hash.slice(1);
 assert.equal((await client.call('/api/auth/socket-ticket',{method:'POST'})).status,403);
 assert.equal((await client.call('/api/auth/verify-email',{method:'POST',body:{token:verification}})).status,200);
 assert.equal((await client.call('/api/auth/verify-email',{method:'POST',body:{token:verification}})).status,400);
 const me = await client.call('/api/me'); assert.equal(me.status,200); assertSafe(me.body);
 const ticket = await client.call('/api/auth/socket-ticket',{method:'POST'}); assert.equal(ticket.status,200);
 assert.equal((await client.call('/api/auth/google',{method:'POST',body:{credential:'existing'}})).status,409);
 assert.equal((await client.call('/api/auth/google/link',{method:'POST',body:{credential:'existing',password:'wrong'}})).status,403);
 assert.equal((await client.call('/api/auth/google/link',{method:'POST',body:{credential:'existing',password:'correct horse battery'}})).status,200);
 assert.equal((await client.call('/api/auth/google',{method:'POST',body:{credential:'invalid'}})).status,401);
 assert.equal((await client.call('/api/auth/forgot-password',{method:'POST',body:{email:'player@example.com'}})).status,202);
 const reset = new URL(inbox.at(-1).text.split('\n')[0].split(': ').slice(1).join(': ')).hash.slice(1);
 assert.equal((await client.call('/api/auth/reset-password',{method:'POST',body:{token:reset,password:'new correct horse password'}})).status,200);
 assert.equal((await client.call('/api/me')).status,401);
 assert.equal((await client.call('/api/auth/reset-password',{method:'POST',body:{token:reset,password:'new correct horse password'}})).status,400);
 assert.equal((await client.call('/api/auth/login',{method:'POST',body:{email:'PLAYER@example.com',password:'new correct horse password'}})).status,200);
 assert.equal((await client.call('/api/auth/logout',{method:'POST'})).status,200);
 assert.equal((await client.call('/api/me')).status,401);
 const google = browser(runtime.base);
 const signIn = await google.call('/api/auth/google',{method:'POST',body:{credential:'new-google'}});
 assert.equal(signIn.status,200); assertSafe(signIn.body); assert.equal(signIn.body.user.googleLinked,true);
 const row = await prisma.user.findUnique({where:{id:signIn.body.user.id}}); assert.equal(row.password,null);
 const expired = 'a'.repeat(64);
 await prisma.emailToken.create({data:{digest:createHash('sha256').update(expired).digest('hex'),purpose:'verify',userId:row.id,expiresAt:new Date(0)}});
 assert.equal((await google.call('/api/auth/verify-email',{method:'POST',body:{token:expired}})).status,400);
 } finally { await runtime.close(); await prisma.$disconnect(); }
});
