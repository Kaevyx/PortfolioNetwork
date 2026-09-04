-- Seed realistic status components based on platform features
-- This creates component groups and components that users should be notified about

DO $$
DECLARE
  core_services_id UUID;
  user_features_id UUID;
  content_media_id UUID;
BEGIN
  -- Create or get Core Services group
  INSERT INTO status_component_groups (name, description, display_order) 
  VALUES ('Core Services', 'Essential platform services that affect all users', 1)
  ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description
  RETURNING id INTO core_services_id;
  
  IF core_services_id IS NULL THEN
    SELECT id INTO core_services_id FROM status_component_groups WHERE name = 'Core Services';
  END IF;

  -- Create or get User Features group
  INSERT INTO status_component_groups (name, description, display_order) 
  VALUES ('User Features', 'User-facing features and functionality', 2)
  ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description
  RETURNING id INTO user_features_id;
  
  IF user_features_id IS NULL THEN
    SELECT id INTO user_features_id FROM status_component_groups WHERE name = 'User Features';
  END IF;

  -- Create or get Content & Media group
  INSERT INTO status_component_groups (name, description, display_order) 
  VALUES ('Content & Media', 'Content creation, storage, and media services', 3)
  ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description
  RETURNING id INTO content_media_id;
  
  IF content_media_id IS NULL THEN
    SELECT id INTO content_media_id FROM status_component_groups WHERE name = 'Content & Media';
  END IF;

  -- Insert Components for Core Services
  INSERT INTO status_components (group_id, name, description, status, display_order, is_public, created_by) 
  SELECT 
    core_services_id,
    'User Authentication',
    'Login, registration, and account access',
    'operational',
    1,
    true,
    (SELECT clerk_id FROM profiles WHERE is_admin = true LIMIT 1)
  WHERE NOT EXISTS (SELECT 1 FROM status_components WHERE name = 'User Authentication');

  INSERT INTO status_components (group_id, name, description, status, display_order, is_public, created_by) 
  SELECT 
    core_services_id,
    'User Profiles',
    'Profile viewing and management',
    'operational',
    2,
    true,
    (SELECT clerk_id FROM profiles WHERE is_admin = true LIMIT 1)
  WHERE NOT EXISTS (SELECT 1 FROM status_components WHERE name = 'User Profiles');

  INSERT INTO status_components (group_id, name, description, status, display_order, is_public, created_by) 
  SELECT 
    core_services_id,
    'Notifications',
    'In-app notifications and alerts',
    'operational',
    3,
    true,
    (SELECT clerk_id FROM profiles WHERE is_admin = true LIMIT 1)
  WHERE NOT EXISTS (SELECT 1 FROM status_components WHERE name = 'Notifications');

  -- Insert Components for User Features
  INSERT INTO status_components (group_id, name, description, status, display_order, is_public, created_by) 
  SELECT 
    user_features_id,
    'Posts & Comments',
    'Creating and viewing posts and comments',
    'operational',
    1,
    true,
    (SELECT clerk_id FROM profiles WHERE is_admin = true LIMIT 1)
  WHERE NOT EXISTS (SELECT 1 FROM status_components WHERE name = 'Posts & Comments');

  INSERT INTO status_components (group_id, name, description, status, display_order, is_public, created_by) 
  SELECT 
    user_features_id,
    'Connections',
    'Following users and managing connections',
    'operational',
    2,
    true,
    (SELECT clerk_id FROM profiles WHERE is_admin = true LIMIT 1)
  WHERE NOT EXISTS (SELECT 1 FROM status_components WHERE name = 'Connections');

  INSERT INTO status_components (group_id, name, description, status, display_order, is_public, created_by) 
  SELECT 
    user_features_id,
    'Search',
    'Searching for users, posts, and hashtags',
    'operational',
    3,
    true,
    (SELECT clerk_id FROM profiles WHERE is_admin = true LIMIT 1)
  WHERE NOT EXISTS (SELECT 1 FROM status_components WHERE name = 'Search');

  -- Insert Components for Content & Media
  INSERT INTO status_components (group_id, name, description, status, display_order, is_public, created_by) 
  SELECT 
    content_media_id,
    'File Uploads',
    'Uploading images and files to posts',
    'operational',
    1,
    true,
    (SELECT clerk_id FROM profiles WHERE is_admin = true LIMIT 1)
  WHERE NOT EXISTS (SELECT 1 FROM status_components WHERE name = 'File Uploads');

  INSERT INTO status_components (group_id, name, description, status, display_order, is_public, created_by) 
  SELECT 
    content_media_id,
    'Image Storage',
    'Storing and serving profile pictures and post images',
    'operational',
    2,
    true,
    (SELECT clerk_id FROM profiles WHERE is_admin = true LIMIT 1)
  WHERE NOT EXISTS (SELECT 1 FROM status_components WHERE name = 'Image Storage');

END $$;

