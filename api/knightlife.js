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
    // Preserve paragraph/line breaks as newlines before stripping tags --
    // without this, a separate byline paragraph ("By Jane Doe, Editor")
    // runs directly into the next paragraph's first word with no space
    // ("...Editor On September 14..."), which is exactly what happened
    // before this fix.
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
    // Bylines ("By Jane Doe, Social Media Director") are their own leading
    // paragraph in the feed -- drop that line so the excerpt starts with
    // the actual story instead of an author credit eating the character budget.
    const stripByline = (text) => {
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length && /^by\s/i.test(lines[0])) lines.shift();
      return lines.join(' ');
    };

    // Grab a tag's raw inner content, whether or not it's CDATA-wrapped.
    const getTag = (block, tag) => {
      const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
      return m ? stripCdata(m[1]) : '';
    };

    const itemBlocks = xml.match(/<item\b[\s\S]*?<\/item>/g) || [];
    const items = itemBlocks.slice(0, 6).map(block => {
      const title = decodeEntities(htmlToText(getTag(block, 'title')));
      const link = getTag(block, 'link').trim();
      const rawDesc = getTag(block, 'description');
      let excerpt = decodeEntities(stripByline(htmlToText(rawDesc))).trim();
      // Some posts' <description> field is *only* the byline -- after
      // stripping it, nothing's left. Fall back to the full post body
      // in that case rather than showing a blank excerpt.
      if (excerpt.length < 20) {
        const rawContent = getTag(block, 'content:encoded');
        excerpt = decodeEntities(stripByline(htmlToText(rawContent))).trim();
      }
      excerpt = excerpt.slice(0, 130).trim();

      return { title, link, excerpt };
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
