// Stateless CSRF state for the GitHub OAuth handshake. We sign a random nonce
// with the session secret and store the signed value in an httpOnly cookie.
// On the callback we verify the cookie matches the `state` query param and
// the HMAC is intact. No DB row needed.

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { getOAuthConfig } from "./github";

const STATE_COOKIE = "meepo_oauth_state";
const STATE_MAX_AGE_SECONDS = 10 * 60;

export const OAUTH_STATE_COOKIE = STATE_COOKIE;

function sign(nonce: string, secret: string): string {
  return createHmac("sha256", secret).update(nonce).digest("hex");
}

export function issueState(secret: string = getOAuthConfig().sessionSecret): string {
  const nonce = randomBytes(16).toString("hex");
  const sig = sign(nonce, secret);
  return `${nonce}.${sig}`;
}

export function verifyState(
  candidate: string,
  cookie: string,
  secret: string = getOAuthConfig().sessionSecret,
): boolean {
  if (!candidate || !cookie || candidate !== cookie) return false;
  const [nonce, sig] = candidate.split(".");
  if (!nonce || !sig) return false;
  const expected = sign(nonce, secret);
  try {
    const a = Buffer.from(sig, "hex");
    const b = Buffer.from(expected, "hex");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function stateCookieMaxAge(): number {
  return STATE_MAX_AGE_SECONDS;
}
