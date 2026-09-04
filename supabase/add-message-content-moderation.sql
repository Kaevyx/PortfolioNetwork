-- Add 'message' content type to blocked_content_attempts table
DO $$
BEGIN
  -- Drop existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'blocked_content_attempts_content_type_check'
  ) THEN
    ALTER TABLE blocked_content_attempts DROP CONSTRAINT blocked_content_attempts_content_type_check;
  END IF;

  -- Add new constraint with 'message' type
  ALTER TABLE blocked_content_attempts ADD CONSTRAINT blocked_content_attempts_content_type_check 
  CHECK (content_type IN ('post', 'comment', 'share_comment', 'message', 'other'));
END $$;

