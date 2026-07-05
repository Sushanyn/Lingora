import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export interface UserProfile {
  id: string;
  is_premium: boolean;
  stripe_customer_id?: string;
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

  const upgradeToPremium = async () => {
    if (!session?.user.id) return false;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ is_premium: true })
        .eq('id', session.user.id)
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setProfile(data as UserProfile);
        return true;
      }
    } catch (err) {
      console.error('Error upgrading to premium:', err);
      return false;
    }
    return false;
  };

  return { profile, loading, upgradeToPremium };
}
