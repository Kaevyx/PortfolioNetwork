-- Add 'free' and 'lifetime' options to billing_cycle
-- This allows admins to give users free access to Pro/Ultimate plans

-- Drop existing constraint
ALTER TABLE user_subscriptions
DROP CONSTRAINT IF EXISTS user_subscriptions_billing_cycle_check;

-- Add new constraint with free and lifetime options
ALTER TABLE user_subscriptions
ADD CONSTRAINT user_subscriptions_billing_cycle_check 
CHECK (billing_cycle IN ('free', 'monthly', 'yearly', 'lifetime'));

-- Update comment
COMMENT ON COLUMN user_subscriptions.billing_cycle IS 'Billing cycle: free (no charge), monthly, yearly, or lifetime (permanent free access)';


