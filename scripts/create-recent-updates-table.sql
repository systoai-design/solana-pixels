-- Create recent_updates table for real-time activity feed
CREATE TABLE IF NOT EXISTS public.recent_updates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    wallet_address TEXT NOT NULL,
    username TEXT,
    action TEXT NOT NULL,
    block_info TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_recent_updates_created_at ON public.recent_updates(created_at DESC);

-- Enable RLS
ALTER TABLE public.recent_updates ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (since this is public activity feed)
CREATE POLICY "Allow all operations on recent_updates" ON public.recent_updates
    FOR ALL USING (true) WITH CHECK (true);
