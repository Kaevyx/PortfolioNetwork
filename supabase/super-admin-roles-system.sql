-- Super Admin Roles and Permissions System
-- This extends the existing admin system to support role-based access control

-- Add is_super_admin field to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT FALSE;

-- Create index for super admin lookup
CREATE INDEX IF NOT EXISTS idx_profiles_is_super_admin ON profiles(is_super_admin);

-- Roles table - defines different admin roles (e.g., Support Staff, Billing Manager, Content Moderator)
CREATE TABLE IF NOT EXISTS admin_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE, -- e.g., 'support_staff', 'billing_manager', 'content_moderator'
  display_name TEXT NOT NULL, -- e.g., 'Support Staff', 'Billing Manager', 'Content Moderator'
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Permissions table - defines what actions/sections can be accessed
CREATE TABLE IF NOT EXISTS admin_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE, -- e.g., 'users.manage', 'billing.view', 'billing.edit'
  display_name TEXT NOT NULL, -- e.g., 'Manage Users', 'View Billing', 'Edit Billing'
  category TEXT NOT NULL, -- e.g., 'User Management', 'Billing', 'Content Moderation'
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Role-Permission mapping - defines which permissions each role has
CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role_id UUID NOT NULL REFERENCES admin_roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES admin_permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(role_id, permission_id)
);

-- User-Role mapping - assigns roles to users
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL, -- Clerk ID
  role_id UUID NOT NULL REFERENCES admin_roles(id) ON DELETE CASCADE,
  assigned_by TEXT, -- Clerk ID of super admin who assigned the role
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, role_id),
  FOREIGN KEY (user_id) REFERENCES profiles(clerk_id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);

