import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/**
 * Stateless admin session token: "<expiresAtMs>.<hmac>". The HMAC key is
 * derived from the secret, so changing ADMIN_PASSWORD (or
 * ADMIN_SESSION_SECRET) signs everyone out.
 */
export const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

function key(secret: string) {
  return createHash("sha256").update(`shanvis-admin-session:${secret}`).digest();
}

function sign(expiresAt: number, secret: string) {
  return createHmac("sha256", key(secret)).update(String(expiresAt)).digest("hex");
}

export function createSessionToken(secret: string, now = Date.now()) {
  const expiresAt = now + SESSION_TTL_MS;
  return `${expiresAt}.${sign(expiresAt, secret)}`;
}

export function verifySessionToken(token: string | undefined, secret: string, now = Date.now()) {
  if (!token) return false;
  const [exp, mac] = token.split(".");
  const expiresAt = Number(exp);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= now || !mac || !/^[0-9a-f]{64}$/.test(mac)) return false;
  return timingSafeEqual(Buffer.from(mac, "hex"), Buffer.from(sign(expiresAt, secret), "hex"));
}

/** Constant-time password check (hashing first equalises lengths). */
export function passwordMatches(input: string, expected: string) {
  const a = createHash("sha256").update(input).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}
