# Suspension and Custom Pricing Fix

## Summary
This document outlines the simplified solution for fixing subscription suspension and custom pricing display issues.

## Changes Made

### 1. Simplified Suspension Trigger (`supabase/simplify-suspension-trigger.sql`)
**Problem**: The database trigger was trying to update the profile when suspending, which caused conflicts and reverted plans to FREE.

**Solution**: The trigger now **completely skips profile updates** when status is 'suspended'. This allows the client code to handle suspended subscriptions explicitly without interference.

**Key Changes**:
- Trigger checks if `NEW.status = 'suspended'` and returns early (skips all profile updates)
- Client code now explicitly sets the profile plan name when suspending
- No more race conditions or trigger conflicts

### 2. Fixed Custom Prices Display (`components/UserBilling.tsx`)
**Problem**: Custom prices weren't showing on the user's billing tab because the interface didn't include the fields.

**Solution**:
- Added `custom_price_monthly`, `custom_price_yearly`, `price_monthly`, `price_yearly` to `SubscriptionDetails` interface
- Ensured `planDetails` always includes custom price data from RPC
- Price display now uses effective prices from RPC (which already includes custom prices)

### 3. Simplified Suspension Logic (`components/AdminBilling.tsx`)
**Problem**: Complex retry logic and delays were causing issues.

**Solution**: 
- Removed all retry logic and delays
- Simple, direct profile update when suspending
- No more waiting for triggers or verification loops

## How It Works Now

### Suspending a Subscription:
1. Admin clicks "Suspend" on a Pro/Ultimate plan
2. Subscription status is set to 'suspended' in `user_subscriptions` table
3. Database trigger sees status is 'suspended' and **skips profile update** (returns early)
4. Client code explicitly updates profile to keep original plan name (pro/ultimate)
5. User sees their plan as "Pro (Suspended)" or "Ultimate (Suspended)"
6. User has access to FREE plan features (handled by `subscriptionFeatures.ts`)

### Custom Prices:
1. Admin sets custom prices in the admin dashboard
2. Prices are stored in `user_subscriptions.custom_price_monthly` and `custom_price_yearly`
3. RPC function `get_user_subscription_details` returns effective prices (custom if set, otherwise plan price)
4. User billing tab displays the effective price from RPC

## Migration Steps

**CRITICAL**: You must run the SQL migration file:

```sql
-- Run this in your Supabase SQL editor:
supabase/simplify-suspension-trigger.sql
```

This replaces the old trigger with the simplified version that skips profile updates for suspended subscriptions.

## Testing Checklist

- [ ] Run `supabase/simplify-suspension-trigger.sql` in Supabase
- [ ] Test suspending a Pro plan - should keep "Pro" name, not revert to "Free"
- [ ] Test suspending an Ultimate plan - should keep "Ultimate" name
- [ ] Verify user sees "Suspended" status on their billing tab
- [ ] Verify user has FREE plan features when suspended
- [ ] Test setting custom prices for a user
- [ ] Verify custom prices show on user's billing tab
- [ ] Test unsuspending - should restore full features
- [ ] Test cancelling - should revert to FREE (this should still work)

## Key Files Modified

1. `supabase/simplify-suspension-trigger.sql` - New simplified trigger
2. `components/AdminBilling.tsx` - Simplified suspension logic
3. `components/UserBilling.tsx` - Fixed custom prices display

## Why This Is Better

1. **Simpler**: No complex retry logic or delays
2. **More Reliable**: Trigger explicitly skips suspended status, no conflicts
3. **Clearer**: Client code has full control over suspended subscriptions
4. **Maintainable**: Less code, easier to understand and debug

