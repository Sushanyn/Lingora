import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

interface UserStats {
  totalDictionaries: number;
  totalWords: number;
  publicDictionaries: number;
}

export function useUserStats() {
  const { session } = useAuth();
  const [stats, setStats] = useState<UserStats>({
    totalDictionaries: 0,
    totalWords: 0,
    publicDictionaries: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    if (!session?.user.id) return;
    
    setLoading(true);
    setError(null);
    try {
      // 1. Get total dictionaries and public dictionaries
      const { data: dicts, error: dictError } = await supabase
        .from('dictionaries')
        .select('id, is_public')
        .eq('user_id', session.user.id);

      if (dictError) throw dictError;

      const totalDictionaries = dicts ? dicts.length : 0;
      const publicDictionaries = dicts ? dicts.filter(d => d.is_public).length : 0;

      // 2. Get total words
      // We do a simple count query on words for this user
      const { count: totalWords, error: wordError } = await supabase
        .from('words')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id);

      if (wordError) throw wordError;

      setStats({
        totalDictionaries,
        totalWords: totalWords || 0,
        publicDictionaries
      });

    } catch (err: any) {
      setError(err.message || 'Failed to load statistics');
    } finally {
      setLoading(false);
    }
  }, [session?.user.id]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    refreshStats: fetchStats
  };
}
