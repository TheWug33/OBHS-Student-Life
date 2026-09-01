// api/calendar.js — Vercel serverless function
// Live-subscribable calendar feed for Outlook / Google Calendar / Apple Calendar.
// Subscribe URL: https://obhs-student-life-ob.vercel.app/api/calendar
//
// Unlike the one-time "Export" button (a snapshot .ics download), this endpoint is
// meant to be added as a SUBSCRIPTION. Calendar apps re-check it automatically
// (every few hours) and reconcile changes on their own — no duplicate events,
// because every event gets a STABLE id derived from its title + start date,
// not from its position in the list. Adding or reordering rows in the sheet
// never changes an existing event's id.

const SHEET_ID = '2PACX-1vS7o0_FUyuW1Amalefxm-Yam4UHRbUbv619USaliAnL27vs22hCb5SDozsfq9CSDTMyDkLfKxlmAQkX';
const EVENTS_GID = '424739582';

const MONTH_NUM = { JAN:0, FEB:1, MAR:2, APR:3, MAY:4, JUN:5, JUL:6, AUG:7, SEP:8, OCT:9, NOV:10, DEC:11 };
const KNOWN = ['TITLE','DATE','SOURCE','TAG','MONTH','DAY','END_MONTH','END_DAY','TIME','LOCATION'];

function splitCSVLine(line) {
  const out = []; let cur = '', inQ = false;
  for (const ch of line) {
    if (ch === '"') inQ = !inQ;
    else if (ch === ',' && !inQ) { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

function parseCSV(text) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  let hi = 0;
  for (let i = 0; i < Math.min(lines.length, 8); i++) {
    const cells = splitCSVLine(lines[i]).map(c => c.replace(/^"|"$/g, '').trim().toUpperCase());
    if (cells.some(c => KNOWN.includes(c))) { hi = i; break; }
  }
  const headers = splitCSVLine(lines[hi]).map(h => h.replace(/^"|"$/g, '').trim());
  return lines.slice(hi + 1).map(line => {
    const vals = splitCSVLine(line).map(v => v.replace(/^"|"$/g, '').trim());
    const obj = {};
    headers.forEach((h, i) => { obj[h.toUpperCase()] = vals[i] || ''; });
    return obj;
  }).filter(r => Object.values(r).some(v => v));
}

function icsEscape(s) {
  return (s || '').toString()
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

function icsDate(d) {
  const yr = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const dy = String(d.getDate()).padStart(2, '0');
  return `${yr}${mo}${dy}`;
}

// Simple stable string hash — same title+date always produces the same id,
// regardless of row order in the sheet.
function hashKey(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) >>> 0;
  }
  return h.toString(36);
}

export default async function handler(req, res) {
  try {
    const url = `https://docs.google.com/spreadsheets/d/e/${SHEET_ID}/pub?gid=${EVENTS_GID}&single=true&output=csv`;
    const r = await fetch(url);
    if (!r.ok) {
      res.setHeader('Content-Type', 'text/plain');
      return res.status(502).send('Could not load events');
    }
    const text = await r.text();
    const rows = parseCSV(text);

    const now = new Date();
    const stamp = icsDate(now) + 'T' + String(now.getUTCHours()).padStart(2, '0') + String(now.getUTCMinutes()).padStart(2, '0') + '00Z';

    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//OBHS Student Life//Events//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:OBHS Student Life',
      'X-WR-TIMEZONE:America/New_York',
      'REFRESH-INTERVAL;VALUE=DURATION:PT12H',
      'X-PUBLISHED-TTL:PT12H',
    ];

    const today = new Date(); today.setHours(0, 0, 0, 0);
    // Anchor every event's year to a fixed school-year reference (Aug–Dec =
    // the year the school year started, Jan–Jul = the year after) instead of
    // comparing each event's same-year date against "today". The old
    // approach re-decided an event's year on every single fetch — so a
    // one-time event that had already passed (like an early-August kickoff
    // party) would silently jump forward to next year once "today" moved
    // past it. Because each event's stable ID is built from its title AND
    // date, that meant the ID itself changed too, breaking the exact
    // duplicate-prevention this feed is designed around. Anchoring to the
    // school year means an event's date — and therefore its ID — never
    // moves once published, no matter how many days go by.
    const schoolYearStartYear = today.getMonth() >= 7 ? today.getFullYear() : today.getFullYear() - 1;

    rows.forEach(row => {
      const title = (row.TITLE || '').trim();
      if (!title || title.includes('ADD YOUR')) return;
      if (!/^y/i.test((row.APPROVED || '').trim())) return;
      const rawDay = (row.DAY || '').toString().trim();
      if (!rawDay || rawDay === '0') return;
      const dy = rawDay.includes('/') ? parseInt(rawDay.split('/')[1]) : (parseInt(rawDay) || 1);
      const rawMonth = (row.MONTH || '').toString().trim().toUpperCase().slice(0, 3);
      const mo = MONTH_NUM[rawMonth];
      if (mo === undefined) return;

      const yr = mo >= 7 ? schoolYearStartYear : schoolYearStartYear + 1;
      let start = new Date(yr, mo, dy);

      let end = start;
      const endDayRaw = (row.END_DAY || '').toString().trim();
      if (endDayRaw && endDayRaw !== '0') {
        const endMonRaw = (row.END_MONTH || '').toString().trim().toUpperCase().slice(0, 3);
        const endMo = MONTH_NUM[endMonRaw] !== undefined ? MONTH_NUM[endMonRaw] : mo;
        const endDy = parseInt(endDayRaw) || dy;
        let endYr = yr;
        if (endMo < mo) endYr += 1;
        end = new Date(endYr, endMo, endDy);
      }
      const dtEnd = new Date(end); dtEnd.setDate(dtEnd.getDate() + 1);

      // Stable UID — derived only from title + start date, never from array position.
      const uid = hashKey(title.toUpperCase() + '|' + icsDate(start)) + '@obhs-student-life-ob.vercel.app';

      const descParts = [];
      if (row.TIME) descParts.push(row.TIME);
      if (row.LOCATION) descParts.push(row.LOCATION);

      lines.push(
        'BEGIN:VEVENT',
        'UID:' + uid,
        'DTSTAMP:' + stamp,
        'DTSTART;VALUE=DATE:' + icsDate(start),
        'DTEND;VALUE=DATE:' + icsDate(dtEnd),
        'SUMMARY:' + icsEscape(title),
        descParts.length ? 'DESCRIPTION:' + icsEscape(descParts.join(' \u00b7 ')) : null,
        row.LOCATION ? 'LOCATION:' + icsEscape(row.LOCATION) : null,
        'END:VEVENT'
      );
    });

    lines.push('END:VCALENDAR');
    const ics = lines.filter(l => l !== null).join('\r\n');

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'inline; filename="OBHS-Student-Life-Calendar.ics"');
    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600');
    return res.status(200).send(ics);
  } catch (e) {
    res.setHeader('Content-Type', 'text/plain');
    return res.status(500).send('Error generating calendar: ' + e.message);
  }
}
