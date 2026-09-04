-- Fix foreign key relationship for storage_files table
-- This ensures the foreign key exists for the AdminFileModeration query

-- Drop existing foreign key if it exists with wrong name
ALTER TABLE storage_files 
DROP CONSTRAINT IF EXISTS storage_files_user_id_fkey;

-- Add foreign key with explicit name
ALTER TABLE storage_files
ADD CONSTRAINT storage_files_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES profiles(clerk_id) 
ON DELETE CASCADE;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_storage_files_user_id ON storage_files(user_id);

-- Verify the foreign key exists
SELECT 
  conname AS constraint_name,
  conrelid::regclass AS table_name,
  confrelid::regclass AS referenced_table
FROM pg_constraint
WHERE conname = 'storage_files_user_id_fkey';






