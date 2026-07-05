import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.14.0"
import { YoutubeTranscript } from 'npm:youtube-transcript';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    if (!youtubeKey) throw new Error('YouTube API key missing');

    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoCaption=closedCaption&relevanceLanguage=${language}&q=${encodeURIComponent(word)}&key=${youtubeKey}&maxResults=5`;
    
    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) throw new Error('YouTube API search failed');
    const searchData = await searchRes.json();
    
    const newClips = [];

    for (const item of searchData.items) {
      const videoId = item.id.videoId;
      try {
        const transcript = await YoutubeTranscript.fetchTranscript(videoId);
        
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
