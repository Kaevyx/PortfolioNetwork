-- Documentation Management System
-- Allows admins to create, manage, and update documentation pages with categories

-- Documentation Categories Table
CREATE TABLE IF NOT EXISTS documentation_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  icon_name TEXT, -- Icon identifier (e.g., "BookOpen", "User", etc.)
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by TEXT NOT NULL, -- Clerk ID
  updated_by TEXT
);

-- Documentation Pages Table
CREATE TABLE IF NOT EXISTS documentation_pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID REFERENCES documentation_categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE, -- URL-friendly identifier
  content TEXT NOT NULL, -- HTML content
  description TEXT, -- Short description for previews
  display_order INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN DEFAULT FALSE,
  is_featured BOOLEAN DEFAULT FALSE, -- For highlighting important pages
  published_at TIMESTAMP WITH TIME ZONE,
  published_by TEXT, -- Clerk ID
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by TEXT NOT NULL, -- Clerk ID
  updated_by TEXT,
  view_count INTEGER DEFAULT 0, -- Track page views
  last_viewed_at TIMESTAMP WITH TIME ZONE
);

-- Documentation Chapters Table (for organizing pages within categories)
CREATE TABLE IF NOT EXISTS documentation_chapters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID REFERENCES documentation_categories(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by TEXT NOT NULL, -- Clerk ID
  updated_by TEXT
);

-- Documentation Sections Table (for organizing pages within chapters)
CREATE TABLE IF NOT EXISTS documentation_sections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chapter_id UUID REFERENCES documentation_chapters(id) ON DELETE CASCADE,
  page_id UUID REFERENCES documentation_pages(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_doc_categories_display_order ON documentation_categories(display_order);
CREATE INDEX IF NOT EXISTS idx_doc_categories_active ON documentation_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_doc_pages_category ON documentation_pages(category_id);
CREATE INDEX IF NOT EXISTS idx_doc_pages_slug ON documentation_pages(slug);
CREATE INDEX IF NOT EXISTS idx_doc_pages_published ON documentation_pages(is_published);
CREATE INDEX IF NOT EXISTS idx_doc_pages_featured ON documentation_pages(is_featured);
CREATE INDEX IF NOT EXISTS idx_doc_pages_display_order ON documentation_pages(display_order);
CREATE INDEX IF NOT EXISTS idx_doc_chapters_category ON documentation_chapters(category_id);
CREATE INDEX IF NOT EXISTS idx_doc_chapters_display_order ON documentation_chapters(display_order);
CREATE INDEX IF NOT EXISTS idx_doc_sections_chapter ON documentation_sections(chapter_id);
CREATE INDEX IF NOT EXISTS idx_doc_sections_page ON documentation_sections(page_id);
CREATE INDEX IF NOT EXISTS idx_doc_sections_display_order ON documentation_sections(display_order);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_documentation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_doc_categories_updated_at ON documentation_categories;
DROP TRIGGER IF EXISTS trigger_doc_pages_updated_at ON documentation_pages;
DROP TRIGGER IF EXISTS trigger_doc_chapters_updated_at ON documentation_chapters;
DROP TRIGGER IF EXISTS trigger_doc_sections_updated_at ON documentation_sections;

-- Create triggers
CREATE TRIGGER trigger_doc_categories_updated_at
  BEFORE UPDATE ON documentation_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_documentation_updated_at();

CREATE TRIGGER trigger_doc_pages_updated_at
  BEFORE UPDATE ON documentation_pages
  FOR EACH ROW
  EXECUTE FUNCTION update_documentation_updated_at();

CREATE TRIGGER trigger_doc_chapters_updated_at
  BEFORE UPDATE ON documentation_chapters
  FOR EACH ROW
  EXECUTE FUNCTION update_documentation_updated_at();

CREATE TRIGGER trigger_doc_sections_updated_at
  BEFORE UPDATE ON documentation_sections
  FOR EACH ROW
  EXECUTE FUNCTION update_documentation_updated_at();

-- Function to increment page view count
CREATE OR REPLACE FUNCTION increment_documentation_page_view(p_page_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE documentation_pages
  SET 
    view_count = view_count + 1,
    last_viewed_at = NOW()
  WHERE id = p_page_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get published documentation structure
DROP FUNCTION IF EXISTS get_published_documentation();
CREATE OR REPLACE FUNCTION get_published_documentation()
RETURNS TABLE (
  category_id UUID,
  category_name TEXT,
  category_description TEXT,
  category_icon TEXT,
  category_order INTEGER,
  chapter_id UUID,
  chapter_title TEXT,
  chapter_description TEXT,
  chapter_order INTEGER,
  section_id UUID,
  section_title TEXT,
  section_order INTEGER,
  page_id UUID,
  page_title TEXT,
  page_slug TEXT,
  page_description TEXT,
  page_content TEXT,
  page_order INTEGER,
  page_featured BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id AS category_id,
    c.name AS category_name,
    c.description AS category_description,
    c.icon_name AS category_icon,
    c.display_order AS category_order,
    ch.id AS chapter_id,
    ch.title AS chapter_title,
    ch.description AS chapter_description,
    ch.display_order AS chapter_order,
    s.id AS section_id,
    s.title AS section_title,
    s.display_order AS section_order,
    p.id AS page_id,
    p.title AS page_title,
    p.slug AS page_slug,
    p.description AS page_description,
    p.content AS page_content,
    p.display_order AS page_order,
    p.is_featured AS page_featured
  FROM documentation_categories c
  LEFT JOIN documentation_chapters ch ON ch.category_id = c.id AND ch.is_active = TRUE
  LEFT JOIN documentation_sections s ON s.chapter_id = ch.id
  LEFT JOIN documentation_pages p ON p.id = s.page_id AND p.is_published = TRUE
  WHERE c.is_active = TRUE
  ORDER BY 
    c.display_order,
    ch.display_order NULLS LAST,
    s.display_order NULLS LAST,
    p.display_order NULLS LAST;
END;
$$ LANGUAGE plpgsql;

-- RLS Policies (disabled for Clerk auth, but can be enabled if needed)
ALTER TABLE documentation_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE documentation_pages DISABLE ROW LEVEL SECURITY;
ALTER TABLE documentation_chapters DISABLE ROW LEVEL SECURITY;
ALTER TABLE documentation_sections DISABLE ROW LEVEL SECURITY;

-- Comments for documentation
COMMENT ON TABLE documentation_categories IS 'Categories for organizing documentation (e.g., Getting Started, Features, etc.)';
COMMENT ON TABLE documentation_pages IS 'Individual documentation pages with content';
COMMENT ON TABLE documentation_chapters IS 'Chapters within categories for further organization';
COMMENT ON TABLE documentation_sections IS 'Sections within chapters that link to pages';
COMMENT ON FUNCTION get_published_documentation IS 'Returns the complete published documentation structure for display';

