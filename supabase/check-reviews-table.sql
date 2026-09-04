-- First, check if the reviews table exists and in which schema
SELECT 
  table_schema,
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'reviews'
ORDER BY table_schema, ordinal_position;

-- Also check all tables named 'reviews' in any schema
SELECT 
  table_schema,
  table_name
FROM information_schema.tables
WHERE table_name LIKE '%review%'
ORDER BY table_schema, table_name;

