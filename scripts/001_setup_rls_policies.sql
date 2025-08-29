-- Enable RLS on all tables and create proper policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE pixel_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE pixels ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

-- Users table policies - allow users to manage their own records
CREATE POLICY "users_select_own" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_insert_own" ON users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "users_update_own" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "users_delete_own" ON users FOR DELETE USING (auth.uid() = id);

-- Pixel blocks policies - allow users to view all but only manage their own
CREATE POLICY "pixel_blocks_select_all" ON pixel_blocks FOR SELECT TO authenticated USING (true);
CREATE POLICY "pixel_blocks_insert_own" ON pixel_blocks FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "pixel_blocks_update_own" ON pixel_blocks FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "pixel_blocks_delete_own" ON pixel_blocks FOR DELETE USING (auth.uid() = owner_id);

-- Pixels policies - allow users to view all but only manage their own
CREATE POLICY "pixels_select_all" ON pixels FOR SELECT TO authenticated USING (true);
CREATE POLICY "pixels_insert_own" ON pixels FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "pixels_update_own" ON pixels FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "pixels_delete_own" ON pixels FOR DELETE USING (auth.uid() = owner_id);

-- Purchases policies - allow users to view all but only manage their own
CREATE POLICY "purchases_select_all" ON purchases FOR SELECT TO authenticated USING (true);
CREATE POLICY "purchases_insert_own" ON purchases FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "purchases_update_own" ON purchases FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "purchases_delete_own" ON purchases FOR DELETE USING (auth.uid() = user_id);

-- Likes policies - allow users to manage their own likes
CREATE POLICY "likes_select_all" ON likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "likes_insert_own" ON likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "likes_delete_own" ON likes FOR DELETE USING (auth.uid() = user_id);
