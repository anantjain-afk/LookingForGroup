import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
const url = process.env.TEST_DATABASE_URL;
if (!url) throw new Error('Set TEST_DATABASE_URL to a disposable local database named lfg_test*. Production DATABASE_URL is never used by this runner.');
const parsed = new URL(url);
if (!['127.0.0.1', 'localhost'].includes(parsed.hostname) || !parsed.pathname.startsWith('/lfg_test')) throw new Error('Tests require a disposable local lfg_test* database.');
const env = { ...process.env, DATABASE_URL: url, NODE_ENV: 'test', JWT_SECRET: 'test-only-signing-secret-with-more-than-32-characters', CLIENT_URL: 'http://localhost:5173', PUBLIC_APP_URL: 'http://localhost:5173', REDIS_ENABLED: 'false', IGDB_CLIENT_ID: '', IGDB_CLIENT_SECRET: '', GOOGLE_CLIENT_ID: '', BREVO_API_KEY: '', MAIL_FROM_EMAIL: '', METERED_APP_NAME: '', METERED_API_KEY: '' };
const files = readdirSync('test').filter(name => name.endsWith('.test.js')).map(name => `test/${name}`);
for (const [command, args] of [['npx', ['prisma', 'migrate', 'deploy']], [process.execPath, ['--test', '--test-concurrency=1', ...files]]]) {
 const result = spawnSync(command, args, { env, stdio: 'inherit' });
 if (result.status !== 0) process.exit(result.status || 1);
}
