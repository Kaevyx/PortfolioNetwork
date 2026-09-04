-- Comment Reactions Schema
-- Allows users to react to comments with multiple reaction types

-- Create comment_reactions table
CREATE TABLE IF NOT EXISTS comment_reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  comment_id UUID NOT NULL REFERENCES post_comments(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL, -- Clerk ID
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like', 'love', 'laugh', 'wow', 'sad', 'angry')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(comment_id, user_id) -- One reaction per user per comment
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_comment_reactions_comment_id ON comment_reactions(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_reactions_user_id ON comment_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_comment_reactions_reaction_type ON comment_reactions(reaction_type);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_comment_reactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_comment_reactions_updated_at ON comment_reactions;
CREATE TRIGGER update_comment_reactions_updated_at
  BEFORE UPDATE ON comment_reactions
  FOR EACH ROW
  EXECUTE FUNCTION update_comment_reactions_updated_at();






