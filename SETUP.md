# Setup Guide

This guide will walk you through setting up the Portfolio Network application.

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Set Up Clerk

1. Go to [clerk.com](https://clerk.com) and create an account
2. Create a new application
3. In your Clerk dashboard, go to **API Keys**
4. Copy your **Publishable Key** and **Secret Key**
5. Add them to your `.env.local` file:
   ```
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...
   ```

## Step 3: Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create an account
2. Create a new project
3. Wait for the project to be fully provisioned
4. Go to **Settings** → **API**
5. Copy your **Project URL** and **anon/public key**
6. Add them to your `.env.local` file:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

## Step 4: Set Up Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy the entire contents of `supabase/schema.sql`
4. Paste it into the SQL Editor
5. Click **Run** (or press Ctrl+Enter)
6. You should see "Success. No rows returned" if everything worked

The schema creates the following tables:
- `profiles` - User profiles (individuals and businesses)
- `reviews` - Reviews and ratings
- `follows` - Follow relationships
- `portfolio_items` - Portfolio showcase items

**If you get an error about the 'settings' column not existing:**
1. Run the migration script: `supabase/add-settings-column.sql`
2. This will add the `settings` JSONB column to the `profiles` table

### Step 4b: Add Posts Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy the entire contents of `supabase/posts-schema.sql`
4. Paste it into the SQL Editor
5. Click **Run**

This creates tables for:
- `posts` - User posts/updates
- `post_likes` - Post likes
- `post_comments` - Post comments

### Step 4c: Add Post Views Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Click **New Query**

**If you're getting a duplicate key error:**
3. First, copy and paste the contents of `supabase/cleanup-post-views-duplicates.sql`
4. Click **Run** to remove duplicates
5. Then continue with step 6 below

**If this is a fresh setup:**
3. Copy the entire contents of `supabase/post-views-schema.sql`
4. Paste it into the SQL Editor
5. Click **Run**

This creates the `post_views` table for tracking post views and engagement. The unique constraint ensures each user can only view a post once.

### Step 4d: Add Connections Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy the entire contents of `supabase/connections-schema.sql`
4. Paste it into the SQL Editor
5. Click **Run**

This creates database functions and views for tracking connections (mutual follows). Connections are defined as when two users follow each other, making it a key feature of the professional networking platform.

### Step 4e: Add Notifications Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy the entire contents of `supabase/notifications-schema.sql`
4. Paste it into the SQL Editor
5. Click **Run**

This creates:
- `notifications` table for storing user notifications
- Database triggers to automatically create notifications for connections and comments
- Functions to handle notification creation

### Step 4f: Add Monetization Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy the entire contents of `supabase/monetization-schema.sql`
4. Paste it into the SQL Editor
5. Click **Run**

This creates:
- `subscription_plans` table with Free, Pro, and Business plans
- `user_subscriptions` table for tracking user subscriptions
- Adds `subscription_plan` and `is_premium` columns to profiles
- Default subscription plans (Free, Pro, Business)

### Step 4g: Add Online Status Schema

1. Go to Supabase SQL Editor
2. Run the SQL script: `supabase/online-status-schema.sql`
3. This creates the `online_status` table and functions for tracking user online/offline status

### Step 4h: Configure Row Level Security (IMPORTANT)

**This step is required for the app to work!**

1. In your Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy the entire contents of `supabase/rls-policies.sql`
4. Paste it into the SQL Editor
5. Click **Run** (or press Ctrl+Enter)

This will disable RLS for development, allowing the app to work with Clerk authentication. **For production, you should implement proper RLS policies.**

## Step 5: Run the Application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Step 6: Create Your First Profile

1. Click **Sign Up** on the home page
2. Complete the Clerk sign-up process
3. You'll be redirected to the profile setup page
4. Fill in your profile information
5. Click **Create Profile**

## Features

### Core Features
- ✅ User profiles (individuals and businesses)
- ✅ Portfolio showcase
- ✅ Reviews and ratings
- ✅ Follow/followers system
- ✅ Posts and updates
- ✅ Likes and comments
- ✅ Activity feed
- ✅ Advanced search
- ✅ Analytics dashboard
- ✅ Verified accounts

### Pages
- Homepage with feature showcase
- Dashboard with feed and analytics
- Profile pages with posts
- Explore page with search
- Pricing page
- Privacy Policy
- Terms of Service
- Footer with links

## Troubleshooting

### "Invalid API Key" errors
- Make sure your `.env.local` file is in the root directory
- Restart your development server after adding environment variables
- Check that you copied the keys correctly (no extra spaces)

### Database connection errors
- Verify your Supabase URL and anon key are correct
- Make sure you ran all three SQL scripts (schema.sql, posts-schema.sql, rls-policies.sql)
- Check that your Supabase project is active

### Authentication issues
- Verify your Clerk keys are correct
- Make sure you're using the right environment (test vs production keys)
- Check the Clerk dashboard for any errors

### Posts not showing
- Make sure you ran the `posts-schema.sql` script
- Check that RLS policies are disabled (run `rls-policies.sql`)

## Next Steps

- Customize the styling in `tailwind.config.ts`
- Add more features like messaging, notifications, etc.
- Set up image uploads using Supabase Storage
- Deploy to Vercel or your preferred hosting platform
- Configure proper RLS policies for production
