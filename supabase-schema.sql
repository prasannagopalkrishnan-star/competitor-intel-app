-- Create users table (extends Supabase auth.users)
CREATE TABLE public.user_profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create competitors table
CREATE TABLE public.competitors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  website TEXT,
  rss_feeds TEXT[], -- Array of RSS feed URLs
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create signal types enum
CREATE TYPE signal_type AS ENUM (
  'product_launch',
  'funding',
  'leadership_change',
  'earnings_report',
  'social_media',
  'blog_post',
  'other'
);

-- Create sentiment enum
CREATE TYPE sentiment AS ENUM ('positive', 'negative', 'neutral');

-- Create signals table
CREATE TABLE public.signals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  competitor_id UUID REFERENCES public.competitors(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  signal_type signal_type NOT NULL,
  sentiment sentiment,
  source_url TEXT NOT NULL,
  source_name TEXT,
  is_high_priority BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notified_at TIMESTAMP WITH TIME ZONE,
  content_hash TEXT UNIQUE -- For deduplication
);

-- Create user preferences table
CREATE TABLE public.user_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE UNIQUE,
  signal_types signal_type[] DEFAULT ARRAY['product_launch', 'funding', 'leadership_change', 'earnings_report', 'social_media', 'blog_post']::signal_type[],
  delivery_email BOOLEAN DEFAULT TRUE,
  delivery_dashboard BOOLEAN DEFAULT TRUE,
  check_frequency_hours INTEGER DEFAULT 4, -- Check every 4 hours (6 times daily)
  email_digest_frequency_hours INTEGER DEFAULT 12, -- Email digest twice daily
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_competitors_user_id ON public.competitors(user_id);
CREATE INDEX idx_signals_competitor_id ON public.signals(competitor_id);
CREATE INDEX idx_signals_user_id ON public.signals(user_id);
CREATE INDEX idx_signals_created_at ON public.signals(created_at DESC);
CREATE INDEX idx_signals_notified_at ON public.signals(notified_at);
CREATE INDEX idx_signals_content_hash ON public.signals(content_hash);

-- Enable Row Level Security
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- User profiles
CREATE POLICY "Users can view own profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- Competitors
CREATE POLICY "Users can view own competitors" ON public.competitors
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own competitors" ON public.competitors
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own competitors" ON public.competitors
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own competitors" ON public.competitors
  FOR DELETE USING (auth.uid() = user_id);

-- Signals
CREATE POLICY "Users can view own signals" ON public.signals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own signals" ON public.signals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own signals" ON public.signals
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own signals" ON public.signals
  FOR DELETE USING (auth.uid() = user_id);

-- User preferences
CREATE POLICY "Users can view own preferences" ON public.user_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences" ON public.user_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences" ON public.user_preferences
  FOR UPDATE USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_competitors_updated_at BEFORE UPDATE ON public.competitors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
