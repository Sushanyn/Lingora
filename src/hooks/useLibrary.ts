import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Dictionary, Word } from '../lib/types';
import { useAuth } from './useAuth';
import { trackEvent } from '../lib/analytics';

export function useLibrary() {
  const { session } = useAuth();
  const [publicDictionaries, setPublicDictionaries] = useState<Dictionary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCloning, setIsCloning] = useState(false);

  const fetchLibrary = useCallback(async () => {
    if (!session?.user.id) return;
    
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('dictionaries')
        .select('*')
        .eq('is_public', true)
        .neq('user_id', session.user.id) // Don't show their own public dicts here
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPublicDictionaries(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load library');
    } finally {
      setLoading(false);
    }
  }, [session?.user.id]);

  useEffect(() => {
    fetchLibrary();
  }, [fetchLibrary]);

  const cloneDictionary = async (dictId: string) => {
    if (!session?.user.id) return false;
    setIsCloning(true);
    try {
      // 1. Fetch original dictionary
      const { data: originalDict, error: dictError } = await supabase
        .from('dictionaries')
        .select('*')
        .eq('id', dictId)
        .single();
      
      if (dictError || !originalDict) throw dictError || new Error('Dictionary not found');

      // 2. Fetch original words
      const { data: originalWords, error: wordsError } = await supabase
        .from('words')
        .select('*')
        .eq('dictionary_id', dictId);
        
      if (wordsError) throw wordsError;

      // 3. Create new dictionary for the current user (not public by default)
      const { data: newDict, error: createError } = await supabase
        .from('dictionaries')
        .insert([{ 
          user_id: session.user.id,
          title: `${originalDict.title} (Cloned)`,
          description: originalDict.description,
          target_language: originalDict.target_language,
          is_public: false 
        }])
        .select()
        .single();

      if (createError || !newDict) throw createError;

      // 4. Copy all words
      if (originalWords && originalWords.length > 0) {
        const wordsPayload = originalWords.map((w: Word) => ({
          dictionary_id: newDict.id,
          user_id: session.user.id,
          term: w.term,
          definition: w.definition,
          example_sentence: w.example_sentence
        }));

        const { error: bulkError } = await supabase
          .from('words')
          .insert(wordsPayload);

        if (bulkError) throw bulkError;
      }
      
      trackEvent('dictionary_created', { source: 'clone', language: originalDict.target_language });
      alert('Dictionary cloned successfully! Check your Dictionaries tab.');
      return true;
    } catch (err: any) {
      alert(`Error cloning dictionary: ${err.message}`);
      return false;
    } finally {
      setIsCloning(false);
    }
  };

  return {
    publicDictionaries,
    loading,
    error,
    isCloning,
    cloneDictionary,
    refreshLibrary: fetchLibrary
  };
}
