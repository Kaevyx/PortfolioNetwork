-- Update get_user_subscription_details to include custom prices
-- This allows users to see their custom pricing on the billing page

-- Drop existing function first to allow return type change
DROP FUNCTION IF EXISTS get_user_subscription_details(TEXT);

-- Recreate function with new return type including custom prices
CREATE FUNCTION get_user_subscription_details(
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
  last_limit_reset TIMESTAMP WITH TIME ZONE,
  custom_price_monthly NUMERIC(10, 2),
  custom_price_yearly NUMERIC(10, 2),
  price_monthly NUMERIC(10, 2),
  price_yearly NUMERIC(10, 2)
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
    us.last_limit_reset,
    us.custom_price_monthly,
    us.custom_price_yearly,
    -- Return the effective price (0 if free/lifetime, custom if set, otherwise plan price)
    CASE 
      WHEN us.billing_cycle IN ('free', 'lifetime') THEN 0
      ELSE COALESCE(us.custom_price_monthly, sp.price_monthly)
    END as price_monthly,
    CASE 
      WHEN us.billing_cycle IN ('free', 'lifetime') THEN 0
      ELSE COALESCE(us.custom_price_yearly, sp.price_yearly)
    END as price_yearly
  FROM user_subscriptions us
  JOIN subscription_plans sp ON us.plan_id = sp.id
  WHERE us.user_id = p_user_id
    AND us.status IN ('active', 'trial', 'suspended')
  ORDER BY us.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

