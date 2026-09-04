-- Status Page System
-- Tracks system components, their statuses, incidents, and updates

-- Component Groups (e.g., "Core Services", "API", "Dashboard", etc.)
CREATE TABLE IF NOT EXISTS status_component_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Status Components (individual features/parts of the website)
CREATE TABLE IF NOT EXISTS status_components (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID REFERENCES status_component_groups(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'operational' CHECK (status IN ('operational', 'degraded_performance', 'partial_outage', 'major_outage', 'maintenance', 'investigating')),
  status_message TEXT, -- Custom message about current status
  display_order INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT TRUE, -- Whether to show on public status page
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by TEXT REFERENCES profiles(clerk_id) ON DELETE SET NULL,
  updated_by TEXT REFERENCES profiles(clerk_id) ON DELETE SET NULL
);

-- Incidents (problems, maintenance, etc.)
CREATE TABLE IF NOT EXISTS status_incidents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT, -- Initial description of the incident
  status TEXT NOT NULL DEFAULT 'investigating' CHECK (status IN ('investigating', 'identified', 'monitoring', 'resolved', 'scheduled', 'in_progress', 'verifying')),
  severity TEXT NOT NULL DEFAULT 'minor' CHECK (severity IN ('minor', 'major', 'critical')),
  impact_scope TEXT DEFAULT 'partial' CHECK (impact_scope IN ('partial', 'full')),
  affected_components UUID[] DEFAULT ARRAY[]::UUID[], -- Array of component IDs affected
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  scheduled_start TIMESTAMP WITH TIME ZONE, -- For scheduled maintenance
  scheduled_end TIMESTAMP WITH TIME ZONE,
  is_public BOOLEAN DEFAULT TRUE,
  created_by TEXT NOT NULL REFERENCES profiles(clerk_id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Incident Updates (updates on incidents)
CREATE TABLE IF NOT EXISTS status_incident_updates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id UUID NOT NULL REFERENCES status_incidents(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('investigating', 'identified', 'monitoring', 'resolved', 'scheduled', 'in_progress', 'verifying')),
  message TEXT NOT NULL, -- Update message
  created_by TEXT NOT NULL REFERENCES profiles(clerk_id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_status_components_group_id ON status_components(group_id);
CREATE INDEX IF NOT EXISTS idx_status_components_status ON status_components(status);
CREATE INDEX IF NOT EXISTS idx_status_components_is_public ON status_components(is_public);
CREATE INDEX IF NOT EXISTS idx_status_incidents_status ON status_incidents(status);
CREATE INDEX IF NOT EXISTS idx_status_incidents_is_public ON status_incidents(is_public);
CREATE INDEX IF NOT EXISTS idx_status_incidents_started_at ON status_incidents(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_status_incident_updates_incident_id ON status_incident_updates(incident_id);
CREATE INDEX IF NOT EXISTS idx_status_incident_updates_created_at ON status_incident_updates(created_at DESC);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_status_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_status_component_groups_updated_at
  BEFORE UPDATE ON status_component_groups
  FOR EACH ROW
  EXECUTE FUNCTION update_status_updated_at();

CREATE TRIGGER update_status_components_updated_at
  BEFORE UPDATE ON status_components
  FOR EACH ROW
  EXECUTE FUNCTION update_status_updated_at();

CREATE TRIGGER update_status_incidents_updated_at
  BEFORE UPDATE ON status_incidents
  FOR EACH ROW
  EXECUTE FUNCTION update_status_updated_at();

CREATE TRIGGER update_status_incident_updates_updated_at
  BEFORE UPDATE ON status_incident_updates
  FOR EACH ROW
  EXECUTE FUNCTION update_status_updated_at();

-- Function to get overall system status
CREATE OR REPLACE FUNCTION get_overall_system_status()
RETURNS TEXT AS $$
DECLARE
  has_outage BOOLEAN;
  has_degraded BOOLEAN;
  has_maintenance BOOLEAN;
BEGIN
  -- Check for major outages
  SELECT EXISTS(
    SELECT 1 FROM status_components 
    WHERE is_public = TRUE 
    AND status IN ('major_outage', 'partial_outage')
  ) INTO has_outage;
  
  IF has_outage THEN
    RETURN 'major_outage';
  END IF;
  
  -- Check for degraded performance
  SELECT EXISTS(
    SELECT 1 FROM status_components 
    WHERE is_public = TRUE 
    AND status = 'degraded_performance'
  ) INTO has_degraded;
  
  IF has_degraded THEN
    RETURN 'degraded_performance';
  END IF;
  
  -- Check for maintenance
  SELECT EXISTS(
    SELECT 1 FROM status_components 
    WHERE is_public = TRUE 
    AND status = 'maintenance'
  ) INTO has_maintenance;
  
  IF has_maintenance THEN
    RETURN 'maintenance';
  END IF;
  
  -- Check for active critical incidents
  SELECT EXISTS(
    SELECT 1 FROM status_incidents 
    WHERE is_public = TRUE 
    AND status IN ('investigating', 'identified', 'in_progress', 'monitoring', 'verifying')
    AND severity = 'critical'
  ) INTO has_outage;
  
  IF has_outage THEN
    RETURN 'major_outage';
  END IF;
  
  -- Check for active major incidents
  SELECT EXISTS(
    SELECT 1 FROM status_incidents 
    WHERE is_public = TRUE 
    AND status IN ('investigating', 'identified', 'in_progress', 'monitoring', 'verifying')
    AND severity = 'major'
  ) INTO has_outage;
  
  IF has_outage THEN
    RETURN 'major_outage';
  END IF;
  
  -- Check for active minor incidents (should update status from operational)
  SELECT EXISTS(
    SELECT 1 FROM status_incidents 
    WHERE is_public = TRUE 
    AND status IN ('investigating', 'identified', 'in_progress', 'monitoring', 'verifying')
    AND severity = 'minor'
  ) INTO has_degraded;
  
  IF has_degraded THEN
    RETURN 'degraded_performance';
  END IF;
  
  -- Check for investigating status on components
  SELECT EXISTS(
    SELECT 1 FROM status_components 
    WHERE is_public = TRUE 
    AND status = 'investigating'
  ) INTO has_degraded;
  
  IF has_degraded THEN
    RETURN 'degraded_performance';
  END IF;
  
  -- Default to operational
  RETURN 'operational';
END;
$$ LANGUAGE plpgsql;

