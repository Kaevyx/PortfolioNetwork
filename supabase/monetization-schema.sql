-- Subscription plans table
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE, -- 'free', 'pro', 'business'
  display_name TEXT NOT NULL,
  price_monthly DECIMAL(10, 2) DEFAULT 0,
  price_yearly DECIMAL(10, 2) DEFAULT 0,
  features JSONB, -- Array of features included in this plan
  max_connections INTEGER DEFAULT 100,
  max_posts_per_month INTEGER DEFAULT 50,
  analytics_enabled BOOLEAN DEFAULT TRUE,
  priority_support BOOLEAN DEFAULT FALSE,
  custom_branding BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User subscriptions table
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL UNIQUE, -- Clerk ID
  plan_id UUID NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'cancelled', 'expired', 'trial')),
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES profiles(clerk_id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id) REFERENCES subscription_plans(id)
);

-- Add subscription status to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'free';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);

-- Insert default plans
INSERT INTO subscription_plans (name, display_name, price_monthly, price_yearly, features, max_connections, max_posts_per_month, analytics_enabled, priority_support, custom_branding)
VALUES 
  ('free', 'Free', 0, 0, 
   '["Basic profile", "Up to 100 connections", "50 posts/month", "Basic analytics"]'::jsonb,
   100, 50, TRUE, FALSE, FALSE),
  ('pro', 'Pro', 9.99, 99.99,
   '["Everything in Free", "Unlimited connections", "Unlimited posts", "Advanced analytics", "Priority support", "Premium badge"]'::jsonb,
   -1, -1, TRUE, TRUE, FALSE),
  ('business', 'Business', 29.99, 299.99,
   '["Everything in Pro", "Custom branding", "Team features", "API access", "Dedicated support"]'::jsonb,
   -1, -1, TRUE, TRUE, TRUE)
ON CONFLICT (name) DO NOTHING;

-- Function to update subscription status
CREATE OR REPLACE FUNCTION update_user_subscription_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update profile subscription status
  UPDATE profiles
  SET 
    subscription_plan = (SELECT name FROM subscription_plans WHERE id = NEW.plan_id),
    is_premium = (SELECT name FROM subscription_plans WHERE id = NEW.plan_id) != 'free'
  WHERE clerk_id = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update subscription status
DROP TRIGGER IF EXISTS on_subscription_update ON user_subscriptions;
CREATE TRIGGER on_subscription_update
  AFTER INSERT OR UPDATE ON user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_subscription_status();

