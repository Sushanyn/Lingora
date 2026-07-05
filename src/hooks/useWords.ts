import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Word } from '../lib/types';
import { useAuth } from './useAuth';

export function useWords(dictionaryId: string) {
  const { session } = useAuth();
  const [words, setWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWords = useCallback(async () => {
    if (!session?.user.id || !dictionaryId) return;
    
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('words')
        .select('*')
        .eq('dictionary_id', dictionaryId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWords(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load words');
    } finally {
      setLoading(false);
    }
  }, [session?.user.id, dictionaryId]);

  const createWord = async (word: Pick<Word, 'term' | 'definition' | 'example_sentence'>) => {
    if (!session?.user.id || !dictionaryId) return;
    try {
      const { data, error } = await supabase
        .from('words')
        .insert([{ ...word, dictionary_id: dictionaryId, user_id: session.user.id }])
        .select()
        .single();

      if (error) throw error;
      setWords((prev) => [data, ...prev]);
    } catch (err: any) {
      alert(`Error creating word: ${err.message}`);
    }
  };

  const bulkCreateWords = async (wordsData: Pick<Word, 'term' | 'definition' | 'example_sentence'>[]) => {
    if (!session?.user.id || !dictionaryId || wordsData.length === 0) return;
    try {
      const payload = wordsData.map(w => ({
        ...w,
        dictionary_id: dictionaryId,
        user_id: session.user.id
      }));

      const { data, error } = await supabase
        .from('words')
        .insert(payload)
        .select();

      if (error) throw error;
      
      // Update local state by prepending the newly created words
      if (data) {
        setWords((prev) => [...data, ...prev]);
      }
    } catch (err: any) {
      alert(`Error importing words: ${err.message}`);
    }
  };

  const updateWord = async (id: string, updates: Pick<Word, 'term' | 'definition' | 'example_sentence'>) => {
    try {
      const { error } = await supabase
        .from('words')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      
      setWords((prev) =>
        prev.map((w) => (w.id === id ? { ...w, ...updates } : w))
      );
    } catch (err: any) {
      alert(`Error updating word: ${err.message}`);
    }
  };

  const deleteWord = async (id: string) => {
    try {
      const { error } = await supabase
        .from('words')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setWords((prev) => prev.filter((w) => w.id !== id));
    } catch (err: any) {
      alert(`Error deleting word: ${err.message}`);
    }
  };

  return {
    words,
    loading,
    error,
    createWord,
    bulkCreateWords,
    updateWord,
    deleteWord,
    refreshWords: fetchWords
  };
}
