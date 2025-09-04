-- Remove foreign key constraints that reference non-existent users table
-- Drop foreign key constraints that might be referencing a users table
ALTER TABLE IF EXISTS pixel_blocks DROP CONSTRAINT IF EXISTS pixel_blocks_owner_id_fkey;
ALTER TABLE IF EXISTS pixels DROP CONSTRAINT IF EXISTS pixels_owner_id_fkey;
ALTER TABLE IF EXISTS likes DROP CONSTRAINT IF EXISTS likes_user_id_fkey;
ALTER TABLE IF EXISTS purchases DROP CONSTRAINT IF EXISTS purchases_user_id_fkey;

-- Make owner_id and user_id columns nullable since we don't have a users table
ALTER TABLE pixel_blocks ALTER COLUMN owner_id DROP NOT NULL;
ALTER TABLE pixels ALTER COLUMN owner_id DROP NOT NULL;
ALTER TABLE likes ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE purchases ALTER COLUMN user_id DROP NOT NULL;

-- Add comments to clarify the purpose of these fields
COMMENT ON COLUMN pixel_blocks.owner_id IS 'Legacy field - use wallet_address for ownership tracking';
COMMENT ON COLUMN pixels.owner_id IS 'Legacy field - use wallet_address for ownership tracking';
COMMENT ON COLUMN likes.user_id IS 'Legacy field - not currently used';
COMMENT ON COLUMN purchases.user_id IS 'Legacy field - use wallet_address for user tracking';