-- Function to check if user is super admin
CREATE OR REPLACE FUNCTION is_super_admin(p_clerk_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE clerk_id = p_clerk_id AND is_super_admin = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has a specific permission
CREATE OR REPLACE FUNCTION has_permission(p_clerk_id TEXT, p_permission_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_is_super_admin BOOLEAN;
  v_has_permission BOOLEAN;
BEGIN
  -- Super admins have all permissions
  SELECT is_super_admin(p_clerk_id) INTO v_is_super_admin;
  IF v_is_super_admin THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user has the permission through their roles
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN role_permissions rp ON ur.role_id = rp.role_id
    JOIN admin_permissions ap ON rp.permission_id = ap.id
    WHERE ur.user_id = p_clerk_id
      AND ap.name = p_permission_name
  ) INTO v_has_permission;
  
  RETURN COALESCE(v_has_permission, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all permissions for a user
CREATE OR REPLACE FUNCTION get_user_permissions(p_clerk_id TEXT)
RETURNS TABLE(permission_name TEXT, permission_display_name TEXT, category TEXT) AS $$
BEGIN
  -- Super admins get all permissions
  IF is_super_admin(p_clerk_id) THEN
    RETURN QUERY
    SELECT ap.name, ap.display_name, ap.category
    FROM admin_permissions ap
    ORDER BY ap.category, ap.display_name;
  ELSE
    -- Regular admins get permissions from their roles
    RETURN QUERY
    SELECT DISTINCT ap.name, ap.display_name, ap.category
    FROM user_roles ur
    JOIN role_permissions rp ON ur.role_id = rp.role_id
    JOIN admin_permissions ap ON rp.permission_id = ap.id
    WHERE ur.user_id = p_clerk_id
    ORDER BY ap.category, ap.display_name;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's roles
CREATE OR REPLACE FUNCTION get_user_roles(p_clerk_id TEXT)
RETURNS TABLE(role_id UUID, role_name TEXT, role_display_name TEXT, assigned_at TIMESTAMP WITH TIME ZONE) AS $$
BEGIN
  RETURN QUERY
  SELECT ar.id, ar.name, ar.display_name, ur.assigned_at
  FROM user_roles ur
  JOIN admin_roles ar ON ur.role_id = ar.id
  WHERE ur.user_id = p_clerk_id
  ORDER BY ur.assigned_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert default permissions for admin dashboard sections
INSERT INTO admin_permissions (name, display_name, category, description) VALUES
  -- User Management
  ('users.view', 'View Users', 'User Management', 'View user list and details'),
  ('users.manage', 'Manage Users', 'User Management', 'Create, edit, and delete users'),
  ('profiles.approve', 'Approve Profiles', 'User Management', 'Approve or reject user profiles'),
  ('verifications.manage', 'Manage Verifications', 'User Management', 'Handle verification requests'),
  ('support.manage', 'Manage Support Tickets', 'User Management', 'View and respond to support tickets'),
  
  -- Billing
  ('billing.view', 'View Billing', 'Billing', 'View subscription and billing information'),
  ('billing.edit', 'Edit Billing', 'Billing', 'Modify subscriptions, prices, and billing cycles'),
  ('financials.view', 'View Financials', 'Billing', 'View financial analytics and reports'),
  
  -- Content Moderation
  ('content.moderate', 'Moderate Content', 'Content Moderation', 'Moderate posts and comments'),
  ('files.moderate', 'Moderate Files', 'Content Moderation', 'Moderate uploaded files'),
  ('reports.manage', 'Manage Reports', 'Content Moderation', 'Handle user reports'),
  ('announcements.manage', 'Manage Announcements', 'Content Moderation', 'Create and manage announcements'),
  ('reviews.manage', 'Manage Reviews', 'Content Moderation', 'Moderate and manage user reviews and feedback'),
  
  -- Analytics
  ('analytics.view', 'View Analytics', 'Analytics', 'View user metrics and analytics'),
  
  -- Policies & Documents
  ('policies.manage', 'Manage Policies', 'Policies & Documents', 'Create and edit policies'),
  ('documents.manage', 'Manage Documents', 'Policies & Documents', 'Manage policy documents'),
  
  -- System
  ('changelog.manage', 'Manage Changelog', 'System', 'Create and edit changelog entries'),
  ('status.manage', 'Manage Status Page', 'System', 'Update system status page'),
  ('documentation.manage', 'Manage Documentation', 'System', 'Create and edit documentation'),
  ('roadmap.manage', 'Manage Roadmap', 'System', 'Update product roadmap'),
  
  -- Super Admin Only
  ('roles.manage', 'Manage Roles', 'Super Admin', 'Create, edit, and assign admin roles'),
  ('permissions.manage', 'Manage Permissions', 'Super Admin', 'Manage permission system')
ON CONFLICT (name) DO NOTHING;

-- Insert default roles
INSERT INTO admin_roles (name, display_name, description) VALUES
  ('support_staff', 'Support Staff', 'Can manage support tickets and view user information'),
  ('billing_manager', 'Billing Manager', 'Can manage subscriptions, billing, and view financials'),
  ('content_moderator', 'Content Moderator', 'Can moderate content, files, and handle reports'),
  ('user_manager', 'User Manager', 'Can manage users, profiles, and verifications')
ON CONFLICT (name) DO NOTHING;

-- Assign default permissions to roles
-- Support Staff
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM admin_roles WHERE name = 'support_staff'),
  id
FROM admin_permissions
WHERE name IN ('users.view', 'support.manage', 'billing.view')
ON CONFLICT DO NOTHING;

-- Billing Manager
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM admin_roles WHERE name = 'billing_manager'),
  id
FROM admin_permissions
WHERE name IN ('users.view', 'billing.view', 'billing.edit', 'financials.view')
ON CONFLICT DO NOTHING;

-- Content Moderator
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM admin_roles WHERE name = 'content_moderator'),
  id
FROM admin_permissions
WHERE name IN ('content.moderate', 'files.moderate', 'reports.manage', 'announcements.manage')
ON CONFLICT DO NOTHING;

-- User Manager
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM admin_roles WHERE name = 'user_manager'),
  id
FROM admin_permissions
WHERE name IN ('users.view', 'users.manage', 'profiles.approve', 'verifications.manage')
ON CONFLICT DO NOTHING;

-- Comments for documentation
COMMENT ON TABLE admin_roles IS 'Defines different admin roles (e.g., Support Staff, Billing Manager)';
COMMENT ON TABLE admin_permissions IS 'Defines what actions/sections can be accessed in admin dashboard';
COMMENT ON TABLE role_permissions IS 'Maps permissions to roles';
COMMENT ON TABLE user_roles IS 'Assigns roles to users';
COMMENT ON COLUMN profiles.is_super_admin IS 'Super admins have full access and can manage roles/permissions';

