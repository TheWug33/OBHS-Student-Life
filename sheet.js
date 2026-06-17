// api/sheet.js  — Vercel serverless function
// Fetches a Google Sheets CSV tab server-side (no CORS issues)
// Usage: /api/sheet?gid=1447819289

export default async function handler(req, res) {
  const { gid } = req.query;
  if (!gid) {
    return res.status(400).json({ error: 'Missing gid parameter' });
  }

  const SHEET_ID = '2PACX-1vS7o0_FUyuW1Amalefxm-Yam4UHRbUbv619USaliAnL27vs22hCb5SDozsfq9CSDTMyDkLfKxlmAQkX';
  const url = `https://docs.google.com/spreadsheets/d/e/${SHEET_ID}/pub?gid=${gid}&single=true&output=csv`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return res.status(502).json({ error: `Sheet returned ${response.status}` });
    }
    const text = await response.text();
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).send(text);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
