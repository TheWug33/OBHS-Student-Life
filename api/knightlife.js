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
    const stripByline = (text) => {
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length && /^by\s/i.test(lines[0])) lines.shift();
      return lines.join(' ');
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
      let excerpt = decodeEntities(stripByline(htmlToText(rawDesc))).trim();
      if (excerpt.length < 20) {
        const rawContent = getTag(block, 'content:encoded');
        excerpt = decodeEntities(stripByline(htmlToText(rawContent))).trim();
      }
      excerpt = excerpt.slice(0, 130).trim();
      return { title, link, excerpt };
    }).filter(item => item.title && item.link);

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json({ items });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
