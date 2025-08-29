-- Completely disable RLS policies to allow wallet-based writes
ALTER TABLE pixel_blocks DISABLE ROW LEVEL SECURITY;
ALTER TABLE purchases DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE pixels DISABLE ROW LEVEL SECURITY;

-- Grant full access to authenticated and anonymous users
GRANT ALL ON pixel_blocks TO anon, authenticated;
GRANT ALL ON purchases TO anon, authenticated;
GRANT ALL ON users TO anon, authenticated;
GRANT ALL ON pixels TO anon, authenticated;

-- Grant usage on sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
