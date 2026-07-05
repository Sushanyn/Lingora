-- 1. Processed Stripe Events for Webhook Idempotency
CREATE TABLE IF NOT EXISTS processed_stripe_events (
  event_id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. DeepL Usage Monthly
CREATE TABLE IF NOT EXISTS deepl_usage_monthly (
  month TEXT PRIMARY KEY,
  character_count INTEGER DEFAULT 0
);

-- RPC for atomic DeepL usage increment
CREATE OR REPLACE FUNCTION increment_deepl_usage(month_val TEXT, chars INTEGER)
RETURNS INTEGER AS $$
DECLARE
  new_count INTEGER;
BEGIN
  INSERT INTO deepl_usage_monthly (month, character_count)
  VALUES (month_val, chars)
  ON CONFLICT (month)
  DO UPDATE SET character_count = deepl_usage_monthly.character_count + chars
  RETURNING character_count INTO new_count;
  RETURN new_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Analytics Events
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  event_name TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for Analytics Events
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert own analytics" ON analytics_events FOR INSERT WITH CHECK (auth.uid() = user_id);
