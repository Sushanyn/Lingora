-- Create Dictionaries Table
CREATE TABLE public.dictionaries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    target_language TEXT NOT NULL,
    native_language TEXT DEFAULT 'en' NOT NULL,
    is_public BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS) for dictionaries
ALTER TABLE public.dictionaries ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only select their own dictionaries OR public dictionaries
CREATE POLICY "Users can view own or public dictionaries" 
    ON public.dictionaries FOR SELECT 
    USING (auth.uid() = user_id OR is_public = true);

-- Policy: Users can insert their own dictionaries
CREATE POLICY "Users can insert own dictionaries" 
    ON public.dictionaries FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own dictionaries
CREATE POLICY "Users can update own dictionaries" 
    ON public.dictionaries FOR UPDATE 
    USING (auth.uid() = user_id) 
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own dictionaries
CREATE POLICY "Users can delete own dictionaries" 
    ON public.dictionaries FOR DELETE 
    USING (auth.uid() = user_id);


-- Create Words Table
CREATE TABLE public.words (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    dictionary_id UUID NOT NULL REFERENCES public.dictionaries(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    term TEXT NOT NULL,
    definition TEXT NOT NULL,
    example_sentence TEXT,
    next_review_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    ease_factor REAL DEFAULT 2.5 NOT NULL,
    interval INTEGER DEFAULT 0 NOT NULL,
    repetitions INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS) for words
ALTER TABLE public.words ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view their own words
CREATE POLICY "Users can view own words" 
    ON public.words FOR SELECT 
    USING (auth.uid() = user_id);

-- Policy: Users can insert their own words
CREATE POLICY "Users can insert own words" 
    ON public.words FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own words
CREATE POLICY "Users can update own words" 
    ON public.words FOR UPDATE 
    USING (auth.uid() = user_id) 
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own words
CREATE POLICY "Users can delete own words" 
    ON public.words FOR DELETE 
    USING (auth.uid() = user_id);

-- Create Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    is_premium BOOLEAN DEFAULT false NOT NULL,
    stripe_customer_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS) for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own profile
CREATE POLICY "Users can view own profile" 
    ON public.profiles FOR SELECT 
    USING (auth.uid() = id);

-- Policy: Users can update their own profile (for simulated payment upgrade)
CREATE POLICY "Users can update own profile" 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id);

-- Policy: Users can insert their own profile
CREATE POLICY "Users can insert own profile" 
    ON public.profiles FOR INSERT 
    WITH CHECK (auth.uid() = id);

-- =================================================================================
-- SECURITY & LIMITS (TRIGGERS)
-- =================================================================================

-- 1. Protect Premium Status from Client-Side Updates
CREATE OR REPLACE FUNCTION protect_premium_status()
RETURNS TRIGGER AS $$
BEGIN
    IF auth.role() = 'authenticated' THEN
        NEW.is_premium = OLD.is_premium;
        NEW.stripe_customer_id = OLD.stripe_customer_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS protect_premium_trigger ON public.profiles;
CREATE TRIGGER protect_premium_trigger
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION protect_premium_status();

-- 2. Enforce Free Tier Limits (Max 3 Dictionaries)
CREATE OR REPLACE FUNCTION check_dictionary_limit()
RETURNS TRIGGER AS $$
DECLARE
    dict_count INT;
    is_user_premium BOOLEAN;
BEGIN
    SELECT is_premium INTO is_user_premium FROM public.profiles WHERE id = NEW.user_id;
    
    IF is_user_premium = false THEN
        SELECT count(*) INTO dict_count FROM public.dictionaries WHERE user_id = NEW.user_id;
        IF dict_count >= 3 THEN
            RAISE EXCEPTION 'Free tier limit reached. Maximum 3 dictionaries allowed.';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS enforce_dictionary_limit ON public.dictionaries;
CREATE TRIGGER enforce_dictionary_limit
BEFORE INSERT ON public.dictionaries
FOR EACH ROW EXECUTE FUNCTION check_dictionary_limit();

-- =================================================================================
-- TRANSLATION CACHE
-- =================================================================================

CREATE TABLE public.translations_cache (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    source_language TEXT NOT NULL,
    target_language TEXT NOT NULL,
    source_text TEXT NOT NULL,
    translated_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE UNIQUE INDEX idx_translations_cache_lookup 
ON public.translations_cache(source_language, target_language, lower(source_text));

-- Enable RLS but let the service_role (Edge Function) bypass it
ALTER TABLE public.translations_cache ENABLE ROW LEVEL SECURITY;
