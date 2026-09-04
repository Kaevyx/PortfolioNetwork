-- Add trigger to create review notifications
CREATE OR REPLACE FUNCTION notify_review()
RETURNS TRIGGER AS $$
DECLARE
  reviewer_name TEXT;
BEGIN
  -- Get reviewer's display name
  SELECT display_name INTO reviewer_name FROM profiles WHERE clerk_id = NEW.reviewer_id;
  
  -- Don't notify if user reviews themselves
  IF NEW.reviewer_id != NEW.reviewee_id AND NEW.reviewee_id IS NOT NULL THEN
    -- Create review notification for the user being reviewed
    INSERT INTO notifications (user_id, type, actor_id, target_id, message)
    VALUES (
      NEW.reviewee_id,
      'review',
      NEW.reviewer_id,
      NEW.id::TEXT,
      COALESCE(reviewer_name, 'Someone') || ' left you a ' || NEW.rating || '-star review'
    );
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the insert
    RAISE WARNING 'Error creating review notification: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create review notifications
DROP TRIGGER IF EXISTS on_review_notification ON reviews;
CREATE TRIGGER on_review_notification
  AFTER INSERT ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION notify_review();

