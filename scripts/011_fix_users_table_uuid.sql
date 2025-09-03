-- Add DEFAULT UUID generation to users table id column
ALTER TABLE users ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Ensure the uuid-ossp extension is enabled for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
