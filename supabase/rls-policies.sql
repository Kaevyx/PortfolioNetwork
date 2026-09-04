-- Row Level Security Policies for Clerk Authentication
-- Since we're using Clerk, we need to disable RLS or create policies that allow public access
-- For development, we'll disable RLS. For production, you should implement proper policies.

-- Disable RLS for development (allows all operations)
-- Remove these lines in production and use the policies below instead

ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE reviews DISABLE ROW LEVEL SECURITY;
ALTER TABLE follows DISABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE posts DISABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes DISABLE ROW LEVEL SECURITY;
ALTER TABLE post_comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE post_views DISABLE ROW LEVEL SECURITY;

-- Disable RLS for post_reactions (development)
ALTER TABLE post_reactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks DISABLE ROW LEVEL SECURITY;
ALTER TABLE reposts DISABLE ROW LEVEL SECURITY;
ALTER TABLE post_drafts DISABLE ROW LEVEL SECURITY;
ALTER TABLE blocks DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE social_media_accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE verification_requests DISABLE ROW LEVEL SECURITY;

-- Online Status (Development - RLS disabled)
ALTER TABLE online_status DISABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions DISABLE ROW LEVEL SECURITY;

-- Portfolio tables (for Clerk authentication)
ALTER TABLE portfolio_skills DISABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_education DISABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_experience DISABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_certifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE profile_skills DISABLE ROW LEVEL SECURITY;
ALTER TABLE education_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE work_experience DISABLE ROW LEVEL SECURITY;
ALTER TABLE certifications DISABLE ROW LEVEL SECURITY;

-- Note: Connections is a VIEW, not a table, so RLS doesn't apply

-- ============================================
-- PRODUCTION POLICIES (Uncomment for production)
-- ============================================
-- These policies allow public read access and authenticated write access
-- Note: Since we're using Clerk, you'll need to pass the user ID in a header or use a service role key

/*
-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_items ENABLE ROW LEVEL SECURITY;

-- Profiles: Anyone can read, anyone can insert/update (for Clerk users)
CREATE POLICY "Profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Anyone can create profile" ON profiles
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (true); -- In production, verify clerk_id matches

-- Reviews: Anyone can read, anyone can create
CREATE POLICY "Reviews are viewable by everyone" ON reviews
  FOR SELECT USING (true);

CREATE POLICY "Anyone can create reviews" ON reviews
  FOR INSERT WITH CHECK (true);

-- Follows: Anyone can read, anyone can create/delete
CREATE POLICY "Follows are viewable by everyone" ON follows
  FOR SELECT USING (true);

CREATE POLICY "Anyone can follow" ON follows
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can unfollow" ON follows
  FOR DELETE USING (true);

-- Portfolio items: Anyone can read, anyone can manage
CREATE POLICY "Portfolio items are viewable by everyone" ON portfolio_items
  FOR SELECT USING (true);

CREATE POLICY "Anyone can manage portfolio" ON portfolio_items
  FOR ALL USING (true);
*/

