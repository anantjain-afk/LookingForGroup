import test from "node:test";
import assert from "node:assert/strict";
import proxy from "../../client/api/proxy.js";
import {
  authenticationBucket,
  requestBucket,
} from "../src/middleware/rate-limit.js";
import { signToken } from "../src/services/session.service.js";

test("frontend proxy preserves cookie authentication and CSRF without caching or following redirects", async () => {
  const original = globalThis.fetch;
  const oldOrigin = process.env.API_ORIGIN;
  process.env.API_ORIGIN = "https://api.example.com";
  const response = () => ({
    headers: {},
    setHeader(k, v) {
      this.headers[k] = v;
    },
    status(value) {
      this.code = value;
      return this;
    },
    json(value) {
      this.body = value;
      return this;
    },
    end(value) {
      this.body = value;
    },
  });
  try {
    let forwarded;
    globalThis.fetch = async (url, options) => {
      forwarded = { url, options };
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie":
            "__Host-session=opaque; Secure; HttpOnly; SameSite=Lax; Path=/",
        },
      });
    };
    const res = response();
    await proxy(
      {
        method: "POST",
        query: { path: "auth/login" },
        url: "/api/proxy?path=auth/login&returnTo=%2Fbrowse",
        headers: {
          cookie: "__Host-csrf=token",
          "x-csrf-token": "token",
          origin: "https://looking-for-group.vercel.app",
          "content-type": "application/json",
        },
        body: { email: "user@example.com", password: "example-password" },
      },
      res,
    );
    assert.equal(res.code, 200);
    assert.equal(res.headers["Cache-Control"], "no-store");
    assert.match(
      res.headers["Set-Cookie"][0],
      /__Host-session=.*Secure; HttpOnly/,
    );
    assert.equal(
      forwarded.url.href,
      "https://api.example.com/api/auth/login?returnTo=%2Fbrowse",
    );
    assert.equal(forwarded.options.headers.cookie, "__Host-csrf=token");
    assert.equal(forwarded.options.headers["x-csrf-token"], "token");
    assert.equal(forwarded.options.redirect, "manual");
    assert.equal(JSON.parse(forwarded.options.body).email, "user@example.com");
    const bad = response();
    await proxy(
      {
        method: "GET",
        query: { path: "../secret" },
        url: "/api/proxy",
        headers: {},
      },
      bad,
    );
    assert.equal(bad.code, 400);
    globalThis.fetch = async () => {
      throw new Error("Connection reset");
    };
    const down = response();
    await proxy(
      {
        method: "GET",
        query: { path: "me" },
        url: "/api/proxy?path=me",
        headers: {},
      },
      down,
    );
    assert.equal(down.code, 503);
    assert.equal(down.body.error.code, "NETWORK_ERROR");
  } finally {
    globalThis.fetch = original;
    if (oldOrigin === undefined) delete process.env.API_ORIGIN;
    else process.env.API_ORIGIN = oldOrigin;
  }
});

test("rate buckets distinguish users behind one proxy and normalize account targets", () => {
  const req = {
    cookies: {},
    ip: "127.0.0.1",
    body: { email: " User@Example.com " },
  };
  assert.equal(
    authenticationBucket(req),
    authenticationBucket({ ...req, body: { email: "user@example.com" } }),
  );
  assert.notEqual(
    authenticationBucket(req),
    authenticationBucket({ ...req, body: { email: "other@example.com" } }),
  );
  const first = requestBucket({
    ...req,
    cookies: { session: signToken({ sid: "one" }, "session", "1h") },
  });
  const second = requestBucket({
    ...req,
    cookies: { session: signToken({ sid: "two" }, "session", "1h") },
  });
  assert.notEqual(first, second);
  assert.notEqual(
    first,
    requestBucket({ ...req, cookies: { session: "spoofed" } }),
  );
});
