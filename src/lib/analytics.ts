import { supabase } from './supabase';

export async function trackEvent(eventName: string, metadata: Record<string, any> = {}) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) return;

    await supabase.from('analytics_events').insert([{
      user_id: session.user.id,
      event_name: eventName,
      metadata: metadata
    }]);
  } catch (error) {
    console.warn(`Analytics trackEvent failed for ${eventName}`, error);
  }
}
