-- Support Tickets System
-- Comprehensive ticket management for platform support, bug reports, and feature requests

-- Support Ticket Categories
CREATE TABLE IF NOT EXISTS support_ticket_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE, -- e.g., 'platform_support', 'bug_report', 'feature_request'
  display_name TEXT NOT NULL, -- e.g., 'Platform Support', 'Bug Report', 'Feature Request'
  description TEXT,
  icon TEXT, -- Optional icon identifier
  custom_fields JSONB, -- Custom fields/questions for this category type
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Support Ticket Priorities
CREATE TABLE IF NOT EXISTS support_ticket_priorities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE, -- e.g., 'low', 'normal', 'high', 'urgent'
  display_name TEXT NOT NULL, -- e.g., 'Low', 'Normal', 'High', 'Urgent'
  color TEXT, -- Color code for UI (e.g., 'green', 'yellow', 'orange', 'red')
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Support Tickets
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_number TEXT NOT NULL UNIQUE, -- Auto-generated ticket number (e.g., TICKET-0001)
  user_id TEXT NOT NULL REFERENCES profiles(clerk_id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES support_ticket_categories(id) ON DELETE RESTRICT,
  priority_id UUID NOT NULL REFERENCES support_ticket_priorities(id) ON DELETE RESTRICT,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  custom_data JSONB, -- Store custom field responses
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting_user', 'customer_reply', 'resolved', 'closed')),
  assigned_to TEXT REFERENCES profiles(clerk_id) ON DELETE SET NULL, -- Admin assigned to ticket
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  closed_at TIMESTAMP WITH TIME ZONE,
  closed_by TEXT REFERENCES profiles(clerk_id) ON DELETE SET NULL,
  last_responded_by TEXT, -- 'staff' or 'user'
  last_responded_at TIMESTAMP WITH TIME ZONE,
  is_public BOOLEAN DEFAULT TRUE -- Whether ticket is visible to user
);

