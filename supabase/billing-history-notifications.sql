-- Billing History and Notifications Schema
-- Adds billing history tracking and notifications for billing events

-- Create billing_history table to track all billing events
CREATE TABLE IF NOT EXISTS billing_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL, -- Clerk ID of the user
  subscription_id UUID, -- Reference to user_subscriptions.id
  event_type TEXT NOT NULL CHECK (event_type IN (
    'subscription_created',
    'subscription_updated',
    'subscription_cancelled',
    'subscription_renewed',
    'trial_started',
    'trial_ended',
    'trial_cancelled',
    'plan_changed',
    'billing_cycle_changed',
    'renewal_date_updated',
    'subscription_suspended',
    'subscription_unsuspended',
    'payment_failed',
    'payment_succeeded'
  )),
  old_plan_name TEXT,
  new_plan_name TEXT,
  old_billing_cycle TEXT,
  new_billing_cycle TEXT,
  old_price_monthly NUMERIC(10, 2),
  new_price_monthly NUMERIC(10, 2),
  old_price_yearly NUMERIC(10, 2),
  new_price_yearly NUMERIC(10, 2),
  performed_by TEXT, -- Clerk ID of who performed the action (null if system, admin_id if admin)
  details JSONB, -- Additional details (reason, changes, etc.)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES profiles(clerk_id) ON DELETE CASCADE,
  FOREIGN KEY (subscription_id) REFERENCES user_subscriptions(id) ON DELETE SET NULL,
  FOREIGN KEY (performed_by) REFERENCES profiles(clerk_id) ON DELETE SET NULL
);

-- Create indexes for billing_history
CREATE INDEX IF NOT EXISTS idx_billing_history_user_id ON billing_history(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_history_subscription_id ON billing_history(subscription_id);
CREATE INDEX IF NOT EXISTS idx_billing_history_event_type ON billing_history(event_type);
CREATE INDEX IF NOT EXISTS idx_billing_history_created_at ON billing_history(created_at DESC);

-- Update notifications table to include billing notification types
-- We need to handle this carefully to avoid constraint violations

-- Step 1: Temporarily allow all types by dropping the constraint
-- This allows us to update any problematic rows
DO $$
BEGIN
  -- Try to drop the constraint
  ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
EXCEPTION
  WHEN OTHERS THEN
    -- If constraint doesn't exist or can't be dropped, continue
    NULL;
END $$;

-- Step 2: Update any rows that have types not in our new allowed list
-- This should be safe now since we've dropped the constraint
UPDATE notifications 
SET type = 'review' 
WHERE type IS NOT NULL 
  AND type NOT IN ('follow', 'connection', 'comment', 'like', 'review', 'mention', 'repost', 'billing', 'trial', 'subscription');

-- Step 3: Add the new constraint with expanded types
-- This will now work since all rows are valid
DO $$
BEGIN
  ALTER TABLE notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('follow', 'connection', 'comment', 'like', 'review', 'mention', 'repost', 'billing', 'trial', 'subscription'));
EXCEPTION
  WHEN duplicate_object THEN
    -- Constraint already exists, that's fine
    NULL;
  WHEN OTHERS THEN
    -- If there are still invalid rows, update them and try again
    UPDATE notifications 
    SET type = 'review' 
    WHERE type IS NOT NULL 
      AND type NOT IN ('follow', 'connection', 'comment', 'like', 'review', 'mention', 'repost', 'billing', 'trial', 'subscription');
    
    -- Try adding constraint again
    ALTER TABLE notifications
    ADD CONSTRAINT notifications_type_check
    CHECK (type IN ('follow', 'connection', 'comment', 'like', 'review', 'mention', 'repost', 'billing', 'trial', 'subscription'));
END $$;

-- Update user_account_history to include billing action types
-- Handle this carefully to avoid constraint violations

-- Step 1: Drop the old constraint
DO $$
BEGIN
  ALTER TABLE user_account_history DROP CONSTRAINT IF EXISTS user_account_history_action_type_check;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

