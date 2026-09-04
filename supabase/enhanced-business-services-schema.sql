-- Enhanced business service advertising features

-- Business services table (detailed service listings)
CREATE TABLE IF NOT EXISTS business_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id TEXT NOT NULL, -- Clerk ID
  service_name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT, -- e.g., 'web-development', 'design', 'consulting', 'marketing'
  price_range TEXT, -- e.g., '$50-$100', 'Contact for quote', 'Free consultation'
  duration TEXT, -- e.g., '2-4 weeks', 'Ongoing'
  image_url TEXT,
  tags TEXT[],
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  view_count INTEGER DEFAULT 0,
  inquiry_count INTEGER DEFAULT 0,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (profile_id) REFERENCES profiles(clerk_id) ON DELETE CASCADE
);

-- Service inquiries (when users contact about a service)
CREATE TABLE IF NOT EXISTS service_inquiries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_id UUID NOT NULL,
  inquirer_id TEXT, -- Clerk ID of person inquiring (null for anonymous)
  message TEXT NOT NULL,
  contact_email TEXT,
  contact_phone TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'responded', 'closed'
  responded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (service_id) REFERENCES business_services(id) ON DELETE CASCADE,
  FOREIGN KEY (inquirer_id) REFERENCES profiles(clerk_id) ON DELETE SET NULL
);

-- Service reviews (reviews specific to a service)
CREATE TABLE IF NOT EXISTS service_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_id UUID NOT NULL,
  reviewer_id TEXT NOT NULL, -- Clerk ID
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (service_id) REFERENCES business_services(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewer_id) REFERENCES profiles(clerk_id) ON DELETE CASCADE,
  UNIQUE(service_id, reviewer_id) -- One review per user per service
);

-- Service portfolio items (link services to portfolio items)
CREATE TABLE IF NOT EXISTS service_portfolio_items (
  service_id UUID NOT NULL,
  portfolio_item_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (service_id, portfolio_item_id),
  FOREIGN KEY (service_id) REFERENCES business_services(id) ON DELETE CASCADE,
  FOREIGN KEY (portfolio_item_id) REFERENCES portfolio_items(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_business_services_profile_id ON business_services(profile_id);
CREATE INDEX IF NOT EXISTS idx_business_services_category ON business_services(category);
CREATE INDEX IF NOT EXISTS idx_business_services_featured ON business_services(is_featured);
CREATE INDEX IF NOT EXISTS idx_business_services_active ON business_services(is_active);
CREATE INDEX IF NOT EXISTS idx_service_inquiries_service_id ON service_inquiries(service_id);
CREATE INDEX IF NOT EXISTS idx_service_inquiries_status ON service_inquiries(status);
CREATE INDEX IF NOT EXISTS idx_service_reviews_service_id ON service_reviews(service_id);
CREATE INDEX IF NOT EXISTS idx_service_reviews_reviewer_id ON service_reviews(reviewer_id);

-- Function to update inquiry count
CREATE OR REPLACE FUNCTION update_service_inquiry_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE business_services
    SET inquiry_count = inquiry_count + 1,
        updated_at = NOW()
    WHERE id = NEW.service_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update inquiry count
DROP TRIGGER IF EXISTS update_service_inquiry_count_trigger ON service_inquiries;
CREATE TRIGGER update_service_inquiry_count_trigger
    AFTER INSERT ON service_inquiries
    FOR EACH ROW EXECUTE FUNCTION update_service_inquiry_count();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_business_service_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_business_services_updated_at ON business_services;
CREATE TRIGGER update_business_services_updated_at
    BEFORE UPDATE ON business_services
    FOR EACH ROW EXECUTE FUNCTION update_business_service_updated_at();

DROP TRIGGER IF EXISTS update_service_reviews_updated_at ON service_reviews;
CREATE TRIGGER update_service_reviews_updated_at
    BEFORE UPDATE ON service_reviews
    FOR EACH ROW EXECUTE FUNCTION update_business_service_updated_at();






