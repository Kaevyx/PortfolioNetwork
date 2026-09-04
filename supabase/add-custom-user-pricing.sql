-- Add custom pricing support for individual users
-- Allows admins to set custom prices per user that override plan prices

-- Add custom price columns to user_subscriptions
ALTER TABLE user_subscriptions
ADD COLUMN IF NOT EXISTS custom_price_monthly NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS custom_price_yearly NUMERIC(10, 2);

-- Add comments for documentation
COMMENT ON COLUMN user_subscriptions.custom_price_monthly IS 'Custom monthly price for this user (overrides plan price if set)';
COMMENT ON COLUMN user_subscriptions.custom_price_yearly IS 'Custom yearly price for this user (overrides plan price if set)';

-- Create index for queries filtering by custom pricing
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_custom_pricing ON user_subscriptions(user_id) 
WHERE custom_price_monthly IS NOT NULL OR custom_price_yearly IS NOT NULL;


