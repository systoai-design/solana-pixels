-- Create payments table to track verified transactions
CREATE TABLE IF NOT EXISTS payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  transaction_signature TEXT UNIQUE NOT NULL,
  amount_sol DECIMAL(10, 9) NOT NULL,
  credits_granted INTEGER NOT NULL,
  status TEXT DEFAULT 'verified',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_transaction_signature ON payments(transaction_signature);

-- Add RLS policies for payments table
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on payments" ON payments
FOR ALL USING (true) WITH CHECK (true);
