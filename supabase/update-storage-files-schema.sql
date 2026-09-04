-- Update storage_files table to match the code expectations
-- This aligns the schema with the file moderation system and new column names

-- Add missing columns if they don't exist
ALTER TABLE storage_files
ADD COLUMN IF NOT EXISTS profile_id TEXT,
ADD COLUMN IF NOT EXISTS object_path TEXT,
ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT,
ADD COLUMN IF NOT EXISTS moderation_status TEXT CHECK (moderation_status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS reviewed_by TEXT,
ADD COLUMN IF NOT EXISTS review_notes TEXT,
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE;

-- Migrate data from old columns to new columns if needed
UPDATE storage_files
SET 
  profile_id = COALESCE(profile_id, user_id),
  object_path = COALESCE(object_path, file_path),
  file_size_bytes = COALESCE(file_size_bytes, file_size)
WHERE profile_id IS NULL OR object_path IS NULL OR file_size_bytes IS NULL;

-- Make new columns NOT NULL after migration (if you want to enforce this)
-- ALTER TABLE storage_files ALTER COLUMN profile_id SET NOT NULL;
-- ALTER TABLE storage_files ALTER COLUMN object_path SET NOT NULL;
-- ALTER TABLE IF EXISTS storage_files ALTER COLUMN file_size_bytes SET NOT NULL;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_storage_files_profile_id ON storage_files(profile_id);
CREATE INDEX IF NOT EXISTS idx_storage_files_object_path ON storage_files(object_path);
CREATE INDEX IF NOT EXISTS idx_storage_files_moderation_status ON storage_files(moderation_status);

-- Update foreign key if profile_id is being used
-- Note: Keep user_id for backward compatibility, but prefer profile_id
-- ALTER TABLE storage_files DROP CONSTRAINT IF EXISTS storage_files_user_id_fkey;
-- ALTER TABLE storage_files ADD CONSTRAINT storage_files_profile_id_fkey 
--   FOREIGN KEY (profile_id) REFERENCES profiles(clerk_id) ON DELETE CASCADE;






