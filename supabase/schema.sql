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
