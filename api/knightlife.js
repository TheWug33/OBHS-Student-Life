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
    const stripTags = (s) => (s || '').replace(/<[^>]*>/g, '').trim();
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

    // Grab a tag's raw inner content, whether or not it's CDATA-wrapped.
    const getTag = (block, tag) => {
      const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
      return m ? stripCdata(m[1]) : '';
    };

    const itemBlocks = xml.match(/<item\b[\s\S]*?<\/item>/g) || [];
    const items = itemBlocks.slice(0, 6).map(block => {
      const title = decodeEntities(stripTags(getTag(block, 'title')));
      const link = getTag(block, 'link').trim();
      const rawDesc = getTag(block, 'description');
      const excerpt = decodeEntities(stripTags(rawDesc)).slice(0, 160).trim();

      // The real, per-story photo lives in the post body itself. Try that
      // first; media:content is a fallback for the rare case a post has no
      // inline image at all -- in practice it turned out to carry a
      // generic Jetpack-generated placeholder graphic rather than the
      // actual featured photo, which is why this order matters.
      let image = '';
      const content = getTag(block, 'content:encoded') || rawDesc;
      const imgMatch = content.match(/<img[^>]*src=["']([^"']+)["']/i);
      if (imgMatch) {
        image = imgMatch[1];
      } else {
        const mediaMatch = block.match(/<media:content[^>]*url=["']([^"']+)["']/i);
        if (mediaMatch) image = mediaMatch[1];
      }

      return { title, link, excerpt, image };
    }).filter(item => item.title && item.link);

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    // Knight Life doesn't publish nearly as often as live event data changes,
    // so this caches much longer than sheet.js — no reason to hit their
    // server on every single homepage load.
    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json({ items });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
