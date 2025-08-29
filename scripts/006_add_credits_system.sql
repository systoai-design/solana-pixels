-- Add credits column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS credits NUMERIC DEFAULT 0;

-- Create credits_transactions table to track top-ups and spending
CREATE TABLE IF NOT EXISTS credits_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('topup', 'spend')),
  description TEXT,
  transaction_signature TEXT, -- For blockchain top-ups
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_credits_transactions_user_id ON credits_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credits_transactions_created_at ON credits_transactions(created_at);

-- Enable RLS
ALTER TABLE credits_transactions ENABLE ROW LEVEL SECURITY;

-- Allow public access for now (can be restricted later)
CREATE POLICY IF NOT EXISTS "Allow all operations on credits_transactions" ON credits_transactions
FOR ALL USING (true) WITH CHECK (true);
