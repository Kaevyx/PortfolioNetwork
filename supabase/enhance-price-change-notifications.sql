-- Enhance price change notifications in log_billing_event function
-- This adds specific messaging for custom price changes

CREATE OR REPLACE FUNCTION log_billing_event(
  p_user_id TEXT,
  p_event_type TEXT,
  p_subscription_id UUID DEFAULT NULL,
  p_performed_by TEXT DEFAULT NULL,
  p_old_plan_name TEXT DEFAULT NULL,
  p_new_plan_name TEXT DEFAULT NULL,
  p_old_billing_cycle TEXT DEFAULT NULL,
  p_new_billing_cycle TEXT DEFAULT NULL,
  p_old_price_monthly NUMERIC DEFAULT NULL,
  p_new_price_monthly NUMERIC DEFAULT NULL,
  p_old_price_yearly NUMERIC DEFAULT NULL,
  p_new_price_yearly NUMERIC DEFAULT NULL,
  p_details JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_history_id UUID;
  v_notification_type TEXT;
  v_message TEXT;
  v_plan_display_name TEXT;
  v_billing_cycle TEXT;
  v_price_change_detected BOOLEAN := FALSE;
  v_price_message TEXT := '';
BEGIN
  -- Insert into billing_history
  INSERT INTO billing_history (
    user_id,
    subscription_id,
    event_type,
    performed_by,
    old_plan_name,
    new_plan_name,
    old_billing_cycle,
    new_billing_cycle,
    old_price_monthly,
    new_price_monthly,
    old_price_yearly,
    new_price_yearly,
    details
  )
  VALUES (
    p_user_id,
    p_subscription_id,
    p_event_type,
    p_performed_by,
    p_old_plan_name,
    p_new_plan_name,
    p_old_billing_cycle,
    p_new_billing_cycle,
    p_old_price_monthly,
    p_new_price_monthly,
    p_old_price_yearly,
    p_new_price_yearly,
    p_details
  )
  RETURNING id INTO v_history_id;

  -- Check if this is a price change (for subscription_updated events)
  IF p_event_type = 'subscription_updated' AND p_details IS NOT NULL THEN
    -- Check if custom pricing was updated
    IF p_details->>'custom_pricing_updated' = 'true' THEN
      v_price_change_detected := TRUE;
      
      -- Get billing cycle from subscription if available
      IF p_subscription_id IS NOT NULL THEN
        SELECT billing_cycle INTO v_billing_cycle
        FROM user_subscriptions
        WHERE id = p_subscription_id;
      END IF;
      
      -- Determine which price changed and build message
      IF v_billing_cycle = 'yearly' OR (v_billing_cycle IS NULL AND p_new_price_yearly IS NOT NULL AND p_old_price_yearly IS NOT NULL AND p_new_price_yearly != p_old_price_yearly) THEN
        -- Yearly price change
        IF p_new_price_yearly = 0 THEN
          v_price_message := 'Your yearly subscription price has been set to £0.00 (free).';
        ELSIF p_old_price_yearly IS NULL OR p_old_price_yearly = 0 THEN
          v_price_message := 'Your yearly subscription price has been updated to ' || 
            to_char(p_new_price_yearly, 'FM£999,999,999.00') || '/year.';
        ELSE
          v_price_message := 'Your yearly subscription price has been updated from ' || 
            to_char(p_old_price_yearly, 'FM£999,999,999.00') || '/year to ' || 
            to_char(p_new_price_yearly, 'FM£999,999,999.00') || '/year.';
        END IF;
      ELSIF v_billing_cycle = 'monthly' OR (v_billing_cycle IS NULL AND p_new_price_monthly IS NOT NULL AND p_old_price_monthly IS NOT NULL AND p_new_price_monthly != p_old_price_monthly) THEN
        -- Monthly price change
        IF p_new_price_monthly = 0 THEN
          v_price_message := 'Your monthly subscription price has been set to £0.00 (free).';
        ELSIF p_old_price_monthly IS NULL OR p_old_price_monthly = 0 THEN
          v_price_message := 'Your monthly subscription price has been updated to ' || 
            to_char(p_new_price_monthly, 'FM£999,999,999.00') || '/month.';
        ELSE
          v_price_message := 'Your monthly subscription price has been updated from ' || 
            to_char(p_old_price_monthly, 'FM£999,999,999.00') || '/month to ' || 
            to_char(p_new_price_monthly, 'FM£999,999,999.00') || '/month.';
        END IF;
      ELSIF (p_new_price_monthly IS NOT NULL AND p_old_price_monthly IS NOT NULL AND p_new_price_monthly != p_old_price_monthly) OR
            (p_new_price_yearly IS NOT NULL AND p_old_price_yearly IS NOT NULL AND p_new_price_yearly != p_old_price_yearly) THEN
        -- Both prices changed or unclear which cycle
        v_price_message := 'Your subscription pricing has been updated.';
        IF p_new_price_monthly IS NOT NULL AND p_old_price_monthly IS NOT NULL AND p_new_price_monthly != p_old_price_monthly THEN
          v_price_message := v_price_message || ' Monthly: ' || to_char(p_old_price_monthly, 'FM£999,999,999.00') || ' → ' || to_char(p_new_price_monthly, 'FM£999,999,999.00');
        END IF;
        IF p_new_price_yearly IS NOT NULL AND p_old_price_yearly IS NOT NULL AND p_new_price_yearly != p_old_price_yearly THEN
          v_price_message := v_price_message || ' Yearly: ' || to_char(p_old_price_yearly, 'FM£999,999,999.00') || ' → ' || to_char(p_new_price_yearly, 'FM£999,999,999.00');
        END IF;
        v_price_message := v_price_message || '.';
      END IF;
      
      -- If custom prices were cleared (set to null)
      IF p_details->>'custom_monthly' IS NULL AND p_details->>'custom_yearly' IS NULL AND 
         (p_old_price_monthly IS NOT NULL OR p_old_price_yearly IS NOT NULL) THEN
        v_price_message := 'Your custom pricing has been removed. Your subscription will now use the standard plan pricing.';
      END IF;
    END IF;
  END IF;

  -- Determine notification type and message based on event type
  IF v_price_change_detected AND v_price_message != '' THEN
    -- Use the price change message
    v_notification_type := 'billing';
    v_message := v_price_message;
  ELSE
    -- Use standard event type messages
    CASE p_event_type
      WHEN 'trial_started' THEN
        v_notification_type := 'trial';
        SELECT display_name INTO v_plan_display_name FROM subscription_plans WHERE name = p_new_plan_name;
        v_message := 'Your ' || COALESCE(v_plan_display_name, p_new_plan_name) || ' trial has started!';
      WHEN 'trial_ended' THEN
        v_notification_type := 'trial';
        SELECT display_name INTO v_plan_display_name FROM subscription_plans WHERE name = p_old_plan_name;
        v_message := 'Your ' || COALESCE(v_plan_display_name, p_old_plan_name) || ' trial has ended.';
      WHEN 'trial_cancelled' THEN
        v_notification_type := 'trial';
        SELECT display_name INTO v_plan_display_name FROM subscription_plans WHERE name = p_old_plan_name;
        v_message := 'Your ' || COALESCE(v_plan_display_name, p_old_plan_name) || ' trial has been cancelled.';
      WHEN 'subscription_created' THEN
        v_notification_type := 'subscription';
        SELECT display_name INTO v_plan_display_name FROM subscription_plans WHERE name = p_new_plan_name;
        v_message := 'Your ' || COALESCE(v_plan_display_name, p_new_plan_name) || ' subscription has been activated!';
      WHEN 'subscription_cancelled' THEN
        v_notification_type := 'subscription';
        SELECT display_name INTO v_plan_display_name FROM subscription_plans WHERE name = p_old_plan_name;
        v_message := 'Your ' || COALESCE(v_plan_display_name, p_old_plan_name) || ' subscription has been cancelled.';
      WHEN 'plan_changed' THEN
        v_notification_type := 'subscription';
        SELECT display_name INTO v_plan_display_name FROM subscription_plans WHERE name = p_new_plan_name;
        v_message := 'Your subscription plan has been changed to ' || COALESCE(v_plan_display_name, p_new_plan_name) || '.';
      WHEN 'subscription_suspended' THEN
        v_notification_type := 'billing';
        v_message := 'Your subscription has been suspended.';
      WHEN 'subscription_unsuspended' THEN
        v_notification_type := 'billing';
        v_message := 'Your subscription has been reactivated.';
      WHEN 'billing_cycle_changed' THEN
        v_notification_type := 'billing';
        v_message := 'Your billing cycle has been changed to ' || COALESCE(p_new_billing_cycle, 'unknown') || '.';
      WHEN 'renewal_date_updated' THEN
        v_notification_type := 'billing';
        v_message := 'Your subscription renewal date has been updated.';
      WHEN 'subscription_updated' THEN
        v_notification_type := 'billing';
        v_message := COALESCE(v_price_message, 'A billing change has been made to your account.');
      ELSE
        v_notification_type := 'billing';
        v_message := 'A billing change has been made to your account.';
    END CASE;
  END IF;

  -- Create notification (use system user or admin as actor)
  INSERT INTO notifications (user_id, type, actor_id, message)
  VALUES (
    p_user_id,
    v_notification_type,
    COALESCE(p_performed_by, 'system'),
    v_message
  );

  -- Log to account history
  INSERT INTO user_account_history (user_id, action_type, performed_by, details)
  VALUES (
    p_user_id,
    p_event_type,
    p_performed_by,
    jsonb_build_object(
      'subscription_id', p_subscription_id,
      'old_plan', p_old_plan_name,
      'new_plan', p_new_plan_name,
      'details', p_details
    )
  );

  RETURN v_history_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

