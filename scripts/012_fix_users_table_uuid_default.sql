-- Fix the users table to have proper UUID generation
-- This ensures the id column auto-generates UUIDs when not provided

-- Add DEFAULT gen_random_uuid() to the id column
ALTER TABLE users ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Ensure the extension is enabled for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Alternative: Use gen_random_uuid() which is built-in to newer PostgreSQL versions
-- The above ALTER statement should work with gen_random_uuid()
