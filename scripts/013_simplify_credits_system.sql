-- Create simple credits table using wallet address as key
-- Drop existing users table and create a simple credits table
DROP TABLE IF EXISTS users CASCADE;

-- Create simple credits table with wallet address as primary key
CREATE TABLE IF NOT EXISTS wallet_credits (
  wallet_address TEXT PRIMARY KEY,
  credits BIGINT DEFAULT 0,
  username TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Update payments table to reference wallet_address directly
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_user_id_fkey;
ALTER TABLE payments DROP COLUMN IF EXISTS user_id;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS wallet_address TEXT;

-- Update pixel_blocks table to reference wallet_address directly  
ALTER TABLE pixel_blocks DROP CONSTRAINT IF EXISTS pixel_blocks_user_id_fkey;
ALTER TABLE pixel_blocks DROP COLUMN IF EXISTS user_id;
ALTER TABLE pixel_blocks ADD COLUMN IF NOT EXISTS wallet_address TEXT;
