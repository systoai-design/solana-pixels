-- Ensure the credits column exists in the users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS credits DECIMAL(10,9) DEFAULT 0;

-- Update any existing users to have 0 credits if null
UPDATE users SET credits = 0 WHERE credits IS NULL;
