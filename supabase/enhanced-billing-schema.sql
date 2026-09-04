-- Enhanced Billing Schema
-- Adds trial support, renewal date tracking, and limit reset management

-- Add trial and limit tracking columns to user_subscriptions
ALTER TABLE user_subscriptions
ADD COLUMN IF NOT EXISTS is_trial BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS trial_start TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS trial_end TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_limit_reset TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
ADD COLUMN IF NOT EXISTS billing_cycle TEXT CHECK (billing_cycle IN ('monthly', 'yearly')) DEFAULT 'monthly';

-- Add renewal date tracking to profiles (for quick access)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS subscription_renewal_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS subscription_trial_end TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS subscription_last_limit_reset TIMESTAMP WITH TIME ZONE;

-- Create index for renewal date queries
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_renewal ON user_subscriptions(current_period_end) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_trial ON user_subscriptions(trial_end) WHERE is_trial = TRUE;

-- Function to calculate renewal date based on subscription
CREATE OR REPLACE FUNCTION get_subscription_renewal_date(
  p_user_id TEXT
) RETURNS TIMESTAMP WITH TIME ZONE AS $$
DECLARE
  v_renewal_date TIMESTAMP WITH TIME ZONE;
  v_subscription RECORD;
BEGIN
  SELECT * INTO v_subscription
  FROM user_subscriptions
  WHERE user_id = p_user_id
    AND status IN ('active', 'trial')
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  
  -- If trial, return trial end date
  IF v_subscription.is_trial AND v_subscription.trial_end IS NOT NULL THEN
    RETURN v_subscription.trial_end;
  END IF;
  
  -- Otherwise return current_period_end
  RETURN v_subscription.current_period_end;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if limits should be reset
