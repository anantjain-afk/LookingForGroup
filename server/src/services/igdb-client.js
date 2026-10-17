import axios from 'axios';
import { setTimeout as delay } from 'node:timers/promises';
import { AppError } from '../lib/errors.js';

export class IgdbClient {
  token = null;
  expires = 0;
  tokenPromise = null;
  queue = Promise.resolve();
  nextRequest = 0;
  pending = 0;
  async accessToken() {
    if (this.token && this.expires > Date.now()) return this.token;
    if (!this.tokenPromise) this.tokenPromise = (async () => {
      if (!process.env.IGDB_CLIENT_ID || !process.env.IGDB_CLIENT_SECRET) throw new AppError(503, 'Game discovery is temporarily unavailable.', 'CATALOG_UNAVAILABLE');
      const { data } = await axios.post('https://id.twitch.tv/oauth2/token', null, { params: { client_id: process.env.IGDB_CLIENT_ID, client_secret: process.env.IGDB_CLIENT_SECRET, grant_type: 'client_credentials' }, timeout: 10_000 });
      this.token = data.access_token; this.expires = Date.now() + (data.expires_in - 60) * 1000;
      return this.token;
    })().finally(() => { this.tokenPromise = null; });
    return this.tokenPromise;
  }
  request(endpoint, query) {
    if (this.pending >= 64) return Promise.reject(new AppError(503, 'Game discovery is busy. Please retry shortly.', 'CATALOG_BUSY'));
    this.pending++;
    const pending = this.queue.then(async () => {
      for (let attempt = 0; attempt < 3; attempt++) {
        await delay(Math.max(0, this.nextRequest - Date.now()));
        this.nextRequest = Date.now() + 350; // Stay below IGDB's 4 requests/second.
        try {
          const token = await this.accessToken();
          return (await axios.post(`https://api.igdb.com/v4/${endpoint}`, query, { headers: { 'Client-ID': process.env.IGDB_CLIENT_ID, Authorization: `Bearer ${token}`, Accept: 'application/json' }, timeout: 12_000 })).data;
        } catch (error) {
          if (error.response?.status === 401 && attempt === 0) { this.token = null; continue; }
          if (error.response?.status === 429 && attempt < 2) { await delay(Math.min(Number(error.response.headers['retry-after'] || 1), 3) * 1000); continue; }
          console.error(JSON.stringify({ event: 'igdb_request_failed', endpoint, status: error.response?.status || null, code: error.code || 'UPSTREAM_ERROR' }));
          throw new AppError(503, 'Game discovery is temporarily unavailable. Please retry.', 'CATALOG_UNAVAILABLE');
        }
      }
    });
    const result = pending.finally(() => { this.pending--; });
    this.queue = result.catch(() => {});
    return result;
  }
}
