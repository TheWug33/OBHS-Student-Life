// ══════════════════════════════════════════════════════════════
// Shared by middleware.js and api/auth/login.js — this is the part
// that makes the password gate a REAL gate instead of a fake one.
//
// The cookie isn't just a static "yes, logged in" flag (if it were,
// anyone could set that exact same cookie themselves in their
// browser's dev tools and walk straight in, no password needed).
// Instead, the cookie's value is signed with a secret key that only
// this server knows (FACULTY_AUTH_SECRET, set in Vercel — see
// below). Middleware re-computes that signature on every request
// and only lets someone through if it matches. Forging a valid
// cookie without knowing the secret is not practically possible.
//
// The cookie also carries its own expiry (8 hours), so a session
// doesn't stay valid forever even if a laptop is left logged in.
//
// Nothing in this file needs to change when Entra ID replaces this
// — this stays exactly as-is; only login.js gets swapped out.
// ══════════════════════════════════════════════════════════════

const COOKIE_NAME = 'obhs_faculty_session';
const SESSION_HOURS = 8;

async function hmac(secret, message) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Builds the Set-Cookie header value for a freshly-authenticated visitor.
export async function createSessionCookie(secret) {
  const expiry = Date.now() + SESSION_HOURS * 60 * 60 * 1000;
  const sig = await hmac(secret, String(expiry));
  const value = `${expiry}.${sig}`;
  return `${COOKIE_NAME}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_HOURS * 3600}`;
}

// Checks an incoming request's Cookie header. Returns true only if
// the signature is valid AND the session hasn't expired.
export async function verifySessionCookie(cookieHeader, secret) {
  if (!cookieHeader || !secret) return false;
  const match = cookieHeader.match(new RegExp(COOKIE_NAME + '=([^;]+)'));
  if (!match) return false;

  const [expiryStr, sig] = match[1].split('.');
  if (!expiryStr || !sig) return false;

  const expiry = Number(expiryStr);
  if (!expiry || Date.now() > expiry) return false;

  const expectedSig = await hmac(secret, expiryStr);
  return expectedSig === sig;
}

export { COOKIE_NAME };
