import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Dictionary } from '../lib/types';
import { useAuth } from './useAuth';

export function useDictionaries() {
  const { session } = useAuth();
  const [dictionaries, setDictionaries] = useState<Dictionary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDictionaries = useCallback(async () => {
    if (!session?.user.id) return;
    
    setLoading(true);
    setError(null);
    try {
      // Fetch dictionaries
      const { data, error } = await supabase
        .from('dictionaries')
        .select('*, words(count)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Extract the count from the joined words array
      const dictsWithCounts = (data || []).map((dict: any) => ({
        ...dict,
        wordCount: dict.words?.[0]?.count || 0 
      }));
      
      setDictionaries(dictsWithCounts);
    } catch (err: any) {
      setError(err.message || 'Failed to load dictionaries');
    } finally {
      setLoading(false);
    }
  }, [session?.user.id]);

  useEffect(() => {
    fetchDictionaries();
  }, [fetchDictionaries]);

  const createDictionary = async (dict: Pick<Dictionary, 'title' | 'description' | 'target_language' | 'native_language' | 'is_public'>) => {
    if (!session?.user.id) return;
    try {
      const { data, error } = await supabase
        .from('dictionaries')
        .insert([{ ...dict, user_id: session.user.id }])
        .select()
        .single();

      if (error) throw error;
      setDictionaries((prev) => [{ ...data, wordCount: 0 }, ...prev]);
    } catch (err: any) {
      alert(`Error creating dictionary: ${err.message}`);
    }
  };

  const updateDictionary = async (id: string, updates: Pick<Dictionary, 'title' | 'description' | 'target_language' | 'native_language' | 'is_public'>) => {
    try {
      const { error } = await supabase
        .from('dictionaries')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      
      setDictionaries((prev) =>
        prev.map((dict) => (dict.id === id ? { ...dict, ...updates } : dict))
      );
    } catch (err: any) {
      alert(`Error updating dictionary: ${err.message}`);
    }
  };

  const deleteDictionary = async (id: string) => {
    try {
      const { error } = await supabase
        .from('dictionaries')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setDictionaries((prev) => prev.filter((dict) => dict.id !== id));
    } catch (err: any) {
      alert(`Error deleting dictionary: ${err.message}`);
    }
  };

  return {
    dictionaries,
    loading,
    error,
    createDictionary,
    updateDictionary,
    deleteDictionary,
    refreshDictionaries: fetchDictionaries
  };
}
