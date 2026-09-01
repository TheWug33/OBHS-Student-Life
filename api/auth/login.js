// ══════════════════════════════════════════════════════════════
// The password gate itself. This is the ONE file that gets thrown
// away and replaced when Entra ID is ready — everything else
// (middleware.js, lib/session.js, the /faculty split) stays as-is.
//
// Two things must be set in Vercel (Project Settings → Environment
// Variables) before this works:
//
//   FACULTY_PASSWORD     the actual shared password staff will type in
//   FACULTY_AUTH_SECRET  any long random string — used only to sign
//                         the session cookie, staff never see this
//
// Neither of these should ever be written into this file directly.
// ══════════════════════════════════════════════════════════════

import { createSessionCookie } from '../../lib/session.js';

// Without this, Vercel runs this file as a classic Node.js function,
// which expects a different, older-style set of arguments than the
// modern Request/Response API this file actually uses below — that
// mismatch is what caused the crash. This line tells Vercel to run
// it the same way middleware.js already runs: as an Edge Function.
export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  const url = new URL(request.url);

  if (request.method === 'POST') {
    const form = await request.formData();
    const submitted = (form.get('password') || '').toString();
    const returnTo = (form.get('returnTo') || '/faculty').toString();
    const correctPassword = process.env.FACULTY_PASSWORD;

    if (correctPassword && submitted === correctPassword) {
      const secret = process.env.FACULTY_AUTH_SECRET;
      const cookie = await createSessionCookie(secret);
      const headers = new Headers();
      headers.set('Set-Cookie', cookie);
      headers.set('Location', returnTo);
      return new Response(null, { status: 302, headers });
    }

    return new Response(renderLoginPage({ error: true, returnTo }), {
      status: 401,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  // GET — show the form
  const returnTo = url.searchParams.get('returnTo') || '/faculty';
  return new Response(renderLoginPage({ error: false, returnTo }), {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

function renderLoginPage({ error, returnTo }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Faculty Hub — Sign In</title>
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
    background: linear-gradient(160deg, #0A0418, #1C1040);
    font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
    color: #fff;
  }
  .box {
    background: rgba(45,27,105,0.35); border: 1px solid rgba(255,255,255,0.1);
    border-radius: 16px; padding: 40px 36px; max-width: 360px; width: 90%; text-align: center;
    position: relative;
  }
  .close-link {
    position: absolute; top: -14px; right: -14px; width: 32px; height: 32px;
    border-radius: 50%; background: rgba(19,10,40,0.95); border: 1px solid rgba(255,255,255,0.15);
    color: #fff; display: flex; align-items: center; justify-content: center;
    text-decoration: none; font-size: 15px; line-height: 1;
  }
  h1 {
    font-family: 'Barlow Condensed', sans-serif; font-size: 22px; letter-spacing: .08em;
    text-transform: uppercase; margin: 0 0 8px;
  }
  p.sub { color: rgba(255,255,255,.6); font-size: 13px; margin: 0 0 24px; }
  input[type=password] {
    width: 100%; padding: 12px 14px; border-radius: 10px;
    border: 1px solid rgba(255,255,255,0.15); background: rgba(0,0,0,0.3);
    color: #fff; font-size: 15px; margin-bottom: 14px;
  }
  button {
    width: 100%; padding: 12px; border: none; border-radius: 10px;
    background: linear-gradient(120deg, #8B6FE0, #6B4EC4); color: #fff; font-weight: 700;
    font-family: 'Barlow Condensed', sans-serif; letter-spacing: .08em; text-transform: uppercase;
    font-size: 13px; cursor: pointer;
  }
  .err { color: #E0A030; font-size: 12.5px; margin-bottom: 14px; }
</style>
</head>
<body>
  <div class="box">
    <a href="/" class="close-link" aria-label="Back to site">✕</a>
    <h1>Faculty Hub</h1>
    <p class="sub">Staff access only — enter the password shared with your team.</p>
    ${error ? '<div class="err">Incorrect password — try again.</div>' : ''}
    <form method="POST" action="/api/auth/login">
      <input type="password" name="password" placeholder="Password" autofocus required>
      <input type="hidden" name="returnTo" value="${returnTo.replace(/"/g, '&quot;')}">
      <button type="submit">Enter</button>
    </form>
  </div>
</body>
</html>`;
}