-- Step 2: Update any rows that have action types not in our new allowed list
UPDATE user_account_history 
SET action_type = 'admin_action' 
WHERE action_type IS NOT NULL 
  AND action_type NOT IN (
    'profile_created',
    'profile_updated',
    'profile_approved',
    'profile_rejected',
    'file_uploaded',
    'file_approved',
    'file_rejected',
    'file_deleted',
    'verification_requested',
    'verification_approved',
    'verification_rejected',
    'admin_action',
    'account_modified',
    'subscription_created',
    'subscription_updated',
    'subscription_cancelled',
    'trial_started',
    'trial_ended',
    'trial_cancelled',
    'plan_changed',
    'subscription_suspended',
    'subscription_unsuspended'
  );

-- Step 3: Add the new constraint with expanded action types
DO $$
BEGIN
  ALTER TABLE user_account_history
  ADD CONSTRAINT user_account_history_action_type_check
  CHECK (action_type IN (
    'profile_created',
    'profile_updated',
    'profile_approved',
    'profile_rejected',
    'file_uploaded',
    'file_approved',
    'file_rejected',
    'file_deleted',
    'verification_requested',
    'verification_approved',
    'verification_rejected',
    'admin_action',
    'account_modified',
    'subscription_created',
    'subscription_updated',
    'subscription_cancelled',
    'trial_started',
    'trial_ended',
    'trial_cancelled',
    'plan_changed',
    'subscription_suspended',
    'subscription_unsuspended'
  ));
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
  WHEN OTHERS THEN
    -- If there are still invalid rows, update them and try again
    UPDATE user_account_history 
    SET action_type = 'admin_action' 
    WHERE action_type IS NOT NULL 
      AND action_type NOT IN (
        'profile_created',
        'profile_updated',
        'profile_approved',
        'profile_rejected',
        'file_uploaded',
        'file_approved',
        'file_rejected',
        'file_deleted',
        'verification_requested',
        'verification_approved',
        'verification_rejected',
        'admin_action',
        'account_modified',
        'subscription_created',
        'subscription_updated',
        'subscription_cancelled',
        'trial_started',
        'trial_ended',
        'trial_cancelled',
        'plan_changed',
        'subscription_suspended',
        'subscription_unsuspended'
      );
    
    -- Try adding constraint again
    ALTER TABLE user_account_history
    ADD CONSTRAINT user_account_history_action_type_check
    CHECK (action_type IN (
      'profile_created',
      'profile_updated',
      'profile_approved',
      'profile_rejected',
      'file_uploaded',
      'file_approved',
      'file_rejected',
      'file_deleted',
      'verification_requested',
      'verification_approved',
      'verification_rejected',
      'admin_action',
      'account_modified',
      'subscription_created',
      'subscription_updated',
      'subscription_cancelled',
      'trial_started',
      'trial_ended',
      'trial_cancelled',
      'plan_changed',
      'subscription_suspended',
      'subscription_unsuspended'
    ));
END $$;

-- Function to log billing history and create notifications
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

  -- Determine notification type and message based on event type
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
    ELSE
      v_notification_type := 'billing';
      v_message := 'A billing change has been made to your account.';
  END CASE;

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

-- Function to get billing history for a user
CREATE OR REPLACE FUNCTION get_user_billing_history(p_user_id TEXT)
RETURNS TABLE (
  id UUID,
  event_type TEXT,
  old_plan_name TEXT,
  new_plan_name TEXT,
  old_billing_cycle TEXT,
  new_billing_cycle TEXT,
  performed_by TEXT,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    bh.id,
    bh.event_type,
    bh.old_plan_name,
    bh.new_plan_name,
    bh.old_billing_cycle,
    bh.new_billing_cycle,
    bh.performed_by,
    bh.details,
    bh.created_at
  FROM billing_history bh
  WHERE bh.user_id = p_user_id
  ORDER BY bh.created_at DESC
  LIMIT 100;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

