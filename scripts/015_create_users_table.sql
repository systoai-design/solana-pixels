-- Create the missing users table that other tables reference
CREATE TABLE IF NOT EXISTS public.users (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    wallet_address text UNIQUE NOT NULL,
    username text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for users table
CREATE POLICY "Users can view and edit their own data" ON public.users
    FOR ALL USING (wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address');

-- Add foreign key constraints if they don't exist
DO $$ 
BEGIN
    -- Add foreign key constraint for likes.user_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'likes_user_id_fkey' 
        AND table_name = 'likes'
    ) THEN
        ALTER TABLE public.likes 
        ADD CONSTRAINT likes_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
    END IF;

    -- Add foreign key constraint for purchases.user_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'purchases_user_id_fkey' 
        AND table_name = 'purchases'
    ) THEN
        ALTER TABLE public.purchases 
        ADD CONSTRAINT purchases_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
    END IF;

    -- Add foreign key constraint for pixel_blocks.owner_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'pixel_blocks_owner_id_fkey' 
        AND table_name = 'pixel_blocks'
    ) THEN
        ALTER TABLE public.pixel_blocks 
        ADD CONSTRAINT pixel_blocks_owner_id_fkey 
        FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE CASCADE;
    END IF;

    -- Add foreign key constraint for pixels.owner_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'pixels_owner_id_fkey' 
        AND table_name = 'pixels'
    ) THEN
        ALTER TABLE public.pixels 
        ADD CONSTRAINT pixels_owner_id_fkey 
        FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Create function to automatically create user when wallet connects
CREATE OR REPLACE FUNCTION public.get_or_create_user(wallet_addr text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_id uuid;
BEGIN
    -- Try to find existing user
    SELECT id INTO user_id FROM public.users WHERE wallet_address = wallet_addr;
    
    -- If not found, create new user
    IF user_id IS NULL THEN
        INSERT INTO public.users (wallet_address)
        VALUES (wallet_addr)
        RETURNING id INTO user_id;
    END IF;
    
    RETURN user_id;
END;
$$;
