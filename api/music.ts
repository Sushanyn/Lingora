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
    const { action } = req.query;

    if (action === 'search') {
      const q = req.query.q as string;
      if (!q) {
        return res.status(400).json({ error: 'Missing query parameter q' });
      }
      
      const response = await fetch(`https://api.deezer.com/search?q=${encodeURIComponent(q)}`);
      const data = await response.json();
      return res.status(200).json(data);
    } 
    
    if (action === 'lyrics') {
      const artist = req.query.artist as string;
      const title = req.query.title as string;
      if (!artist || !title) {
        return res.status(400).json({ error: 'Missing artist or title parameters' });
      }

      const response = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`);
      if (!response.ok) {
        if (response.status === 404) {
          return res.status(404).json({ error: 'Lyrics not found' });
        }
        return res.status(response.status).json({ error: 'Failed to fetch lyrics' });
      }
      
      const data = await response.json();
      return res.status(200).json(data);
    }

    return res.status(400).json({ error: 'Invalid action parameter' });
  } catch (error: any) {
    console.error('Music API error:', error.message);
    res.status(500).json({ error: error.message });
  }
}
