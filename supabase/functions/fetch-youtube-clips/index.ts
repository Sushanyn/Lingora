import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.14.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function fetchTranscript(videoId: string) {
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  const response = await fetch(url);
  const html = await response.text();
  
  // Find caption tracks JSON in the HTML page
  const match = html.match(/"captionTracks":(\[.*?\])/);
  if (!match) throw new Error("No captions found for this video");
  
  const tracks = JSON.parse(match[1]);
  if (!tracks || tracks.length === 0) throw new Error("No caption tracks found");
  
  // Find english or fallback to first
  const track = tracks.find((t: any) => t.languageCode.startsWith('en')) || tracks[0];
  const transcriptUrl = track.baseUrl;
  
  const transcriptResponse = await fetch(transcriptUrl);
  const transcriptXml = await transcriptResponse.text();
  
  const textRegex = /<text start="([^"]+)" dur="([^"]+)".*?>([^<]+)<\/text>/g;
  const parsed = [];
  let m;
  while ((m = textRegex.exec(transcriptXml)) !== null) {
    parsed.push({
      offset: parseFloat(m[1]) * 1000,
      duration: parseFloat(m[2]) * 1000,
      text: m[3].replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    });
  }
  return parsed;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { word, language = 'en' } = await req.json()

    if (!word) {
      throw new Error('Missing required parameter: word')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') as string
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Check if we already have clips for this word
    const { data: existingClips } = await supabase
      .from('immersion_clips')
      .select('*')
      .eq('target_word', word.toLowerCase())
      .limit(5)

    if (existingClips && existingClips.length > 0) {
      return new Response(
        JSON.stringify({ clips: existingClips, source: 'cache' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Call YouTube API to search for videos with captions
    const youtubeKey = Deno.env.get('YOUTUBE_API_KEY');
    if (!youtubeKey) throw new Error('YouTube API key missing (set YOUTUBE_API_KEY in your Supabase secrets)');

    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoCaption=closedCaption&relevanceLanguage=${language}&q=${encodeURIComponent(word)}&key=${youtubeKey}&maxResults=5`;
    
    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) throw new Error(`YouTube API search failed: ${await searchRes.text()}`);
    const searchData = await searchRes.json();
    
    const newClips = [];

    for (const item of searchData.items) {
      const videoId = item.id.videoId;
      try {
        const transcript = await fetchTranscript(videoId);
        
        // Find the line containing the word
        const matchedLines = transcript.filter(t => t.text.toLowerCase().includes(word.toLowerCase()));
        
        // Take the first match for simplicity
        if (matchedLines.length > 0) {
          const match = matchedLines[0];
          // We add a tiny buffer (0.5s) to start and end for better context
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

          // Insert into database
          await supabase.from('immersion_clips').insert(clip);
        }
      } catch (err) {
        console.error(`Failed to fetch transcript for video ${videoId}`, err);
      }
    }

    return new Response(
      JSON.stringify({ clips: newClips, source: 'api' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Fetch clips error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
