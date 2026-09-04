-- Seed Documentation System with Initial Content
-- This script creates categories, chapters, and pages with content

DO $$
DECLARE
  admin_user_id TEXT;
  getting_started_id UUID;
  profile_mgmt_id UUID;
  features_id UUID;
  faq_id UUID;
  intro_chapter_id UUID;
  setup_chapter_id UUID;
  core_chapter_id UUID;
  general_faq_chapter_id UUID;
  what_is_page_id UUID;
  account_page_id UUID;
  basics_page_id UUID;
  posts_page_id UUID;
  network_page_id UUID;
  verified_page_id UUID;
  storage_page_id UUID;
BEGIN
  -- Get the first admin user
  SELECT clerk_id INTO admin_user_id
  FROM profiles
  WHERE is_admin = TRUE
  LIMIT 1;

  -- If no admin exists, use a placeholder (update this if needed)
  IF admin_user_id IS NULL THEN
    admin_user_id := 'admin-user-placeholder';
  END IF;

  -- ============================================
  -- CATEGORY 1: Getting Started
  -- ============================================
  INSERT INTO documentation_categories (name, description, display_order, icon_name, is_active, created_by)
  VALUES (
    'Getting Started',
    'Learn the basics of Portfolio Network and get started on your professional journey',
    1,
    'BookOpen',
    TRUE,
    admin_user_id
  )
  ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description
  RETURNING id INTO getting_started_id;

  -- If conflict, get the existing ID
  IF getting_started_id IS NULL THEN
    SELECT id INTO getting_started_id FROM documentation_categories WHERE name = 'Getting Started';
  END IF;

  -- Chapter: Introduction
  INSERT INTO documentation_chapters (category_id, title, description, display_order, is_active, created_by)
  VALUES (
    getting_started_id,
    'Introduction',
    'Welcome to Portfolio Network',
    1,
    TRUE,
    admin_user_id
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO intro_chapter_id;

  IF intro_chapter_id IS NULL THEN
    SELECT id INTO intro_chapter_id FROM documentation_chapters WHERE category_id = getting_started_id AND title = 'Introduction';
  END IF;

  -- Page: What is Portfolio Network?
  INSERT INTO documentation_pages (category_id, title, slug, content, description, display_order, is_published, is_featured, published_at, published_by, created_by)
  VALUES (
    getting_started_id,
    'What is Portfolio Network?',
    'what-is-portfolio-network',
    '<div class="space-y-4">
      <p class="text-gray-700 dark:text-gray-300">
        Portfolio Network is a professional networking platform designed for individuals and businesses to showcase their work, connect with professionals, and grow their network. Whether you''re a freelancer, entrepreneur, or business owner, our platform helps you build your professional presence online.
      </p>
      <div class="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4">
        <h4 class="font-semibold text-indigo-900 dark:text-indigo-100 mb-2">Key Benefits:</h4>
        <ul class="list-disc list-inside space-y-1 text-indigo-800 dark:text-indigo-200">
          <li>Showcase your portfolio and skills</li>
          <li>Connect with professionals in your industry</li>
          <li>Get verified reviews and ratings</li>
          <li>Track your profile performance with analytics</li>
          <li>Share updates and engage with your network</li>
        </ul>
      </div>
      <h3 class="text-xl font-semibold mt-6 mb-3">Getting Started</h3>
      <p class="text-gray-700 dark:text-gray-300">
        To begin your journey on Portfolio Network, simply create an account, complete your profile, and start connecting with other professionals. Our platform makes it easy to build your professional brand and grow your network.
      </p>
    </div>',
    'Learn about Portfolio Network and what makes it the perfect platform for professionals',
    1,
    TRUE,
    TRUE,
    NOW(),
    admin_user_id,
    admin_user_id
  )
  ON CONFLICT (slug) DO NOTHING
  RETURNING id INTO what_is_page_id;

  IF what_is_page_id IS NULL THEN
    SELECT id INTO what_is_page_id FROM documentation_pages WHERE slug = 'what-is-portfolio-network';
  END IF;

  INSERT INTO documentation_sections (chapter_id, page_id, title, display_order)
  VALUES (intro_chapter_id, what_is_page_id, 'What is Portfolio Network?', 1)
  ON CONFLICT DO NOTHING;

  -- Page: Creating Your Account
  INSERT INTO documentation_pages (category_id, title, slug, content, description, display_order, is_published, is_featured, published_at, published_by, created_by)
  VALUES (
    getting_started_id,
    'Creating Your Account',
    'creating-your-account',
    '<div class="space-y-4">
      <p class="text-gray-700 dark:text-gray-300">
        Creating an account on Portfolio Network is quick and easy. Follow these simple steps to get started:
      </p>
      <ol class="list-decimal list-inside space-y-2 text-gray-700 dark:text-gray-300">
        <li>Click the "Sign Up" button in the top right corner of the homepage</li>
        <li>Enter your email address and create a secure password</li>
        <li>Verify your email address by clicking the link in the confirmation email</li>
        <li>Complete your profile setup by adding your basic information</li>
        <li>Start building your portfolio and connecting with others!</li>
      </ol>
      <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mt-4">
        <p class="text-blue-800 dark:text-blue-200">
          <strong>Tip:</strong> Make sure to use a professional email address and choose a strong password to keep your account secure.
        </p>
      </div>
    </div>',
    'Step-by-step guide to creating your Portfolio Network account',
    2,
    TRUE,
    FALSE,
    NOW(),
    admin_user_id,
    admin_user_id
  )
  ON CONFLICT (slug) DO NOTHING
  RETURNING id INTO account_page_id;

  IF account_page_id IS NULL THEN
    SELECT id INTO account_page_id FROM documentation_pages WHERE slug = 'creating-your-account';
  END IF;

  INSERT INTO documentation_sections (chapter_id, page_id, title, display_order)
  VALUES (intro_chapter_id, account_page_id, 'Creating Your Account', 2)
  ON CONFLICT DO NOTHING;

  -- ============================================
  -- CATEGORY 2: Profile Management
  -- ============================================
  INSERT INTO documentation_categories (name, description, display_order, icon_name, is_active, created_by)
  VALUES (
    'Profile Management',
    'Learn how to create and manage your professional profile',
    2,
    'User',
    TRUE,
    admin_user_id
  )
  ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description
  RETURNING id INTO profile_mgmt_id;

  IF profile_mgmt_id IS NULL THEN
    SELECT id INTO profile_mgmt_id FROM documentation_categories WHERE name = 'Profile Management';
  END IF;

  -- Chapter: Setting Up Your Profile
  INSERT INTO documentation_chapters (category_id, title, description, display_order, is_active, created_by)
  VALUES (
    profile_mgmt_id,
    'Setting Up Your Profile',
    'Complete your profile to maximize your professional presence',
    1,
    TRUE,
    admin_user_id
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO setup_chapter_id;

  IF setup_chapter_id IS NULL THEN
    SELECT id INTO setup_chapter_id FROM documentation_chapters WHERE category_id = profile_mgmt_id AND title = 'Setting Up Your Profile';
  END IF;

  -- Page: Profile Basics
  INSERT INTO documentation_pages (category_id, title, slug, content, description, display_order, is_published, is_featured, published_at, published_by, created_by)
  VALUES (
    profile_mgmt_id,
    'Profile Basics',
    'profile-basics',
    '<div class="space-y-4">
      <p class="text-gray-700 dark:text-gray-300">
        Your profile is your professional identity on Portfolio Network. Here''s what you need to know about creating a compelling profile:
      </p>
      <h3 class="text-xl font-semibold mt-6 mb-3">Essential Profile Elements</h3>
      <ul class="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
        <li><strong>Profile Picture:</strong> Upload a professional headshot that represents you well</li>
        <li><strong>Bio:</strong> Write a compelling bio that highlights your skills and experience</li>
        <li><strong>Employment Status:</strong> Let others know your current professional status</li>
        <li><strong>Skills:</strong> Add relevant skills to help others find you</li>
        <li><strong>Portfolio Items:</strong> Showcase your best work and projects</li>
      </ul>
      <h3 class="text-xl font-semibold mt-6 mb-3">Tips for a Great Profile</h3>
      <div class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
        <ul class="list-disc list-inside space-y-1 text-green-800 dark:text-green-200">
          <li>Keep your bio concise but informative</li>
          <li>Use keywords relevant to your industry</li>
          <li>Update your profile regularly</li>
          <li>Add portfolio items that showcase your best work</li>
        </ul>
      </div>
    </div>',
    'Learn the basics of creating and managing your profile',
    1,
    TRUE,
    FALSE,
    NOW(),
    admin_user_id,
    admin_user_id
  )
  ON CONFLICT (slug) DO NOTHING
  RETURNING id INTO basics_page_id;

  IF basics_page_id IS NULL THEN
    SELECT id INTO basics_page_id FROM documentation_pages WHERE slug = 'profile-basics';
  END IF;

  INSERT INTO documentation_sections (chapter_id, page_id, title, display_order)
  VALUES (setup_chapter_id, basics_page_id, 'Profile Basics', 1)
  ON CONFLICT DO NOTHING;

  -- ============================================
  -- CATEGORY 3: Features
  -- ============================================
  INSERT INTO documentation_categories (name, description, display_order, icon_name, is_active, created_by)
  VALUES (
    'Features',
    'Explore all the features Portfolio Network has to offer',
    3,
    'Settings',
    TRUE,
    admin_user_id
  )
  ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description
  RETURNING id INTO features_id;

  IF features_id IS NULL THEN
    SELECT id INTO features_id FROM documentation_categories WHERE name = 'Features';
  END IF;

  -- Chapter: Core Features
  INSERT INTO documentation_chapters (category_id, title, description, display_order, is_active, created_by)
  VALUES (
    features_id,
    'Core Features',
    'Essential features every user should know',
    1,
    TRUE,
    admin_user_id
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO core_chapter_id;

  IF core_chapter_id IS NULL THEN
    SELECT id INTO core_chapter_id FROM documentation_chapters WHERE category_id = features_id AND title = 'Core Features';
  END IF;

  -- Page: Posts and Comments
  INSERT INTO documentation_pages (category_id, title, slug, content, description, display_order, is_published, is_featured, published_at, published_by, created_by)
  VALUES (
    features_id,
    'Posts and Comments',
    'posts-and-comments',
    '<div class="space-y-4">
      <p class="text-gray-700 dark:text-gray-300">
        Share updates, thoughts, and engage with your network through posts and comments on Portfolio Network.
      </p>
      <h3 class="text-xl font-semibold mt-6 mb-3">Creating Posts</h3>
      <p class="text-gray-700 dark:text-gray-300">
        You can create posts to share:
      </p>
      <ul class="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
        <li>Professional updates and achievements</li>
        <li>Thoughts and insights about your industry</li>
        <li>Links to interesting articles or resources</li>
        <li>Images showcasing your work</li>
        <li>Hashtags to reach a wider audience</li>
      </ul>
      <h3 class="text-xl font-semibold mt-6 mb-3">Engaging with Comments</h3>
      <p class="text-gray-700 dark:text-gray-300">
        Comments allow you to have meaningful conversations with your network. You can:
      </p>
      <ul class="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
        <li>Reply to posts from your connections</li>
        <li>Ask questions and share insights</li>
        <li>Build relationships through meaningful engagement</li>
      </ul>
      <div class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mt-4">
        <p class="text-yellow-800 dark:text-yellow-200">
          <strong>Remember:</strong> Keep all posts and comments professional and respectful. Our community guidelines help maintain a positive environment for everyone.
        </p>
      </div>
    </div>',
    'Learn how to create posts and engage with comments',
    1,
    TRUE,
    FALSE,
    NOW(),
    admin_user_id,
    admin_user_id
  )
  ON CONFLICT (slug) DO NOTHING
  RETURNING id INTO posts_page_id;

  IF posts_page_id IS NULL THEN
    SELECT id INTO posts_page_id FROM documentation_pages WHERE slug = 'posts-and-comments';
  END IF;

  INSERT INTO documentation_sections (chapter_id, page_id, title, display_order)
  VALUES (core_chapter_id, posts_page_id, 'Posts and Comments', 1)
  ON CONFLICT DO NOTHING;

  -- Page: Connections
  INSERT INTO documentation_pages (category_id, title, slug, content, description, display_order, is_published, is_featured, published_at, published_by, created_by)
  VALUES (
    features_id,
    'Building Your Network',
    'building-your-network',
    '<div class="space-y-4">
      <p class="text-gray-700 dark:text-gray-300">
        Building a strong professional network is key to success on Portfolio Network. Here''s how to grow your connections:
      </p>
      <h3 class="text-xl font-semibold mt-6 mb-3">Finding Connections</h3>
      <ul class="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
        <li>Use the search feature to find professionals in your industry</li>
        <li>Browse hashtags to discover people with similar interests</li>
        <li>Explore trending topics and connect with active users</li>
        <li>Check out who your existing connections are following</li>
      </ul>
      <h3 class="text-xl font-semibold mt-6 mb-3">Making Meaningful Connections</h3>
      <p class="text-gray-700 dark:text-gray-300">
        When sending connection requests:
      </p>
      <ul class="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
        <li>Personalize your connection request</li>
        <li>Explain why you''d like to connect</li>
        <li>Engage with their content before connecting</li>
        <li>Be respectful and professional</li>
      </ul>
    </div>',
    'Learn how to build and grow your professional network',
    2,
    TRUE,
    FALSE,
    NOW(),
    admin_user_id,
    admin_user_id
  )
  ON CONFLICT (slug) DO NOTHING
  RETURNING id INTO network_page_id;

  IF network_page_id IS NULL THEN
    SELECT id INTO network_page_id FROM documentation_pages WHERE slug = 'building-your-network';
  END IF;

  INSERT INTO documentation_sections (chapter_id, page_id, title, display_order)
  VALUES (core_chapter_id, network_page_id, 'Building Your Network', 2)
  ON CONFLICT DO NOTHING;

  -- ============================================
  -- CATEGORY 4: FAQ
  -- ============================================
  INSERT INTO documentation_categories (name, description, display_order, icon_name, is_active, created_by)
  VALUES (
    'Frequently Asked Questions',
    'Common questions and answers about Portfolio Network',
    4,
    'HelpCircle',
    TRUE,
    admin_user_id
  )
  ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description
  RETURNING id INTO faq_id;

  IF faq_id IS NULL THEN
    SELECT id INTO faq_id FROM documentation_categories WHERE name = 'Frequently Asked Questions';
  END IF;

  -- Chapter: General Questions
  INSERT INTO documentation_chapters (category_id, title, description, display_order, is_active, created_by)
  VALUES (
    faq_id,
    'General Questions',
    'Common questions about using Portfolio Network',
    1,
    TRUE,
    admin_user_id
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO general_faq_chapter_id;

  IF general_faq_chapter_id IS NULL THEN
    SELECT id INTO general_faq_chapter_id FROM documentation_chapters WHERE category_id = faq_id AND title = 'General Questions';
  END IF;

  -- Page: How do I get verified?
  INSERT INTO documentation_pages (category_id, title, slug, content, description, display_order, is_published, is_featured, published_at, published_by, created_by)
  VALUES (
    faq_id,
    'How do I get verified?',
    'how-do-i-get-verified',
    '<div class="space-y-4">
      <p class="text-gray-700 dark:text-gray-300">
        Verification on Portfolio Network helps establish your credibility and professionalism. Here''s how to get verified:
      </p>
      <h3 class="text-xl font-semibold mt-6 mb-3">Verification Process</h3>
      <ol class="list-decimal list-inside space-y-2 text-gray-700 dark:text-gray-300">
        <li>Complete your profile with all required information</li>
        <li>Add portfolio items showcasing your work</li>
        <li>Submit a verification request from your dashboard</li>
        <li>Our team will review your profile and portfolio</li>
        <li>You''ll receive a notification once verification is complete</li>
      </ol>
      <div class="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4 mt-4">
        <p class="text-indigo-800 dark:text-indigo-200">
          <strong>Note:</strong> Verification typically takes 2-5 business days. Make sure your profile is complete and professional before submitting your request.
        </p>
      </div>
    </div>',
    'Learn how to get your profile verified',
    1,
    TRUE,
    FALSE,
    NOW(),
    admin_user_id,
    admin_user_id
  )
  ON CONFLICT (slug) DO NOTHING
  RETURNING id INTO verified_page_id;

  IF verified_page_id IS NULL THEN
    SELECT id INTO verified_page_id FROM documentation_pages WHERE slug = 'how-do-i-get-verified';
  END IF;

  INSERT INTO documentation_sections (chapter_id, page_id, title, display_order)
  VALUES (general_faq_chapter_id, verified_page_id, 'How do I get verified?', 1)
  ON CONFLICT DO NOTHING;

  -- Page: What are the storage limits?
  INSERT INTO documentation_pages (category_id, title, slug, content, description, display_order, is_published, is_featured, published_at, published_by, created_by)
  VALUES (
    faq_id,
    'What are the storage limits?',
    'what-are-the-storage-limits',
    '<div class="space-y-4">
      <p class="text-gray-700 dark:text-gray-300">
        Portfolio Network offers different storage limits based on your subscription plan:
      </p>
      <div class="overflow-x-auto mt-4">
        <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead class="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Plan</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Storage Limit</th>
            </tr>
          </thead>
          <tbody class="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            <tr>
              <td class="px-4 py-3 text-sm text-gray-900 dark:text-white">Free</td>
              <td class="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">50 MB</td>
            </tr>
            <tr>
              <td class="px-4 py-3 text-sm text-gray-900 dark:text-white">Pro</td>
              <td class="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">500 MB</td>
            </tr>
            <tr>
              <td class="px-4 py-3 text-sm text-gray-900 dark:text-white">Business</td>
              <td class="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">5 GB</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="text-gray-700 dark:text-gray-300 mt-4">
        You can check your current storage usage on your dashboard. If you need more storage, consider upgrading your plan.
      </p>
    </div>',
    'Learn about storage limits for different subscription plans',
    2,
    TRUE,
    FALSE,
    NOW(),
    admin_user_id,
    admin_user_id
  )
  ON CONFLICT (slug) DO NOTHING
  RETURNING id INTO storage_page_id;

  IF storage_page_id IS NULL THEN
    SELECT id INTO storage_page_id FROM documentation_pages WHERE slug = 'what-are-the-storage-limits';
  END IF;

  INSERT INTO documentation_sections (chapter_id, page_id, title, display_order)
  VALUES (general_faq_chapter_id, storage_page_id, 'What are the storage limits?', 2)
  ON CONFLICT DO NOTHING;

END $$;
