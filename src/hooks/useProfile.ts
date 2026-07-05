import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { trackEvent } from '../lib/analytics';

export interface UserProfile {
  id: string;
  is_premium: boolean;
  stripe_customer_id?: string;
  current_streak: number;
  longest_streak: number;
  last_practice_date?: string;
  created_at: string;
}

export function useProfile() {
  const { session } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user.id) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const fetchOrCreateProfile = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (error && error.code === 'PGRST116') {
          // Profile doesn't exist, let's create it
          const { data: newProfile, error: insertError } = await supabase
            .from('profiles')
            .insert([{ id: session.user.id, is_premium: false }])
            .select()
            .single();
            
          if (!insertError && newProfile) {
            setProfile(newProfile as UserProfile);
            trackEvent('signup_completed');
          }
        } else if (data) {
          setProfile(data as UserProfile);
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrCreateProfile();
  }, [session]);

  const updateStreak = async () => {
    if (!profile) return;
    
    const today = new Date().toISOString().split('T')[0];
    const lastPractice = profile.last_practice_date;
    
    if (lastPractice === today) return;
    
    let newCurrentStreak = profile.current_streak || 0;
    
    if (!lastPractice) {
      newCurrentStreak = 1;
    } else {
      const lastDate = new Date(lastPractice);
      const todayDate = new Date(today);
      const diffTime = Math.abs(todayDate.getTime() - lastDate.getTime());
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)); 
      
      if (diffDays === 1) {
        newCurrentStreak += 1;
      } else {
        newCurrentStreak = 1;
      }
    }
    
    const newLongestStreak = Math.max(profile.longest_streak || 0, newCurrentStreak);
    
    const updates = {
      current_streak: newCurrentStreak,
      longest_streak: newLongestStreak,
      last_practice_date: today
    };

    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', profile.id);

      if (!error) {
        setProfile({ ...profile, ...updates });
      }
    } catch (err) {
      console.error('Error updating streak:', err);
    }
  };

  return { profile, loading, updateStreak };
}
