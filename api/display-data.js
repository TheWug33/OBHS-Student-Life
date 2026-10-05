// api/display-data.js — Vercel serverless function
// Batches several Google Sheet tab fetches into ONE client-visible request.
// Built for display.html, which polls many tabs at once from many always-on
// TVs — each tab fetched separately was multiplying CDN request volume by
// the tab count on every poll, from every screen. This fetches them all
// server-side in parallel (server-to-server calls don't count against
// Vercel's CDN request quota the way client requests do) and returns them
// in one JSON payload, keyed by gid, each value the raw CSV text — same
// shape api/sheet.js already returns per-tab, just bundled.
// Usage: /api/display-data?gids=123,456,789
export default async function handler(req, res) {
  const SHEET_ID = '2PACX-1vTn1E6Nz4vVMyRkYoywXpVr65lR_1PGVEW-UWebjCKKhQFYbsaHiKrDf_4vyGSOLjV3t9euDz7lTbDw';
  const gids = (req.query.gids || '')
    .split(',')
    .map(g => g.trim())
    .filter(Boolean);

  if (!gids.length) {
    return res.status(400).json({ error: 'Missing gids parameter' });
  }

  try {
    const entries = await Promise.all(gids.map(async (gid) => {
      try {
        const url = `https://docs.google.com/spreadsheets/d/e/${SHEET_ID}/pub?gid=${gid}&single=true&output=csv`;
        const r = await fetch(url);
        if (!r.ok) return [gid, ''];
        return [gid, await r.text()];
      } catch (e) {
        return [gid, ''];
      }
    }));
    const data = Object.fromEntries(entries);

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    // Several TVs polling within the same few minutes share this cached
    // response rather than each triggering a fresh round-trip to Google.
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
