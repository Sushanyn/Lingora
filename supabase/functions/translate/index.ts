import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.14.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { text, sourceLang, targetLang } = await req.json()

    if (!text || !sourceLang || !targetLang) {
      throw new Error('Missing required parameters')
    }

    // Initialize Supabase Client with service role to bypass RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL') as string
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Authenticate the user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing Authorization header')

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (authError || !user) throw new Error('Unauthorized')

    // --- Rate Limit Logic ---
    const { data: rateLimit } = await supabase
      .from('translation_rate_limits')
      .select('*')
      .eq('user_id', user.id)
      .single()

    const now = new Date()
    const oneMinuteAgo = new Date(now.getTime() - 60000)

    if (rateLimit) {
      if (new Date(rateLimit.window_start) > oneMinuteAgo) {
        if (rateLimit.request_count >= 20) {
          throw new Error('Rate limit exceeded (Max 20 translations per minute)')
        } else {
          await supabase.from('translation_rate_limits')
            .update({ request_count: rateLimit.request_count + 1 })
            .eq('user_id', user.id)
        }
      } else {
        await supabase.from('translation_rate_limits')
          .update({ request_count: 1, window_start: now.toISOString() })
          .eq('user_id', user.id)
      }
    } else {
      await supabase.from('translation_rate_limits')
        .insert({ user_id: user.id, request_count: 1, window_start: now.toISOString() })
    }

    // 1. Check Global Cache
    const { data: cached } = await supabase
      .from('translations_cache')
      .select('translated_text')
      .eq('source_language', sourceLang)
      .eq('target_language', targetLang)
      .eq('source_text', text.toLowerCase())
      .single()

    if (cached) {
      console.log('Cache hit for:', text)
      return new Response(
        JSON.stringify({ translatedText: cached.translated_text, source: 'cache' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Cache miss. Calling DeepL API for:', text)

    // 2. Call DeepL API (if not in cache)
    const authKey = Deno.env.get('DEEPL_AUTH_KEY');
    if (!authKey) throw new Error('DeepL API key missing (set DEEPL_AUTH_KEY)');

    // DeepL has different endpoints for free vs pro keys
    const isFree = authKey.endsWith(':fx');
    const apiUrl = isFree 
      ? 'https://api-free.deepl.com/v2/translate'
      : 'https://api.deepl.com/v2/translate';

    const params = new URLSearchParams();
    params.append('text', text);
    // DeepL expects ISO 639-1 format uppercase (e.g. "EN", "FR", "ES")
    params.append('source_lang', sourceLang.toUpperCase().split('-')[0]);
    params.append('target_lang', targetLang.toUpperCase().split('-')[0]);

    const deeplResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${authKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params
    });

    if (!deeplResponse.ok) {
      const errText = await deeplResponse.text();
      throw new Error(`DeepL API error: ${deeplResponse.statusText} - ${errText}`);
    }

    const deeplData = await deeplResponse.json();
    const translatedText = deeplData.translations[0].text;

    // 3. Save result to Cache for future requests
    await supabase.from('translations_cache').insert({
      source_language: sourceLang,
      target_language: targetLang,
      source_text: text.toLowerCase(),
      translated_text: translatedText
    });

    return new Response(
      JSON.stringify({ translatedText, source: 'api' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Translation error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
