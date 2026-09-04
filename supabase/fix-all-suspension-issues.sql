-- COMPREHENSIVE FIX FOR SUSPENSION AND PRICING ISSUES
-- This fixes all triggers and ensures suspended subscriptions keep their plan name

-- 1. Fix the main subscription update trigger to skip profile updates for suspended status
CREATE OR REPLACE FUNCTION update_user_subscription_status()
RETURNS TRIGGER AS $$
DECLARE
  v_plan_name TEXT;
  v_renewal_date TIMESTAMP WITH TIME ZONE;
BEGIN
  -- CRITICAL: If status is 'suspended', DO NOT update profile at all
  -- Let the client code handle suspended subscriptions explicitly
  IF NEW.status = 'suspended' THEN
    RETURN NEW; -- Skip all profile updates for suspended subscriptions
  END IF;
  
  -- Get plan name from subscription_plans
  SELECT name INTO v_plan_name
  FROM subscription_plans
  WHERE id = NEW.plan_id;
  
  -- If plan_id is null or plan not found, skip update
  IF v_plan_name IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Calculate renewal date
  v_renewal_date := get_subscription_renewal_date(NEW.user_id);
  
  -- Update profile subscription status (only for non-suspended statuses)
  UPDATE profiles
  SET 
    subscription_plan = CASE 
      WHEN NEW.status = 'cancelled' THEN 'free'
      ELSE v_plan_name
    END,
    is_premium = CASE 
      WHEN NEW.status = 'cancelled' THEN FALSE
      ELSE (v_plan_name != 'free')
    END,
    subscription_renewal_date = v_renewal_date,
    subscription_trial_end = NEW.trial_end,
    subscription_last_limit_reset = COALESCE(NEW.last_limit_reset, NEW.current_period_start)
  WHERE clerk_id = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure trigger is active
DROP TRIGGER IF EXISTS on_subscription_update ON user_subscriptions;
CREATE TRIGGER on_subscription_update
  AFTER INSERT OR UPDATE ON user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_subscription_status();

-- 2. Fix the account suspension trigger to NOT downgrade subscription plans
-- This trigger runs when profiles.is_suspended changes, but should NOT change subscription_plan
CREATE OR REPLACE FUNCTION suspend_subscription_on_account_suspension()
RETURNS TRIGGER AS $$
BEGIN
  -- If account is being suspended, suspend all active subscriptions
  IF NEW.is_suspended = TRUE AND (OLD.is_suspended IS NULL OR OLD.is_suspended = FALSE) THEN
    UPDATE user_subscriptions
    SET 
      status = 'suspended',
      cancelled_at = NULL,  -- Don't set cancelled_at for suspension
      cancellation_reason = 'Account suspended: ' || COALESCE(NEW.suspension_reason, 'No reason provided')
    WHERE user_id = NEW.clerk_id
      AND status IN ('active', 'trial');
    
    -- DO NOT downgrade to free plan - keep the original plan name
    -- The client code will handle preserving the plan name
  END IF;
  
  -- If account is being unsuspended, restore subscription if it was suspended due to account suspension
  IF NEW.is_suspended = FALSE AND OLD.is_suspended = TRUE THEN
    WITH suspended_sub AS (
      SELECT id, plan_id
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
    
    -- Restore premium status based on the subscription plan
    IF FOUND THEN
      UPDATE profiles
      SET 
        subscription_plan = (SELECT sp.name FROM user_subscriptions us 
                          JOIN subscription_plans sp ON us.plan_id = sp.id 
                          WHERE us.user_id = NEW.clerk_id AND us.status = 'active' 
                          ORDER BY us.created_at DESC LIMIT 1),
        is_premium = (SELECT sp.name != 'free' FROM user_subscriptions us 
                     JOIN subscription_plans sp ON us.plan_id = sp.id 
                     WHERE us.user_id = NEW.clerk_id AND us.status = 'active' 
                     ORDER BY us.created_at DESC LIMIT 1)
      WHERE clerk_id = NEW.clerk_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS trigger_suspend_subscription_on_account_suspension ON profiles;
CREATE TRIGGER trigger_suspend_subscription_on_account_suspension
  AFTER UPDATE OF is_suspended ON profiles
  FOR EACH ROW
  WHEN (OLD.is_suspended IS DISTINCT FROM NEW.is_suspended)
  EXECUTE FUNCTION suspend_subscription_on_account_suspension();

