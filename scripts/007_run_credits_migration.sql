-- Run the credits system migration that was missing
-- Add credits column to users table if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS credits DECIMAL(10,8) DEFAULT 0.00000000;

-- Update existing users to have 0 credits
UPDATE users SET credits = 0.00000000 WHERE credits IS NULL;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_users_credits ON users(credits);