CREATE OR REPLACE FUNCTION should_reset_limits(
  p_user_id TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_subscription RECORD;
  v_last_reset TIMESTAMP WITH TIME ZONE;
  v_renewal_date TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT * INTO v_subscription
  FROM user_subscriptions
  WHERE user_id = p_user_id
    AND status IN ('active', 'trial')
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Get renewal date
  v_renewal_date := get_subscription_renewal_date(p_user_id);
  
  IF v_renewal_date IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Get last reset date
  v_last_reset := COALESCE(
    v_subscription.last_limit_reset,
    v_subscription.current_period_start,
    NOW() - INTERVAL '1 month'
  );
  
  -- Reset if last reset was before the renewal date
  -- This handles the case where renewal date has passed
  RETURN v_last_reset < v_renewal_date AND NOW() >= v_renewal_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reset user limits on renewal
CREATE OR REPLACE FUNCTION reset_user_limits(
  p_user_id TEXT
) RETURNS VOID AS $$
DECLARE
  v_renewal_date TIMESTAMP WITH TIME ZONE;
BEGIN
  v_renewal_date := get_subscription_renewal_date(p_user_id);
  
  IF v_renewal_date IS NULL THEN
    RETURN;
  END IF;
  
  -- Update last_limit_reset
  UPDATE user_subscriptions
  SET last_limit_reset = NOW()
  WHERE user_id = p_user_id
    AND status IN ('active', 'trial');
  
  -- Update profile
  UPDATE profiles
  SET subscription_last_limit_reset = NOW()
  WHERE clerk_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced trigger to update profile subscription info
CREATE OR REPLACE FUNCTION update_user_subscription_status()
RETURNS TRIGGER AS $$
DECLARE
  v_plan_name TEXT;
  v_renewal_date TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get plan name
  SELECT name INTO v_plan_name
  FROM subscription_plans
  WHERE id = NEW.plan_id;
  
  -- Calculate renewal date
  v_renewal_date := get_subscription_renewal_date(NEW.user_id);
  
  -- Update profile subscription status
  UPDATE profiles
  SET 
    subscription_plan = v_plan_name,
    is_premium = v_plan_name != 'free',
    subscription_renewal_date = v_renewal_date,
    subscription_trial_end = NEW.trial_end,
    subscription_last_limit_reset = COALESCE(NEW.last_limit_reset, NEW.current_period_start)
  WHERE clerk_id = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_subscription_update ON user_subscriptions;
CREATE TRIGGER on_subscription_update
  AFTER INSERT OR UPDATE ON user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_subscription_status();

-- Function to start a trial
CREATE OR REPLACE FUNCTION start_trial(
  p_user_id TEXT,
  p_plan_name TEXT,
  p_trial_days INTEGER DEFAULT 7
) RETURNS UUID AS $$
DECLARE
  v_plan_id UUID;
  v_subscription_id UUID;
  v_trial_start TIMESTAMP WITH TIME ZONE;
  v_trial_end TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get plan ID
  SELECT id INTO v_plan_id
  FROM subscription_plans
  WHERE name = p_plan_name;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Plan % not found', p_plan_name;
  END IF;
  
  -- Check if user already has an active subscription or trial
  IF EXISTS (
    SELECT 1 FROM user_subscriptions
    WHERE user_id = p_user_id
      AND status IN ('active', 'trial')
  ) THEN
    RAISE EXCEPTION 'User already has an active subscription or trial';
  END IF;
  
  -- Check if user has used a trial before
  IF EXISTS (
    SELECT 1 FROM user_subscriptions
    WHERE user_id = p_user_id
      AND is_trial = TRUE
  ) THEN
    RAISE EXCEPTION 'User has already used a trial';
  END IF;
  
  -- Set trial dates
  v_trial_start := NOW();
  v_trial_end := NOW() + (p_trial_days || ' days')::INTERVAL;
  
  -- Create trial subscription
  INSERT INTO user_subscriptions (
    user_id,
    plan_id,
    status,
    is_trial,
    trial_start,
    trial_end,
    current_period_start,
    current_period_end,
    last_limit_reset
  ) VALUES (
    p_user_id,
    v_plan_id,
    'trial',
    TRUE,
    v_trial_start,
    v_trial_end,
    v_trial_start,
    v_trial_end,
    v_trial_start
  )
  RETURNING id INTO v_subscription_id;
  
  RETURN v_subscription_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cancel subscription
CREATE OR REPLACE FUNCTION cancel_subscription(
  p_user_id TEXT,
  p_reason TEXT DEFAULT NULL,
  p_cancel_immediately BOOLEAN DEFAULT FALSE
) RETURNS VOID AS $$
DECLARE
  v_subscription RECORD;
BEGIN
  SELECT * INTO v_subscription
  FROM user_subscriptions
  WHERE user_id = p_user_id
    AND status IN ('active', 'trial')
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No active subscription found';
  END IF;
  
  IF p_cancel_immediately THEN
    -- Cancel immediately (for trials or admin actions)
    UPDATE user_subscriptions
    SET 
      status = 'cancelled',
      cancelled_at = NOW(),
      cancellation_reason = p_reason,
      cancel_at_period_end = FALSE
    WHERE id = v_subscription.id;
    
    -- Downgrade to free
    UPDATE profiles
    SET subscription_plan = 'free', is_premium = FALSE
    WHERE clerk_id = p_user_id;
  ELSE
    -- Cancel at period end
    UPDATE user_subscriptions
    SET 
      cancel_at_period_end = TRUE,
      cancelled_at = NOW(),
      cancellation_reason = p_reason
    WHERE id = v_subscription.id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user subscription details with plan info
CREATE OR REPLACE FUNCTION get_user_subscription_details(
  p_user_id TEXT
) RETURNS TABLE (
  subscription_id UUID,
  plan_name TEXT,
  plan_display_name TEXT,
  status TEXT,
  is_trial BOOLEAN,
  trial_start TIMESTAMP WITH TIME ZONE,
  trial_end TIMESTAMP WITH TIME ZONE,
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  renewal_date TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  billing_cycle TEXT,
  last_limit_reset TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    us.id,
    sp.name,
    sp.display_name,
    us.status,
    us.is_trial,
    us.trial_start,
    us.trial_end,
    us.current_period_start,
    us.current_period_end,
    get_subscription_renewal_date(p_user_id) as renewal_date,
    us.cancel_at_period_end,
    us.cancelled_at,
    us.billing_cycle,
    us.last_limit_reset
  FROM user_subscriptions us
  JOIN subscription_plans sp ON us.plan_id = sp.id
  WHERE us.user_id = p_user_id
    AND us.status IN ('active', 'trial')
  ORDER BY us.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update status check constraint to include 'trial' and 'suspended'
ALTER TABLE user_subscriptions
DROP CONSTRAINT IF EXISTS user_subscriptions_status_check;

ALTER TABLE user_subscriptions
ADD CONSTRAINT user_subscriptions_status_check 
CHECK (status IN ('active', 'cancelled', 'expired', 'trial', 'suspended'));

-- Add comments for documentation
COMMENT ON COLUMN user_subscriptions.is_trial IS 'Whether this subscription is a trial';
COMMENT ON COLUMN user_subscriptions.trial_start IS 'When the trial started';
COMMENT ON COLUMN user_subscriptions.trial_end IS 'When the trial ends';
COMMENT ON COLUMN user_subscriptions.last_limit_reset IS 'Last time monthly limits were reset';
COMMENT ON COLUMN user_subscriptions.cancelled_at IS 'When the subscription was cancelled';

-- Function to suspend subscription when account is suspended
CREATE OR REPLACE FUNCTION suspend_subscription_on_account_suspension()
RETURNS TRIGGER AS $$
BEGIN
  -- If account is being suspended, suspend all active subscriptions
  IF NEW.is_suspended = TRUE AND (OLD.is_suspended IS NULL OR OLD.is_suspended = FALSE) THEN
    UPDATE user_subscriptions
    SET 
      status = 'suspended',
      cancelled_at = NOW(),
      cancellation_reason = 'Account suspended: ' || COALESCE(NEW.suspension_reason, 'No reason provided')
    WHERE user_id = NEW.clerk_id
      AND status IN ('active', 'trial');
    
    -- Downgrade to free plan
    UPDATE profiles
    SET subscription_plan = 'free', is_premium = FALSE
    WHERE clerk_id = NEW.clerk_id;
  END IF;
  
  -- If account is being unsuspended, restore subscription if it was suspended due to account suspension
  IF NEW.is_suspended = FALSE AND OLD.is_suspended = TRUE THEN
    -- Find the most recent suspended subscription
    WITH suspended_sub AS (
      SELECT id, plan_name
      FROM user_subscriptions
      WHERE user_id = NEW.clerk_id
        AND status = 'suspended'
        AND cancellation_reason LIKE 'Account suspended%'
      ORDER BY created_at DESC
      LIMIT 1
    )
    UPDATE user_subscriptions
    SET 
      status = 'active',
      cancelled_at = NULL,
      cancellation_reason = NULL
    FROM suspended_sub
    WHERE user_subscriptions.id = suspended_sub.id;
    
    -- Restore premium status if subscription was restored
    IF FOUND THEN
      UPDATE profiles
      SET 
        subscription_plan = (SELECT plan_name FROM user_subscriptions WHERE user_id = NEW.clerk_id AND status = 'active' ORDER BY created_at DESC LIMIT 1),
        is_premium = TRUE
      WHERE clerk_id = NEW.clerk_id
        AND subscription_plan = 'free';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically suspend/restore subscriptions when account is suspended/unsuspended
DROP TRIGGER IF EXISTS trigger_suspend_subscription_on_account_suspension ON profiles;
CREATE TRIGGER trigger_suspend_subscription_on_account_suspension
  AFTER UPDATE OF is_suspended ON profiles
  FOR EACH ROW
  WHEN (OLD.is_suspended IS DISTINCT FROM NEW.is_suspended)
  EXECUTE FUNCTION suspend_subscription_on_account_suspension();
COMMENT ON COLUMN user_subscriptions.cancellation_reason IS 'Reason for cancellation';
COMMENT ON COLUMN user_subscriptions.billing_cycle IS 'Monthly or yearly billing cycle';

