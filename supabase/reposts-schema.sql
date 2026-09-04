-- Reposts table for sharing/reposting other users' posts
CREATE TABLE IF NOT EXISTS reposts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL, -- Clerk ID of the user reposting
  original_post_id UUID NOT NULL, -- The original post being reposted
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (original_post_id) REFERENCES posts(id) ON DELETE CASCADE,
  UNIQUE(user_id, original_post_id) -- A user can only repost a post once
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_reposts_user_id ON reposts(user_id);
CREATE INDEX IF NOT EXISTS idx_reposts_original_post_id ON reposts(original_post_id);






