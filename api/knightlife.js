// api/knightlife.js — Vercel serverless function
// Fetches and parses the Knight Life (OBHS student newspaper) RSS feed
// server-side, avoiding any CORS issues — same pattern as api/sheet.js.
export default async function handler(req, res) {
  const FEED_URL = 'https://knightlifeob.com/feed/';
  try {
    const response = await fetch(FEED_URL);
    if (!response.ok) {
      return res.status(502).json({ error: `Feed returned ${response.status}` });
    }
    const xml = await response.text();

    const stripCdata = (s) => (s || '').replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '').trim();
    const htmlToText = (s) => (s || '')
      .replace(/<\/(p|div|h[1-6]|li)>/gi, '\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]*>/g, '')
      .trim();
    const decodeEntities = (s) => (s || '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#0?39;/g, "'")
      .replace(/&#8217;/g, '\u2019')
      .replace(/&#8216;/g, '\u2018')
      .replace(/&#8220;/g, '\u201c')
      .replace(/&#8221;/g, '\u201d')
      .replace(/&#8211;/g, '\u2013')
      .replace(/&#8212;/g, '\u2014');
    // Extract the byline (e.g. "By Jane Doe, Social Media Director") instead
    // of discarding it as before -- this is now the only thing shown besides
    // the headline, since the description field turned out to be photo
    // caption text, not a real summary, and reads as nonsense out of context.
    const extractByline = (text) => {
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      if (!lines.length || !/^by\s/i.test(lines[0])) return '';
      let byline = lines[0];
      // If "By Name, Role" format is used, keep just the name portion.
      // If there's no comma (some posts run name and role together with no
      // separator at all), the full line is kept as-is rather than guessed at.
      const commaIdx = byline.indexOf(',');
      if (commaIdx > -1) byline = byline.slice(0, commaIdx);
      return decodeEntities(byline).trim();
    };
    const getTag = (block, tag) => {
      const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
      return m ? stripCdata(m[1]) : '';
    };

    const itemBlocks = xml.match(/<item\b[\s\S]*?<\/item>/g) || [];
    const items = itemBlocks.slice(0, 6).map(block => {
      const title = decodeEntities(htmlToText(getTag(block, 'title'))).slice(0, 90).trim();
      const link = getTag(block, 'link').trim();
      const rawDesc = getTag(block, 'description');
      let byline = extractByline(htmlToText(rawDesc));
      if (!byline) {
        const rawContent = getTag(block, 'content:encoded');
        byline = extractByline(htmlToText(rawContent));
      }
      return { title, link, byline };
    }).filter(item => item.title && item.link);

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json({ items });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
