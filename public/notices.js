// ══════════════════════════════════════════════════════════════
// NOTICES — shared by index.html, faculty.html and display.html.
//
// Everything here reads one Google Sheet tab ("Notices") so Scott can
// post a one-off message, popup or TV slide by adding a row — no code
// change. Each page loads this file and then does its own rendering.
//
// Sheet columns (row 1 headers, any order, case doesn't matter):
//   TITLE       — headline (required)
//   MESSAGE     — body text; line breaks inside the cell are kept
//   IMAGE_URL   — optional; a Google Drive share link, any normal
//                 image link, or a site path like /hoodie-flyer.jpg
//   START_DATE  — first day it shows (blank = showing now)
//   END_DATE    — last day it shows (blank = same as START_DATE,
//                 i.e. a one-day notice; if both blank it stays up
//                 until the row is deleted)
//   SHOW_ON     — any of: Faculty, Homepage, TV (comma-separated),
//                 or All. Blank = everywhere.
//
// This file has its own CSV parser on purpose: the parser the pages
// already use splits on every line break, which would chop a
// multi-line MESSAGE cell into broken rows.
// ══════════════════════════════════════════════════════════════

// ← Paste the Notices tab's gid here (the number after "gid=" in the
// sheet URL when that tab is open). While blank, every page skips
// notices entirely — nothing breaks, nothing shows.
const NOTICES_GID = '';

// Full CSV parser: handles quoted fields, "" escapes, and line breaks
// inside quoted cells. Returns an array of rows (arrays of strings).
function noticesParseCSVRows(text) {
  const rows = [];
  let row = [], field = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQ = false;
      } else field += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += ch;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}

// Turns the CSV into objects keyed by normalized header
// ("Start Date" / "start_date" / "START DATE" all become START_DATE).
// The header row is the first row containing a TITLE column, so
// instruction rows above it are fine.
function noticesParse(text) {
  if (!text || text.includes('<!DOCTYPE')) return [];
  const rows = noticesParseCSVRows(text);
  const norm = h => (h || '').toString().trim().toUpperCase().replace(/[\s-]+/g, '_');
  let hi = rows.findIndex(r => r.map(norm).includes('TITLE'));
  if (hi < 0) return [];
  const hdrs = rows[hi].map(norm);
  return rows.slice(hi + 1).map(r => {
    const o = {};
    hdrs.forEach((h, i) => { if (h) o[h] = (r[i] || '').trim(); });
    return o;
  }).filter(o => o.TITLE);
}

// Accepts 2026-11-13, 11/13/2026, 11/13/26, or anything Date() reads.
function noticesParseDate(raw) {
  const s = (raw || '').toString().trim();
  if (!s) return null;
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (m) { let y = +m[3]; if (y < 100) y += 2000; return new Date(y, +m[1] - 1, +m[2]); }
  const d = new Date(s);
  if (isNaN(d)) return null;
  d.setHours(0, 0, 0, 0);
  return d;
}

// Where a notice should appear. Blank or "All" = everywhere.
function noticesPlacements(raw) {
  const s = (raw || '').toLowerCase();
  if (!s.trim() || /\ball\b|everywhere/.test(s)) return { faculty: true, homepage: true, tv: true };
  return {
    faculty: /faculty|staff|teacher/.test(s),
    homepage: /home|student|website|site/.test(s),
    tv: /\btv|display|screen|hallway/.test(s),
  };
}

// Drive share links don't work as <img> sources; this converts them
// to the direct-image form the flyer uploads already use.
function noticesImageUrl(raw) {
  const s = (raw || '').trim();
  if (!s) return '';
  let m = s.match(/drive\.google\.com\/file\/d\/([\w-]+)/) || s.match(/drive\.google\.com\/(?:open|uc)\?(?:.*&)?id=([\w-]+)/);
  if (m) return 'https://lh3.googleusercontent.com/d/' + m[1];
  if (s.startsWith('/') || /^https?:\/\//i.test(s)) return s;
  return '';
}

function noticesEscape(s) {
  return (s || '').toString().replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Message → safe HTML with line breaks kept.
function noticesMessageHtml(msg) {
  return noticesEscape(msg).replace(/\n/g, '<br>');
}

// Active notices for one placement ('faculty' | 'homepage' | 'tv'),
// in sheet order. `now` is injectable for testing.
function noticesActive(rows, placement, now) {
  const today = now ? new Date(now) : new Date();
  today.setHours(0, 0, 0, 0);
  return rows.filter(r => {
    if (!noticesPlacements(r.SHOW_ON)[placement]) return false;
    const start = noticesParseDate(r.START_DATE);
    let end = noticesParseDate(r.END_DATE);
    if (!end && start) end = start;
    if (start && today < start) return false;
    if (end && today > end) return false;
    return true;
  }).map(r => ({
    title: r.TITLE,
    message: r.MESSAGE || '',
    image: noticesImageUrl(r.IMAGE_URL),
    // Stable per-notice key so a dismissal sticks for that notice only —
    // a brand-new notice still pops up even after closing an old one.
    key: 'obhs-notice-' + (r.TITLE + '|' + (r.START_DATE || '') + '|' + (r.END_DATE || '')).replace(/[^\w|-]/g, '').slice(0, 120),
  }));
}

// Fetches the tab's raw CSV through the existing proxy (no rows parsed
// by the page's own parser — see note at top). Returns [] on any error.
async function noticesFetch() {
  if (!NOTICES_GID) return [];
  try {
    const r = await fetch('/api/sheet?gid=' + NOTICES_GID);
    if (!r.ok) return [];
    return noticesParse(await r.text());
  } catch (e) { return []; }
}

if (typeof module !== 'undefined') {
  module.exports = { noticesParseCSVRows, noticesParse, noticesParseDate, noticesPlacements, noticesImageUrl, noticesActive, noticesMessageHtml };
}
