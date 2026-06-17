// api/sheet.js — Vercel serverless function
// Fetches Google Sheets CSV server-side (no CORS issues)
// Usage: /api/sheet?gid=1447819289  OR  /api/sheet?url=https://...

export default async function handler(req, res) {
  const SHEET_ID = '2PACX-1vS7o0_FUyuW1Amalefxm-Yam4UHRbUbv619USaliAnL27vs22hCb5SDozsfq9CSDTMyDkLfKxlmAQkX';
  
  let url;
  if (req.query.url) {
    url = req.query.url;
  } else if (req.query.gid) {
    url = `https://docs.google.com/spreadsheets/d/e/${SHEET_ID}/pub?gid=${req.query.gid}&single=true&output=csv`;
  } else {
    return res.status(400).json({ error: 'Missing gid or url parameter' });
  }

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
