-- Update subscription plans: Rename 'business' to 'ultimate' and update features
-- This migration updates the subscription plans table and existing user subscriptions

-- First, update the subscription_plans table
UPDATE subscription_plans
SET 
  name = 'ultimate',
  display_name = 'Ultimate',
  price_monthly = 24.99,
  price_yearly = 249.99,
  features = '["Everything in Pro", "5 GB secure storage", "API access", "Dedicated support manager", "Advanced security features", "White-label options", "Custom integrations", "Bulk operations", "Custom domain support"]'::jsonb,
  max_connections = -1,
  max_posts_per_month = -1,
  analytics_enabled = TRUE,
  priority_support = TRUE,
  custom_branding = TRUE
WHERE name = 'business';

-- If the update didn't affect any rows, insert the ultimate plan
INSERT INTO subscription_plans (name, display_name, price_monthly, price_yearly, features, max_connections, max_posts_per_month, analytics_enabled, priority_support, custom_branding)
VALUES 
  ('ultimate', 'Ultimate', 24.99, 249.99,
   '["Everything in Pro", "5 GB secure storage", "API access", "Dedicated support manager", "Advanced security features", "White-label options", "Custom integrations", "Bulk operations", "Custom domain support"]'::jsonb,
   -1, -1, TRUE, TRUE, TRUE)
ON CONFLICT (name) DO UPDATE
SET 
  display_name = EXCLUDED.display_name,
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  features = EXCLUDED.features,
  max_connections = EXCLUDED.max_connections,
  max_posts_per_month = EXCLUDED.max_posts_per_month,
  analytics_enabled = EXCLUDED.analytics_enabled,
  priority_support = EXCLUDED.priority_support,
  custom_branding = EXCLUDED.custom_branding;

-- Update Pro plan features
UPDATE subscription_plans
SET 
  price_monthly = 7.99,
  price_yearly = 79.99,
  features = '["Everything in Free", "Unlimited connections", "Unlimited posts", "Advanced analytics", "Priority support", "Premium badge", "File uploads (CVs, documents)", "500 MB secure storage", "Post scheduling", "Data export", "Rich reactions", "Enhanced profile customization", "Early access to new features"]'::jsonb,
  max_connections = -1,
  max_posts_per_month = -1,
  analytics_enabled = TRUE,
  priority_support = TRUE
WHERE name = 'pro';

-- Update Free plan features
UPDATE subscription_plans
SET 
  features = '["Basic professional profile", "Up to 100 connections", "50 posts per month", "Basic analytics", "Community support", "Profile picture uploads", "Direct messaging", "Basic reactions (like only)", "Hashtags & mentions", "Save/bookmark posts", "50 MB storage"]'::jsonb,
  max_connections = 100,
  max_posts_per_month = 50,
  analytics_enabled = TRUE,
  priority_support = FALSE
WHERE name = 'free';

-- Update user subscriptions: Change 'business' plan references to 'ultimate'
UPDATE user_subscriptions
SET plan_id = (SELECT id FROM subscription_plans WHERE name = 'ultimate')
WHERE plan_id = (SELECT id FROM subscription_plans WHERE name = 'business');

-- Update profiles: Change 'business' subscription_plan to 'ultimate'
UPDATE profiles
SET 
  subscription_plan = 'ultimate',
  is_premium = TRUE
WHERE subscription_plan = 'business';

-- Add max_storage_mb column if it doesn't exist
ALTER TABLE subscription_plans 
ADD COLUMN IF NOT EXISTS max_storage_mb INTEGER DEFAULT 50;

-- Update storage limits for each plan
UPDATE subscription_plans SET max_storage_mb = 50 WHERE name = 'free';
UPDATE subscription_plans SET max_storage_mb = 500 WHERE name = 'pro';
UPDATE subscription_plans SET max_storage_mb = 5120 WHERE name = 'ultimate';

-- Add comment for documentation
COMMENT ON COLUMN subscription_plans.max_storage_mb IS 'Maximum storage allocation in MB for this plan';

