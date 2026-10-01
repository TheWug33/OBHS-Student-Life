// api/obtv.js — Vercel serverless function
// Fetches the OBHS TV Production YouTube channel's public RSS feed
// server-side (avoids CORS, same pattern as api/knightlife.js) and returns
// only the "Old Bridge Knightly Wrap Up" series, newest first.
export default async function handler(req, res) {
  const CHANNEL_ID = 'UCm3WXaNQ-7TTdLMhx8IIKnQ'; // @OldBridgeHighSchool
  const FEED_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;
  // Matched as a substring, case-insensitive, so it survives whatever gets
  // appended per episode (a date, "Episode 4", etc.) without needing an
  // exact title match.
  const SERIES_MATCH = 'old bridge knightly wrap up';

  try {
    const response = await fetch(FEED_URL);
    if (!response.ok) {
      return res.status(502).json({ error: `Feed returned ${response.status}` });
    }
    const xml = await response.text();

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
    const getTag = (block, tag) => {
      // Namespaced tags (yt:videoId) and plain ones (title, published) both
      // match here since `:` isn't special in this character class.
      const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
      return m ? m[1].trim() : '';
    };
    const formatDate = (iso) => {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const entryBlocks = xml.match(/<entry>[\s\S]*?<\/entry>/g) || [];
    const items = entryBlocks
      .map(block => {
        const id = getTag(block, 'yt:videoId');
        const title = decodeEntities(getTag(block, 'title'));
        const date = formatDate(getTag(block, 'published'));
        if (!id || !title) return null;
        return {
          id,
          title,
          date,
          link: `https://www.youtube.com/watch?v=${id}`,
          // Every public YouTube video has a thumbnail at this fixed path —
          // no need to parse it out of the feed.
          thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
        };
      })
      .filter(item => item && item.title.toLowerCase().includes(SERIES_MATCH))
      .slice(0, 8);

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json({ items });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
