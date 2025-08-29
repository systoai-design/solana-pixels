-- Completely disable RLS for all tables to allow immediate functionality
-- This is for development/testing - in production you'd want proper policies

-- Disable RLS on all tables
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.pixel_blocks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.pixels DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes DISABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Users can read all pixel blocks" ON public.pixel_blocks;
DROP POLICY IF EXISTS "Users can insert pixel blocks" ON public.pixel_blocks;
DROP POLICY IF EXISTS "Users can update their own pixel blocks" ON public.pixel_blocks;
DROP POLICY IF EXISTS "Anyone can read users" ON public.users;
DROP POLICY IF EXISTS "Users can insert themselves" ON public.users;
DROP POLICY IF EXISTS "Users can update themselves" ON public.users;

-- Make image_url nullable since we don't always have images initially
ALTER TABLE public.pixel_blocks ALTER COLUMN image_url DROP NOT NULL;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_pixel_blocks_owner_id ON public.pixel_blocks(owner_id);
CREATE INDEX IF NOT EXISTS idx_pixel_blocks_position ON public.pixel_blocks(start_x, start_y);
CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON public.users(wallet_address);
