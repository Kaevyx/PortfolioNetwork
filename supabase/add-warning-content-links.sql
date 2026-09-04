-- Add post_id and comment_id columns to content_warnings for linking to reported content
ALTER TABLE content_warnings 
ADD COLUMN IF NOT EXISTS post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS comment_id UUID REFERENCES post_comments(id) ON DELETE SET NULL;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_content_warnings_post_id ON content_warnings(post_id) WHERE post_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_content_warnings_comment_id ON content_warnings(comment_id) WHERE comment_id IS NOT NULL;

COMMENT ON COLUMN content_warnings.post_id IS 'Link to the post that was reported (if warning is for a reported post)';
COMMENT ON COLUMN content_warnings.comment_id IS 'Link to the comment that was reported (if warning is for a reported comment)';

