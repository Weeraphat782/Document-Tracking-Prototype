-- Migration script to add new hand-to-hand delivery statuses
-- Run this in your Supabase SQL Editor if you have an existing database

-- Add new values to document_status enum
ALTER TYPE document_status ADD VALUE 'REJECTED - Ready for Pickup';
ALTER TYPE document_status ADD VALUE 'Delivered (Hand to Hand)';
ALTER TYPE document_status ADD VALUE 'REJECTED - Hand to Hand';
ALTER TYPE document_status ADD VALUE 'Final Approval - Hand to Hand';
ALTER TYPE document_status ADD VALUE 'In Transit - Rejected Document';

-- Update any existing documents with 'REJECTED ROUTE' status that should use new statuses
-- (This is optional - depends on your business logic)
-- You might want to review these manually first

-- Example: Update documents that were rejected with drop_off delivery method
-- UPDATE documents 
-- SET status = 'REJECTED - Ready for Pickup'
-- WHERE status = 'REJECTED ROUTE' 
-- AND action_history::text LIKE '%"deliveryMethod":"drop_off"%'
-- AND action_history::text LIKE '%"action":"reject"%';

-- Example: Update documents that were rejected with hand_to_hand delivery method
-- UPDATE documents 
-- SET status = 'REJECTED - Hand to Hand'
-- WHERE status = 'REJECTED ROUTE' 
-- AND action_history::text LIKE '%"deliveryMethod":"hand_to_hand"%'
-- AND action_history::text LIKE '%"action":"reject"%';

-- Verify the change
SELECT unnest(enum_range(NULL::document_status)) AS status_values; 