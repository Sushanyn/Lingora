import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function testStats() {
  const { data: users } = await supabase.from('profiles').select('id').limit(1);
  if (!users || users.length === 0) {
    console.log('No users found.');
    return;
  }
  const userId = users[0].id;
  console.log('Testing stats for user:', userId);

  const { data: dicts, error: dictError } = await supabase
    .from('dictionaries')
    .select('id, title, target_language')
    .eq('user_id', userId);
    
  if (dictError) console.error('Dict error:', dictError);
  console.log('Dicts:', dicts?.length);

  const { data: words, error: wordError } = await supabase
    .from('words')
    .select('id, dictionary_id, ease_factor, repetitions, created_at')
    .eq('user_id', userId);

  if (wordError) console.error('Word error:', wordError);
  console.log('Words:', words?.length);
}

testStats();
