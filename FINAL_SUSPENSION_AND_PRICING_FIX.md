# FINAL Fix for Suspension and Pricing Issues

## Critical: Run This SQL File First!

**You MUST run this file in your Supabase SQL editor:**
```
supabase/fix-all-suspension-issues.sql
```

This fixes BOTH triggers that were causing issues:
1. The main subscription update trigger (now skips suspended status)
2. The account suspension trigger (no longer downgrades to free)

## Problems Fixed

### 1. Suspension Reverting to FREE Plan
**Root Cause**: There were TWO triggers interfering:
- `update_user_subscription_status()` - Was trying to update profile even for suspended status
- `suspend_subscription_on_account_suspension()` - Was setting `subscription_plan = 'free'` when accounts were suspended

**Solution**:
- Main trigger now **completely skips** profile updates when status is 'suspended'
- Account suspension trigger no longer downgrades plans to free
- Client code explicitly sets profile plan name after suspension
- Added verification and retry logic to ensure it sticks

### 2. Plan Price Not Updating
**Root Cause**: `planDetails` wasn't always being set, especially when:
- No subscription record exists (only profile data)
- Custom prices weren't being included in the state

**Solution**:
- Always set `planDetails` from RPC response (includes custom prices)
- Added fallback to fetch plan prices from `subscription_plans` table if no subscription record
- Price display now uses `planDetails` with fallback to `subscription` data
- Added proper null checks and optional chaining

## What Changed

### Database (SQL Migration)
1. **`update_user_subscription_status()`** - Returns early if status is 'suspended', skipping all profile updates
2. **`suspend_subscription_on_account_suspension()`** - Removed the line that sets `subscription_plan = 'free'`

### Client Code
1. **`components/AdminBilling.tsx`**:
   - Added verification after profile update
   - Retries if profile plan name doesn't match expected value
   - Better error logging

2. **`components/UserBilling.tsx`**:
   - Always sets `planDetails` from RPC response
   - Fetches plan prices from `subscription_plans` table if no subscription record exists
   - Price display uses optional chaining and fallbacks
   - Shows price even if `planDetails` is null (uses subscription data)

## Testing Steps

1. **Run the SQL migration** (`supabase/fix-all-suspension-issues.sql`)

2. **Test Suspension**:
   - Suspend a Pro plan
   - Check admin dashboard → Should show "Pro (Suspended)"
   - Check user billing tab → Should show "Pro (Suspended)", NOT "Free"
   - Verify user has FREE plan features (limited access)

3. **Test Custom Prices**:
   - Set a custom price for a user (e.g., £5/month)
   - Check user billing tab → Should show £5.00, not the default price
   - Set custom price to 0 → Should show £0.00

4. **Test Default Prices**:
   - User with no custom price → Should show default plan price
   - User with Pro plan → Should show Pro plan price
   - User with Ultimate plan → Should show Ultimate plan price

## Key Files

- `supabase/fix-all-suspension-issues.sql` - **RUN THIS FIRST**
- `components/AdminBilling.tsx` - Suspension logic with verification
- `components/UserBilling.tsx` - Price display with fallbacks

## Why This Works

1. **Trigger skips suspended status** → No automatic profile updates for suspended subscriptions
2. **Client code explicitly sets plan name** → Full control over what the profile shows
3. **Verification and retry** → Ensures the update sticks even if something tries to change it
4. **Always set planDetails** → Prices always available for display
5. **Multiple fallbacks** → Price display works even if data is missing

## If It Still Doesn't Work

Check the browser console for:
- "CRITICAL: Profile plan name mismatch after suspension!" → Something is still reverting it
- "No rows were updated!" → Subscription ID might be wrong
- "Status update verification failed" → Status isn't being set correctly

The console logs will tell you exactly where it's failing.

