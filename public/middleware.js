// ══════════════════════════════════════════════════════════════
// This is the same "pass-through" concept as the Entra ID version
// drafted earlier for Kristen — runs automatically before ANY
// request to the site, but the `matcher` at the bottom means it
// only ever looks at requests to /faculty. Every other page (Home,
// Student Hub, Athletics) is completely untouched by this file.
//
// Right now it checks a password-based session cookie instead of a
// Microsoft login. When Kristen comes back with Entra ID details,
// this file's shape stays the same — only the "where do I send
// someone with no valid cookie" destination changes, from
// /api/auth/login (this password page) to Microsoft's own login
// page. The verification logic in lib/session.js can stay as extra
// defense-in-depth, or be replaced entirely by Microsoft's own
// token check — that's a decision for that day, not this one.
// ══════════════════════════════════════════════════════════════

import { verifySessionCookie } from './lib/session.js';

export default async function middleware(request) {
  const url = new URL(request.url);
  const cookieHeader = request.headers.get('cookie');
  const secret = process.env.FACULTY_AUTH_SECRET;

  const valid = await verifySessionCookie(cookieHeader, secret);

  if (!valid) {
    const loginUrl = new URL('/api/auth/login', request.url);
    loginUrl.searchParams.set('returnTo', url.pathname);
    return Response.redirect(loginUrl, 302);
  }

  // Valid session — let the request through to the real page.
  return undefined;
}

// Only these paths are ever touched by this file.
export const config = {
  matcher: ['/faculty', '/faculty/:path*'],
};
