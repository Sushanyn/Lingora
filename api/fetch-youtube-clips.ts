import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

async function fetchTranscript(videoId: string) {
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  const response = await fetch(url);
  const html = await response.text();
  
  const match = html.match(/"captionTracks":(\[.*?\])/);
  if (!match) throw new Error("No captions found for this video");
  
  const tracks = JSON.parse(match[1]);
  if (!tracks || tracks.length === 0) throw new Error("No caption tracks found");
  
  const track = tracks.find((t: any) => t.languageCode.startsWith('en')) || tracks[0];
  const transcriptUrl = track.baseUrl;
  
  const transcriptResponse = await fetch(transcriptUrl);
  const transcriptXml = await transcriptResponse.text();
  
  const textRegex = /<text start="([^"]+)" dur="([^"]+)".*?>([^<]+)<\/text>/g;
  const parsed: Array<{ offset: number, duration: number, text: string }> = [];
  let m: RegExpExecArray | null;
  while ((m = textRegex.exec(transcriptXml)) !== null) {
    parsed.push({
      offset: parseFloat(m[1]) * 1000,
      duration: parseFloat(m[2]) * 1000,
      text: m[3].replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    });
  }
  return parsed;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { word, language = 'en' } = req.body;

    if (!word) {
      res.status(400).json({ error: 'Missing required parameter: word' });
      return;
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      res.status(500).json({ error: 'Missing Supabase URL or Key' });
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: existingClips } = await supabase
      .from('immersion_clips')
      .select('*')
      .eq('target_word', word.toLowerCase())
      .limit(5);

    if (existingClips && existingClips.length > 0) {
      res.status(200).json({ clips: existingClips, source: 'cache' });
      return;
    }

    const youtubeKey = process.env.YOUTUBE_API_KEY;
    if (!youtubeKey) {
      res.status(500).json({ error: 'YouTube API key missing (set YOUTUBE_API_KEY in Vercel secrets)' });
      return;
    }

    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoCaption=closedCaption&relevanceLanguage=${language}&q=${encodeURIComponent(word)}&key=${youtubeKey}&maxResults=5`;
    
    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) throw new Error(`YouTube API search failed: ${await searchRes.text()}`);
    const searchData = await searchRes.json();
    
    const newClips: Array<any> = [];

    for (const item of searchData.items) {
      const videoId = item.id.videoId;
      try {
        const transcript = await fetchTranscript(videoId);
        
        const matchedLines = transcript.filter((t: any) => t.text.toLowerCase().includes(word.toLowerCase()));
        
        if (matchedLines.length > 0) {
          const match = matchedLines[0];
          const startTime = Math.max(0, (match.offset / 1000) - 0.5);
          const endTime = (match.offset / 1000) + (match.duration / 1000) + 0.5;

          const clip = {
            target_word: word.toLowerCase(),
            video_id: videoId,
            start_time: startTime,
            end_time: endTime,
            exact_transcript: match.text,
            language: language
          };
          
          newClips.push(clip);

          await supabase.from('immersion_clips').insert(clip);
        }
      } catch (err) {
        console.error(`Failed to fetch transcript for video ${videoId}`, err);
      }
    }

    res.status(200).json({ clips: newClips, source: 'api' });
  } catch (error: any) {
    console.error('Fetch clips error:', error.message);
    res.status(500).json({ error: error.message });
  }
}