-- Support Ticket Replies/Updates
CREATE TABLE IF NOT EXISTS support_ticket_replies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES profiles(clerk_id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT FALSE, -- Internal notes visible only to admins
  is_admin_reply BOOLEAN DEFAULT FALSE, -- Whether reply is from admin
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Support Ticket Attachments
CREATE TABLE IF NOT EXISTS support_ticket_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE,
  reply_id UUID REFERENCES support_ticket_replies(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT, -- Size in bytes
  file_type TEXT, -- MIME type
  uploaded_by TEXT NOT NULL REFERENCES profiles(clerk_id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_category_id ON support_tickets(category_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority_id ON support_tickets(priority_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_to ON support_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON support_tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_ticket_number ON support_tickets(ticket_number);

CREATE INDEX IF NOT EXISTS idx_support_ticket_replies_ticket_id ON support_ticket_replies(ticket_id);
CREATE INDEX IF NOT EXISTS idx_support_ticket_replies_user_id ON support_ticket_replies(user_id);
CREATE INDEX IF NOT EXISTS idx_support_ticket_replies_created_at ON support_ticket_replies(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_support_ticket_attachments_ticket_id ON support_ticket_attachments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_support_ticket_attachments_reply_id ON support_ticket_attachments(reply_id);

-- Function to generate ticket number
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TEXT AS $$
DECLARE
  next_num INTEGER;
  ticket_num TEXT;
BEGIN
  -- Get the next ticket number
  SELECT COALESCE(MAX(CAST(SUBSTRING(ticket_number FROM 'TICKET-(\d+)') AS INTEGER)), 0) + 1
  INTO next_num
  FROM support_tickets;
  
  -- Format as TICKET-0001, TICKET-0002, etc.
  ticket_num := 'TICKET-' || LPAD(next_num::TEXT, 4, '0');
  
  RETURN ticket_num;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate ticket number
CREATE OR REPLACE FUNCTION set_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
    NEW.ticket_number := generate_ticket_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_ticket_number ON support_tickets;
CREATE TRIGGER trigger_set_ticket_number
  BEFORE INSERT ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION set_ticket_number();

-- Function to update ticket updated_at timestamp
CREATE OR REPLACE FUNCTION update_support_ticket_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_support_ticket_updated_at ON support_tickets;
CREATE TRIGGER trigger_update_support_ticket_updated_at
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_support_ticket_updated_at();

-- Function to update ticket reply updated_at timestamp
CREATE OR REPLACE FUNCTION update_support_ticket_reply_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_support_ticket_reply_updated_at ON support_ticket_replies;
CREATE TRIGGER trigger_update_support_ticket_reply_updated_at
  BEFORE UPDATE ON support_ticket_replies
  FOR EACH ROW
  EXECUTE FUNCTION update_support_ticket_reply_updated_at();

-- Function to set resolved_at when status changes to resolved and update last_responded_by
CREATE OR REPLACE FUNCTION set_ticket_resolved_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'resolved' AND OLD.status != 'resolved' THEN
    NEW.resolved_at = NOW();
  ELSIF NEW.status != 'resolved' THEN
    NEW.resolved_at = NULL;
  END IF;
  
  IF NEW.status = 'closed' AND OLD.status != 'closed' THEN
    NEW.closed_at = NOW();
  ELSIF NEW.status != 'closed' THEN
    NEW.closed_at = NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_ticket_resolved_at ON support_tickets;
CREATE TRIGGER trigger_set_ticket_resolved_at
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION set_ticket_resolved_at();

-- Function to update last_responded_by when a reply is added
CREATE OR REPLACE FUNCTION update_ticket_last_responded()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE support_tickets
  SET 
    last_responded_by = CASE WHEN NEW.is_admin_reply THEN 'staff' ELSE 'user' END,
    last_responded_at = NEW.created_at,
    status = CASE 
      WHEN NEW.is_admin_reply = FALSE AND status IN ('resolved', 'closed') THEN 'customer_reply'
      WHEN NEW.is_admin_reply = FALSE THEN 'customer_reply'
      ELSE status
    END
  WHERE id = NEW.ticket_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_ticket_last_responded ON support_ticket_replies;
CREATE TRIGGER trigger_update_ticket_last_responded
  AFTER INSERT ON support_ticket_replies
  FOR EACH ROW
  EXECUTE FUNCTION update_ticket_last_responded();

-- Function to get user tickets with details
DROP FUNCTION IF EXISTS get_user_tickets(TEXT, TEXT, INTEGER, INTEGER);
CREATE OR REPLACE FUNCTION get_user_tickets(
  p_user_id TEXT,
  p_status TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  ticket_number TEXT,
  category_id UUID,
  category_name TEXT,
  category_display_name TEXT,
  priority_id UUID,
  priority_name TEXT,
  priority_display_name TEXT,
  priority_color TEXT,
  subject TEXT,
  description TEXT,
  status TEXT,
  assigned_to TEXT,
  assigned_to_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  closed_at TIMESTAMP WITH TIME ZONE,
  last_responded_by TEXT,
  last_responded_at TIMESTAMP WITH TIME ZONE,
  reply_count BIGINT,
  last_reply_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    st.id,
    st.ticket_number,
    st.category_id,
    stc.name as category_name,
    stc.display_name as category_display_name,
    st.priority_id,
    stp.name as priority_name,
    stp.display_name as priority_display_name,
    stp.color as priority_color,
    st.subject,
    st.description,
    st.status,
    st.assigned_to,
    COALESCE(pa.display_name, pa.email, st.assigned_to) as assigned_to_name,
    st.created_at,
    st.updated_at,
    st.resolved_at,
    st.closed_at,
    st.last_responded_by,
    st.last_responded_at,
    COUNT(DISTINCT str.id) FILTER (WHERE str.is_internal = FALSE) as reply_count,
    MAX(str.created_at) FILTER (WHERE str.is_internal = FALSE) as last_reply_at
  FROM support_tickets st
  INNER JOIN support_ticket_categories stc ON stc.id = st.category_id
  INNER JOIN support_ticket_priorities stp ON stp.id = st.priority_id
  LEFT JOIN profiles pa ON pa.clerk_id = st.assigned_to
  LEFT JOIN support_ticket_replies str ON str.ticket_id = st.id
  WHERE st.user_id = p_user_id
    AND st.is_public = TRUE
    AND (p_status IS NULL OR st.status = p_status)
  GROUP BY st.id, st.category_id, stc.name, stc.display_name, st.priority_id, stp.name, stp.display_name, stp.color, pa.display_name, pa.email, st.last_responded_by, st.last_responded_at
  ORDER BY st.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get admin tickets with details
DROP FUNCTION IF EXISTS get_admin_tickets(TEXT, UUID, UUID, TEXT, TEXT, INTEGER, INTEGER);
CREATE OR REPLACE FUNCTION get_admin_tickets(
  p_status TEXT DEFAULT NULL,
  p_category_id UUID DEFAULT NULL,
  p_priority_id UUID DEFAULT NULL,
  p_assigned_to TEXT DEFAULT NULL,
  p_user_id TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  ticket_number TEXT,
  user_id TEXT,
  user_email TEXT,
  user_display_name TEXT,
  user_subscription_plan TEXT,
  user_is_premium BOOLEAN,
  category_id UUID,
  category_name TEXT,
  category_display_name TEXT,
  priority_id UUID,
  priority_name TEXT,
  priority_display_name TEXT,
  priority_color TEXT,
  subject TEXT,
  description TEXT,
  status TEXT,
  assigned_to TEXT,
  assigned_to_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  closed_at TIMESTAMP WITH TIME ZONE,
  last_responded_by TEXT,
  last_responded_at TIMESTAMP WITH TIME ZONE,
  reply_count BIGINT,
  last_reply_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    st.id,
    st.ticket_number,
    st.user_id,
    pu.email as user_email,
    COALESCE(pu.display_name, pu.email, st.user_id) as user_display_name,
    COALESCE(pu.subscription_plan, 'free') as user_subscription_plan,
    COALESCE(pu.is_premium, FALSE) as user_is_premium,
    st.category_id,
    stc.name as category_name,
    stc.display_name as category_display_name,
    st.priority_id,
    stp.name as priority_name,
    stp.display_name as priority_display_name,
    stp.color as priority_color,
    st.subject,
    st.description,
    st.status,
    st.assigned_to,
    COALESCE(pa.display_name, pa.email, st.assigned_to) as assigned_to_name,
    st.created_at,
    st.updated_at,
    st.resolved_at,
    st.closed_at,
    st.last_responded_by,
    st.last_responded_at,
    COUNT(DISTINCT str.id) as reply_count,
    MAX(str.created_at) as last_reply_at
  FROM support_tickets st
  INNER JOIN profiles pu ON pu.clerk_id = st.user_id
  INNER JOIN support_ticket_categories stc ON stc.id = st.category_id
  INNER JOIN support_ticket_priorities stp ON stp.id = st.priority_id
  LEFT JOIN profiles pa ON pa.clerk_id = st.assigned_to
  LEFT JOIN support_ticket_replies str ON str.ticket_id = st.id
  WHERE (p_status IS NULL OR st.status = p_status)
    AND (p_category_id IS NULL OR st.category_id = p_category_id)
    AND (p_priority_id IS NULL OR st.priority_id = p_priority_id)
    AND (p_assigned_to IS NULL OR st.assigned_to = p_assigned_to)
    AND (p_user_id IS NULL OR st.user_id = p_user_id)
  GROUP BY st.id, stc.id, stc.name, stc.display_name, stp.id, stp.name, stp.display_name, stp.color, 
           pu.email, pu.display_name, pu.subscription_plan, pu.is_premium, pa.display_name, pa.email, st.last_responded_by, st.last_responded_at
  ORDER BY st.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Seed default categories
INSERT INTO support_ticket_categories (name, display_name, description, display_order) VALUES
  ('platform_support', 'Platform Support', 'General platform support and assistance', 1),
  ('bug_report', 'Bug Report', 'Report bugs or technical issues', 2),
  ('feature_request', 'Feature Request', 'Request new features or improvements', 3),
  ('account_issue', 'Account Issue', 'Issues related to user accounts', 4),
  ('billing', 'Billing', 'Billing and payment related inquiries', 5),
  ('other', 'Other', 'Other inquiries or requests', 6)
ON CONFLICT (name) DO NOTHING;

-- Seed default priorities
INSERT INTO support_ticket_priorities (name, display_name, color, display_order) VALUES
  ('low', 'Low', 'green', 1),
  ('normal', 'Normal', 'blue', 2),
  ('high', 'High', 'orange', 3),
  ('urgent', 'Urgent', 'red', 4)
ON CONFLICT (name) DO NOTHING;

-- Comments
COMMENT ON TABLE support_tickets IS 'User support tickets for platform support, bug reports, and feature requests';
COMMENT ON TABLE support_ticket_replies IS 'Replies and updates to support tickets';
COMMENT ON TABLE support_ticket_attachments IS 'File attachments for tickets and replies';
COMMENT ON TABLE support_ticket_categories IS 'Categories for support tickets';
COMMENT ON TABLE support_ticket_priorities IS 'Priority levels for support tickets';

