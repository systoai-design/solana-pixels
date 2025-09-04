-- Add missing total_pixels_owned column to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS total_pixels_owned integer DEFAULT 0;

-- Update the get_or_create_user function to handle the new column
CREATE OR REPLACE FUNCTION get_or_create_user(wallet_addr text)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
    user_uuid uuid;
BEGIN
    -- Try to get existing user
    SELECT id INTO user_uuid 
    FROM public.users 
    WHERE wallet_address = wallet_addr;
    
    -- If user doesn't exist, create one
    IF user_uuid IS NULL THEN
        INSERT INTO public.users (id, wallet_address, total_pixels_owned, created_at, updated_at)
        VALUES (gen_random_uuid(), wallet_addr, 0, NOW(), NOW())
        RETURNING id INTO user_uuid;
    END IF;
    
    RETURN user_uuid;
END;
$$;
