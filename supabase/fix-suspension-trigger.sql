-- Fix the trigger to preserve plan name when subscription is suspended
-- The trigger should NOT downgrade users to free when suspending

-- Update the trigger function to check status before updating profile
CREATE OR REPLACE FUNCTION update_user_subscription_status()
RETURNS TRIGGER AS $$
DECLARE
  v_plan_name TEXT;
  v_renewal_date TIMESTAMP WITH TIME ZONE;
  v_current_plan_name TEXT;
BEGIN
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
  
  -- Get current plan name from profile BEFORE updating
  SELECT subscription_plan INTO v_current_plan_name
  FROM profiles
  WHERE clerk_id = NEW.user_id;
  
  -- Update profile subscription status
  -- CRITICAL: If status is 'suspended', preserve the existing plan name (pro/ultimate)
  -- Do NOT downgrade to free when suspending - keep the original plan name
  UPDATE profiles
  SET 
    subscription_plan = CASE 
      WHEN NEW.status = 'suspended' THEN 
        -- When suspended, keep the current plan name (pro/ultimate), not free
        COALESCE(v_current_plan_name, v_plan_name)
      WHEN NEW.status = 'cancelled' THEN 
        -- Only downgrade to free when cancelled
        'free'
      ELSE 
        -- For active/trial, use the plan name from subscription
        v_plan_name
    END,
    is_premium = CASE 
      WHEN NEW.status = 'suspended' THEN 
        -- When suspended, keep premium status based on current plan
        (COALESCE(v_current_plan_name, v_plan_name) != 'free')
      WHEN NEW.status = 'cancelled' THEN 
        -- When cancelled, set to not premium
        FALSE
      ELSE 
        -- For active/trial, set based on plan
        (v_plan_name != 'free')
    END,
    subscription_renewal_date = v_renewal_date,
    subscription_trial_end = NEW.trial_end,
    subscription_last_limit_reset = COALESCE(NEW.last_limit_reset, NEW.current_period_start)
  WHERE clerk_id = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- The trigger should already exist, but ensure it's active
DROP TRIGGER IF EXISTS on_subscription_update ON user_subscriptions;
CREATE TRIGGER on_subscription_update
  AFTER INSERT OR UPDATE ON user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_subscription_status();

