-- Update support_tickets status constraint to include 'customer_reply'
ALTER TABLE support_tickets
DROP CONSTRAINT IF EXISTS support_tickets_status_check;

ALTER TABLE support_tickets
ADD CONSTRAINT support_tickets_status_check 
CHECK (status IN ('open', 'in_progress', 'waiting_user', 'customer_reply', 'resolved', 'closed'));


