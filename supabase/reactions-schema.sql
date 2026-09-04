-- Post reactions table (replaces post_likes with multiple reaction types)
CREATE TABLE IF NOT EXISTS post_reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL,
  user_id TEXT NOT NULL, -- Clerk ID
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like', 'love', 'laugh', 'wow', 'sad', 'angry')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, user_id), -- One reaction per user per post (can change reaction type)
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES profiles(clerk_id) ON DELETE CASCADE
);

-- Migrate existing likes to reactions (if post_likes table exists)
-- This will run automatically when the table is created
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'post_likes') THEN
    INSERT INTO post_reactions (post_id, user_id, reaction_type, created_at)
    SELECT post_id, user_id, 'like', created_at
    FROM post_likes
    ON CONFLICT (post_id, user_id) DO NOTHING;
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_post_reactions_post_id ON post_reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_post_reactions_user_id ON post_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_post_reactions_type ON post_reactions(reaction_type);

-- Update trigger for reactions
DROP TRIGGER IF EXISTS update_post_reactions_updated_at ON post_reactions;
CREATE TRIGGER update_post_reactions_updated_at BEFORE UPDATE ON post_reactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();






