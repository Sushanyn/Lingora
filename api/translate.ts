import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS setup
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { text, sourceLang, targetLang } = req.body;

    if (!text || !sourceLang || !targetLang) {
      res.status(400).json({ error: 'Missing required parameters' });
      return;
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      res.status(500).json({ error: 'Missing Supabase URL or Key' });
      return;
    }

    // Initialize Supabase Client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Authenticate the user
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.status(401).json({ error: 'Missing Authorization header' });
      return;
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // --- Rate Limit Logic ---
    const { data: rateLimit } = await supabase
      .from('translation_rate_limits')
      .select('*')
      .eq('user_id', user.id)
      .single();

    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60000);

    if (rateLimit) {
      if (new Date(rateLimit.window_start) > oneMinuteAgo) {
        if (rateLimit.request_count >= 20) {
          res.status(429).json({ error: 'Rate limit exceeded (Max 20 translations per minute)' });
          return;
        } else {
          await supabase.from('translation_rate_limits')
            .update({ request_count: rateLimit.request_count + 1 })
            .eq('user_id', user.id);
        }
      } else {
        await supabase.from('translation_rate_limits')
          .update({ request_count: 1, window_start: now.toISOString() })
          .eq('user_id', user.id);
      }
    } else {
      await supabase.from('translation_rate_limits')
        .insert({ user_id: user.id, request_count: 1, window_start: now.toISOString() });
    }

    // 1. Check Global Cache
    const { data: cached } = await supabase
      .from('translations_cache')
      .select('translated_text')
      .eq('source_language', sourceLang)
      .eq('target_language', targetLang)
      .eq('source_text', text.toLowerCase())
      .single();

    if (cached) {
      res.status(200).json({ translatedText: cached.translated_text, source: 'cache' });
      return;
    }

    // 2. Call DeepL API (if not in cache)
    const authKey = process.env.DEEPL_AUTH_KEY;
    if (!authKey) {
      res.status(500).json({ error: 'DeepL API key missing (set DEEPL_AUTH_KEY in Vercel)' });
      return;
    }

    const isFree = authKey.endsWith(':fx');
    const apiUrl = isFree 
      ? 'https://api-free.deepl.com/v2/translate'
      : 'https://api.deepl.com/v2/translate';

    const params = new URLSearchParams();
    params.append('text', text);
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
      res.status(500).json({ error: `DeepL API error: ${deeplResponse.statusText} - ${errText}` });
      return;
    }

    const deeplData = await deeplResponse.json();
    const translatedText = deeplData.translations[0].text;

    // 3. Save result to Cache
    await supabase.from('translations_cache').insert({
      source_language: sourceLang,
      target_language: targetLang,
      source_text: text.toLowerCase(),
      translated_text: translatedText
    });

    res.status(200).json({ translatedText, source: 'api' });
  } catch (error: any) {
    console.error('Translation error:', error.message);
    res.status(500).json({ error: error.message });
  }
}
