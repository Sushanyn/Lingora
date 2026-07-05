import type { VercelRequest, VercelResponse } from '@vercel/node';
import YouTube from 'youtube-sr';

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
    const { action } = req.query;

    if (action === 'search') {
      const q = req.query.q as string;
      if (!q) {
        return res.status(400).json({ error: 'Missing query parameter q' });
      }
      
      const response = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(q)}`);
      if (!response.ok) {
        return res.status(response.status).json({ error: 'Failed to fetch from LRCLIB' });
      }
      const data = await response.json();
      
      // Filter for tracks that actually have synced lyrics
      const validTracks = data.filter((track: any) => track.syncedLyrics);
      return res.status(200).json(validTracks);
    } 
    
    if (action === 'youtube') {
      const q = req.query.q as string;
      if (!q) {
        return res.status(400).json({ error: 'Missing query parameter q' });
      }

      try {
        // Try DuckDuckGo HTML search first (less likely to be blocked by Vercel IPs)
        const ddgRes = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(q + ' audio youtube')}`);
        const html = await ddgRes.text();
        // DuckDuckGo redirects to youtube via something like /url?q=https://www.youtube.com/watch?v=VIDEO_ID
        const match = html.match(/v%3D([a-zA-Z0-9_-]{11})/);
        if (match && match[1]) {
          return res.status(200).json({ id: match[1], title: q });
        }
      } catch (e) {
        console.warn('DDG search failed, falling back to youtube-sr', e);
      }

      // Fallback to youtube-sr if DDG fails
      const video = await YouTube.searchOne(`${q} audio`);
      if (!video) {
        return res.status(404).json({ error: 'No YouTube video found' });
      }
      
      return res.status(200).json({ id: video.id, title: video.title });
    }

    return res.status(400).json({ error: 'Invalid action parameter' });
  } catch (error: any) {
    console.error('Music API error:', error.message);
    res.status(500).json({ error: error.message });
  }
}
