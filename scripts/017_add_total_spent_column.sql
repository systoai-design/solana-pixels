-- Add missing total_spent column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_spent NUMERIC DEFAULT 0;

-- Update the get_or_create_user function to handle total_spent column
CREATE OR REPLACE FUNCTION get_or_create_user(wallet_addr TEXT)
RETURNS UUID AS $$
DECLARE
    user_uuid UUID;
BEGIN
    -- Try to find existing user
    SELECT id INTO user_uuid FROM users WHERE wallet_address = wallet_addr;
    
    -- If user doesn't exist, create one
    IF user_uuid IS NULL THEN
        INSERT INTO users (wallet_address, total_pixels_owned, total_spent, created_at, updated_at)
        VALUES (wallet_addr, 0, 0, NOW(), NOW())
        RETURNING id INTO user_uuid;
    END IF;
    
    RETURN user_uuid;
END;
$$ LANGUAGE plpgsql;
