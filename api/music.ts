import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS setup
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { action, q } = req.query;

    if (action === 'youtube') {
      if (!q || typeof q !== 'string') {
        return res.status(400).json({ error: 'Missing query parameter q' });
      }

      const apiKey = process.env.YOUTUBE_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: 'YOUTUBE_API_KEY is not configured on the server.' });
      }

      // Official YouTube Data API v3 Search
      const ytRes = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=1&q=${encodeURIComponent(q + ' audio')}&type=video&key=${apiKey}`);
      const data = await ytRes.json();

      if (data.error) {
        console.error('YouTube API Error:', data.error);
        return res.status(500).json({ error: data.error.message });
      }

      if (data.items && data.items.length > 0) {
        const videoId = data.items[0].id.videoId;
        return res.status(200).json({ id: videoId });
      }

      return res.status(404).json({ error: 'No YouTube video found' });
    }

    return res.status(400).json({ error: 'Invalid action parameter' });
  } catch (error: any) {
    console.error('Music API error:', error.message);
    res.status(500).json({ error: error.message });
  }
}
