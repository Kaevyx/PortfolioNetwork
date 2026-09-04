-- Add Drugs, Adult Content, and Illegal Activities Categories to Content Moderation System

-- Update blocked_keywords category constraint to include new categories
ALTER TABLE blocked_keywords
DROP CONSTRAINT IF EXISTS blocked_keywords_category_check;

ALTER TABLE blocked_keywords
ADD CONSTRAINT blocked_keywords_category_check 
CHECK (category IN (
  'violence',
  'hate_speech',
  'bullying',
  'sexual_harassment',
  'self_harm',
  'offensive_language',
  'doxxing',
  'homophobia',
  'body_shaming',
  'gender_discrimination',
  'racism',
  'drugs',
  'adult_content',
  'illegal_activities',
  'spam',
  'scam',
  'other'
));

