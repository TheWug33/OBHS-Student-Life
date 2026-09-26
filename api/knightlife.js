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
    const MONTHS = 'January|February|March|April|May|June|July|August|September|October|November|December';
    const toTitleCase = (s) => s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
    // Returns {author, role} -- author always has a value (falls back to
    // "Knight Life Staff" if nothing usable is found or if what's found is a
    // generic staff byline rather than a real name), role may be empty.
    const FALLBACK = { author: 'Knight Life Staff', role: '' };
    const extractByline = (text) => {
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      if (!lines.length || !/^by\s/i.test(lines[0])) return FALLBACK;
      let raw = lines[0].replace(/^by\s+/i, '').trim();

      // Some posts run the byline and the article's opening sentence
      // together with no paragraph break at all. Every article seen opens
      // its body with "On <Month> ...", so that's tried first as a cutoff;
      // failing that, most bylines end in a recognizable role word.
      const monthCut = raw.match(new RegExp(`\\bOn (${MONTHS})\\b`, 'i'));
      if (monthCut) {
        raw = raw.slice(0, monthCut.index).trim();
      } else {
        const roleCut = raw.match(/\b(Staff|Editor|Director|Reporter|Writer)\b/i);
        if (roleCut) raw = raw.slice(0, roleCut.index + roleCut[0].length).trim();
      }
      // Last-resort safety net: real bylines are short, so anything still
      // this long after the cuts above is almost certainly still leaking
      // into article text with no pattern this code recognizes.
      if (raw.length > 60) raw = raw.slice(0, 60).trim();

      // Split into name + role. Prefer a comma if present ("Name, Role");
      // otherwise this publication writes bylines as a leading ALL-CAPS
      // name followed by a Title-Case role ("DAYAMI VILORIA Social Media
      // Director"), so each word is checked individually for being fully
      // uppercase -- a regex-based version of this was tried first and
      // failed, since a Title-Case word's lone leading capital ("Social")
      // was wrongly matched as its own one-letter all-caps word.
      let namePart, rolePart;
      const commaIdx = raw.indexOf(',');
      if (commaIdx > -1) {
        namePart = raw.slice(0, commaIdx).trim();
        rolePart = raw.slice(commaIdx + 1).trim();
      } else {
        const words = raw.split(/\s+/).filter(Boolean);
        let splitIdx = 0;
        while (splitIdx < words.length && /^[A-Z']+$/.test(words[splitIdx])) splitIdx++;
        namePart = words.slice(0, splitIdx).join(' ');
        rolePart = words.slice(splitIdx).join(' ');
      }
      if (!namePart || /\bstaff\b/i.test(namePart)) return FALLBACK;
      return { author: toTitleCase(decodeEntities(namePart)), role: decodeEntities(rolePart) };
    };
    const formatDate = (pubDate) => {
      const d = new Date(pubDate);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
      let { author, role } = extractByline(htmlToText(rawDesc));
      if (author === FALLBACK.author) {
        const rawContent = getTag(block, 'content:encoded');
        const retry = extractByline(htmlToText(rawContent));
        if (retry.author !== FALLBACK.author) ({ author, role } = retry);
      }
      const date = formatDate(getTag(block, 'pubDate'));
      return { title, link, author, role, date };
    }).filter(item => item.title && item.link);

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json({ items });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
