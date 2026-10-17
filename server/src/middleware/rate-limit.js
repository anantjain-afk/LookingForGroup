import { createHash } from "node:crypto";
import { ipKeyGenerator } from "express-rate-limit";
import {
  sessionCookieName,
  verifySignedToken,
} from "../services/session.service.js";

// Vercel proxies many users through shared egress addresses. Use verified
// session identifiers for signed-in traffic and retain an IP bucket for guests.
export function requestBucket(req) {
  try {
    const { sid } = verifySignedToken(
      req.cookies?.[sessionCookieName()],
      "session",
    );
    if (typeof sid === "string") return `session:${sid}`;
  } catch {}
  return `ip:${ipKeyGenerator(req.ip)}`;
}
// Account-target limits prevent credential guessing without treating every
// anonymous user arriving through the same frontend proxy as one person.
export function authenticationBucket(req) {
  const email = req.body?.email;
  if (typeof email === "string" && email.length <= 254)
    return `account:${createHash("sha256").update(email.trim().toLowerCase()).digest("hex")}`;
  if (req.path === "/google" && typeof req.body?.credential === "string")
    return `google:${createHash("sha256").update(req.body.credential).digest("hex")}`;
  return requestBucket(req);
}
export const rateLimitMessage = {
  error: {
    message: "Too many attempts. Please try again shortly.",
    code: "RATE_LIMITED",
  },
};
