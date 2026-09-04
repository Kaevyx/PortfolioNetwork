-- Connections are defined as mutual follows (both users follow each other)
-- This creates a view to easily query connections

-- Create a function to check if two users are connected
CREATE OR REPLACE FUNCTION are_connected(user1_id TEXT, user2_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM follows f1
    JOIN follows f2 ON f1.follower_id = f2.following_id AND f1.following_id = f2.follower_id
    WHERE (f1.follower_id = user1_id AND f1.following_id = user2_id)
       OR (f1.follower_id = user2_id AND f1.following_id = user1_id)
  );
END;
$$ LANGUAGE plpgsql;

-- Create a view for connections (mutual follows)
CREATE OR REPLACE VIEW connections AS
SELECT 
  f1.follower_id as user1_id,
  f1.following_id as user2_id,
  LEAST(f1.created_at, f2.created_at) as connected_at,
  f1.created_at as user1_followed_at,
  f2.created_at as user2_followed_at
FROM follows f1
INNER JOIN follows f2 
  ON f1.follower_id = f2.following_id 
  AND f1.following_id = f2.follower_id
WHERE f1.follower_id < f2.follower_id; -- Avoid duplicates

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_follows_follower_following ON follows(follower_id, following_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_follower ON follows(following_id, follower_id);

-- Function to get connection count for a user
CREATE OR REPLACE FUNCTION get_connection_count(user_id TEXT)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM connections
    WHERE user1_id = user_id OR user2_id = user_id
  );
END;
$$ LANGUAGE plpgsql;

-- Function to get mutual connections between two users
CREATE OR REPLACE FUNCTION get_mutual_connections(user1_id TEXT, user2_id TEXT)
RETURNS TABLE(
  connection_id TEXT,
  display_name TEXT,
  clerk_id TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    p.clerk_id as connection_id,
    p.display_name,
    p.clerk_id
  FROM profiles p
  WHERE p.clerk_id IN (
    -- Connections of user1
    SELECT CASE 
      WHEN c.user1_id = user1_id THEN c.user2_id
      ELSE c.user1_id
    END
    FROM connections c
    WHERE c.user1_id = user1_id OR c.user2_id = user1_id
  )
  AND p.clerk_id IN (
    -- Connections of user2
    SELECT CASE 
      WHEN c.user1_id = user2_id THEN c.user2_id
      ELSE c.user1_id
    END
    FROM connections c
    WHERE c.user1_id = user2_id OR c.user2_id = user2_id
  )
  AND p.clerk_id != user1_id
  AND p.clerk_id != user2_id;
END;
$$ LANGUAGE plpgsql;






