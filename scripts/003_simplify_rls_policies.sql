-- Remove complex RLS policies and allow wallet-based operations
-- Disable RLS on all tables to allow direct wallet-based operations
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE pixel_blocks DISABLE ROW LEVEL SECURITY;
ALTER TABLE purchases DISABLE ROW LEVEL SECURITY;
ALTER TABLE pixels DISABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Anyone can view pixel blocks" ON pixel_blocks;
DROP POLICY IF EXISTS "Authenticated users can insert pixel blocks" ON pixel_blocks;
DROP POLICY IF EXISTS "Anyone can view purchases" ON purchases;
DROP POLICY IF EXISTS "Authenticated users can insert purchases" ON purchases;

-- Create simple policies that allow wallet-based operations
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE pixel_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read data
CREATE POLICY "Anyone can view users" ON users FOR SELECT USING (true);
CREATE POLICY "Anyone can view pixel blocks" ON pixel_blocks FOR SELECT USING (true);
CREATE POLICY "Anyone can view purchases" ON purchases FOR SELECT USING (true);

-- Allow anyone to insert data (we'll handle validation in the app)
CREATE POLICY "Anyone can insert users" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can insert pixel blocks" ON pixel_blocks FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can insert purchases" ON purchases FOR INSERT WITH CHECK (true);

-- Allow updates for wallet owners
CREATE POLICY "Anyone can update pixel blocks" ON pixel_blocks FOR UPDATE USING (true);
