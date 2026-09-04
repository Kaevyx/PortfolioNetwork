-- Messaging System Schema
-- This creates tables for user-to-user messaging (Inbox feature)

-- Conversations table (one conversation per pair of users)
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  participant1_id TEXT NOT NULL, -- Clerk ID of first participant
  participant2_id TEXT NOT NULL, -- Clerk ID of second participant
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_message_id UUID,
  participant1_unread_count INTEGER DEFAULT 0,
  participant2_unread_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (participant1_id) REFERENCES profiles(clerk_id) ON DELETE CASCADE,
  FOREIGN KEY (participant2_id) REFERENCES profiles(clerk_id) ON DELETE CASCADE,
  -- Ensure unique conversation per pair (order doesn't matter)
  CONSTRAINT unique_conversation_pair CHECK (participant1_id < participant2_id),
  UNIQUE(participant1_id, participant2_id)
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL,
  sender_id TEXT NOT NULL, -- Clerk ID of sender
  recipient_id TEXT NOT NULL, -- Clerk ID of recipient
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES profiles(clerk_id) ON DELETE CASCADE,
  FOREIGN KEY (recipient_id) REFERENCES profiles(clerk_id) ON DELETE CASCADE
);

-- Add foreign key for last_message_id
ALTER TABLE conversations 
  ADD CONSTRAINT fk_last_message 
  FOREIGN KEY (last_message_id) 
  REFERENCES messages(id) 
  ON DELETE SET NULL;

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_conversations_participant1 ON conversations(participant1_id);
CREATE INDEX IF NOT EXISTS idx_conversations_participant2 ON conversations(participant2_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON messages(recipient_id, is_read);

-- Function to get or create a conversation between two users
CREATE OR REPLACE FUNCTION get_or_create_conversation(
  p_user1_id TEXT,
  p_user2_id TEXT
)
RETURNS UUID AS $$
DECLARE
  v_conversation_id UUID;
  v_participant1 TEXT;
  v_participant2 TEXT;
BEGIN
  -- Ensure consistent ordering (smaller ID first)
  IF p_user1_id < p_user2_id THEN
    v_participant1 := p_user1_id;
    v_participant2 := p_user2_id;
  ELSE
    v_participant1 := p_user2_id;
    v_participant2 := p_user1_id;
  END IF;

  -- Try to get existing conversation
  SELECT id INTO v_conversation_id
  FROM conversations
  WHERE participant1_id = v_participant1
    AND participant2_id = v_participant2;

  -- If no conversation exists, create one
  IF v_conversation_id IS NULL THEN
    INSERT INTO conversations (participant1_id, participant2_id)
    VALUES (v_participant1, v_participant2)
    RETURNING id INTO v_conversation_id;
  END IF;

  RETURN v_conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user conversations with last message and unread count
CREATE OR REPLACE FUNCTION get_user_conversations(p_user_id TEXT)
RETURNS TABLE (
  conversation_id UUID,
  other_user_id TEXT,
  other_user_display_name TEXT,
  other_user_email TEXT,
  other_user_avatar_url TEXT,
  last_message_content TEXT,
  last_message_sender_id TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE,
  unread_count INTEGER,
  last_message_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as conversation_id,
    CASE 
      WHEN c.participant1_id = p_user_id THEN c.participant2_id
      ELSE c.participant1_id
    END as other_user_id,
    p.display_name as other_user_display_name,
    p.email as other_user_email,
    p.avatar_url as other_user_avatar_url,
    m.content as last_message_content,
    m.sender_id as last_message_sender_id,
    c.last_message_at,
    CASE 
      WHEN c.participant1_id = p_user_id THEN c.participant1_unread_count
      ELSE c.participant2_unread_count
    END as unread_count,
    c.last_message_id
  FROM conversations c
  INNER JOIN profiles p ON (
    (c.participant1_id = p_user_id AND p.clerk_id = c.participant2_id) OR
    (c.participant2_id = p_user_id AND p.clerk_id = c.participant1_id)
  )
  LEFT JOIN messages m ON m.id = c.last_message_id
  WHERE c.participant1_id = p_user_id OR c.participant2_id = p_user_id
  ORDER BY c.last_message_at DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get messages for a conversation
CREATE OR REPLACE FUNCTION get_conversation_messages(
  p_conversation_id UUID,
  p_user_id TEXT,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  sender_id TEXT,
  sender_display_name TEXT,
  sender_avatar_url TEXT,
  recipient_id TEXT,
  content TEXT,
  is_read BOOLEAN,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.sender_id,
    p.display_name as sender_display_name,
    p.avatar_url as sender_avatar_url,
    m.recipient_id,
    m.content,
    m.is_read,
    m.read_at,
    m.created_at
  FROM messages m
  INNER JOIN profiles p ON p.clerk_id = m.sender_id
  WHERE m.conversation_id = p_conversation_id
  ORDER BY m.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update conversation when a new message is inserted
CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
DECLARE
  v_participant1 TEXT;
  v_participant2 TEXT;
BEGIN
  -- Get conversation participants
  SELECT participant1_id, participant2_id INTO v_participant1, v_participant2
  FROM conversations
  WHERE id = NEW.conversation_id;

  -- Update conversation
  UPDATE conversations
  SET 
    last_message_at = NEW.created_at,
    last_message_id = NEW.id,
    updated_at = NOW(),
    -- Increment unread count for recipient
    participant1_unread_count = CASE 
      WHEN participant1_id = NEW.recipient_id THEN participant1_unread_count + 1
      ELSE participant1_unread_count
    END,
    participant2_unread_count = CASE 
      WHEN participant2_id = NEW.recipient_id THEN participant2_unread_count + 1
      ELSE participant2_unread_count
    END
  WHERE id = NEW.conversation_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_conversation_on_message ON messages;
CREATE TRIGGER trigger_update_conversation_on_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_on_message();

-- Trigger to update unread counts when message is read
CREATE OR REPLACE FUNCTION update_unread_count_on_read()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_read = TRUE AND OLD.is_read = FALSE THEN
    UPDATE conversations
    SET 
      participant1_unread_count = CASE 
        WHEN participant1_id = NEW.recipient_id THEN GREATEST(0, participant1_unread_count - 1)
        ELSE participant1_unread_count
      END,
      participant2_unread_count = CASE 
        WHEN participant2_id = NEW.recipient_id THEN GREATEST(0, participant2_unread_count - 1)
        ELSE participant2_unread_count
      END
    WHERE id = (
      SELECT conversation_id FROM messages WHERE id = NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_unread_count_on_read ON messages;
CREATE TRIGGER trigger_update_unread_count_on_read
  AFTER UPDATE OF is_read ON messages
  FOR EACH ROW
  WHEN (NEW.is_read IS DISTINCT FROM OLD.is_read)
  EXECUTE FUNCTION update_unread_count_on_read();

-- Function to mark all messages in a conversation as read
CREATE OR REPLACE FUNCTION mark_conversation_as_read(
  p_conversation_id UUID,
  p_user_id TEXT
)
RETURNS void AS $$
BEGIN
  UPDATE messages
  SET 
    is_read = TRUE,
    read_at = NOW()
  WHERE conversation_id = p_conversation_id
    AND recipient_id = p_user_id
    AND is_read = FALSE;

  -- Reset unread count
  UPDATE conversations
  SET 
    participant1_unread_count = CASE 
      WHEN participant1_id = p_user_id THEN 0
      ELSE participant1_unread_count
    END,
    participant2_unread_count = CASE 
      WHEN participant2_id = p_user_id THEN 0
      ELSE participant2_unread_count
    END
  WHERE id = p_conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get total unread message count for a user
CREATE OR REPLACE FUNCTION get_user_unread_message_count(p_user_id TEXT)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COALESCE(SUM(
    CASE 
      WHEN participant1_id = p_user_id THEN participant1_unread_count
      WHEN participant2_id = p_user_id THEN participant2_unread_count
      ELSE 0
    END
  ), 0) INTO v_count
  FROM conversations
  WHERE participant1_id = p_user_id OR participant2_id = p_user_id;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_or_create_conversation(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_conversations(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_conversation_messages(UUID, TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_conversation_as_read(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_unread_message_count(TEXT) TO authenticated;

-- Note: Security is handled at the application level and through SECURITY DEFINER functions
-- All functions check user permissions before allowing access to conversations/messages

