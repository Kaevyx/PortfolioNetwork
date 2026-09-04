-- SIMPLIFIED SUSPENSION LOGIC
-- The trigger will completely skip profile updates when status is 'suspended'
-- This allows client code to handle suspended subscriptions explicitly
-- This prevents any automatic downgrades to free

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

