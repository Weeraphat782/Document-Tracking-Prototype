-- Update script for Document Status changes
-- Run this if you already have dual status system but need to update document_status enum

-- First, update all documents to use ACTIVE instead of DRAFT and APPROVED
UPDATE documents SET document_status = 'ACTIVE' 
WHERE document_status = 'DRAFT';

UPDATE documents SET document_status = 'ACTIVE' 
WHERE document_status = 'APPROVED';

-- Drop the old enum values (this requires recreating the enum)
-- Step 1: Create a new enum with only the values we want
CREATE TYPE document_status_updated AS ENUM (
  'ACTIVE', 
  'REJECTED',
  'COMPLETED',
  'CANCELLED'
);

-- Step 2: Update the column to use the new enum
ALTER TABLE documents 
ALTER COLUMN document_status TYPE document_status_updated 
USING document_status::text::document_status_updated;

-- Step 3: Drop the old enum and rename the new one
DROP TYPE document_status_new;
ALTER TYPE document_status_updated RENAME TO document_status_new;

-- Update the display function to only handle 4 statuses
CREATE OR REPLACE FUNCTION get_dual_status_display(doc_status document_status_new, track_status tracking_status)
RETURNS TABLE(
  document_status_text TEXT,
  document_status_color TEXT,
  document_status_icon TEXT,
  tracking_status_text TEXT,
  tracking_status_color TEXT,
  tracking_status_icon TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    -- Document Status Display (4 statuses only)
    CASE doc_status
      WHEN 'ACTIVE' THEN 'Active'
      WHEN 'REJECTED' THEN 'Rejected'
      WHEN 'COMPLETED' THEN 'Completed'
      WHEN 'CANCELLED' THEN 'Cancelled'
    END,
    CASE doc_status
      WHEN 'ACTIVE' THEN 'bg-blue-500'
      WHEN 'REJECTED' THEN 'bg-red-500'
      WHEN 'COMPLETED' THEN 'bg-emerald-500'
      WHEN 'CANCELLED' THEN 'bg-gray-600'
    END,
    CASE doc_status
      WHEN 'ACTIVE' THEN '🔄'
      WHEN 'REJECTED' THEN '❌'
      WHEN 'COMPLETED' THEN '🏁'
      WHEN 'CANCELLED' THEN '🚫'
    END,
    -- Tracking Status Display (unchanged)
    CASE track_status
      WHEN 'PENDING_PICKUP' THEN 'Pending Pickup'
      WHEN 'IN_TRANSIT' THEN 'In Transit'
      WHEN 'IN_TRANSIT_REJECTED' THEN 'Returning'
      WHEN 'DELIVERED' THEN 'Delivered'
      WHEN 'RECEIVED' THEN 'Received'
      WHEN 'AWAITING_APPROVAL' THEN 'Awaiting Approval'
      WHEN 'READY_FOR_NEXT_STEP' THEN 'Ready for Next Step'
      WHEN 'HAND_TO_HAND_PENDING' THEN 'Hand-to-Hand Pending'
      WHEN 'FINAL_APPROVAL_PENDING' THEN 'Final Approval Pending'
    END,
    CASE track_status
      WHEN 'PENDING_PICKUP' THEN 'bg-yellow-500'
      WHEN 'IN_TRANSIT' THEN 'bg-blue-500'
      WHEN 'IN_TRANSIT_REJECTED' THEN 'bg-red-500'
      WHEN 'DELIVERED' THEN 'bg-green-500'
      WHEN 'RECEIVED' THEN 'bg-emerald-500'
      WHEN 'AWAITING_APPROVAL' THEN 'bg-orange-500'
      WHEN 'READY_FOR_NEXT_STEP' THEN 'bg-indigo-500'
      WHEN 'HAND_TO_HAND_PENDING' THEN 'bg-purple-500'
      WHEN 'FINAL_APPROVAL_PENDING' THEN 'bg-teal-500'
    END,
    CASE track_status
      WHEN 'PENDING_PICKUP' THEN '📦'
      WHEN 'IN_TRANSIT' THEN '🚚'
      WHEN 'IN_TRANSIT_REJECTED' THEN '↩️'
      WHEN 'DELIVERED' THEN '📍'
      WHEN 'RECEIVED' THEN '✅'
      WHEN 'AWAITING_APPROVAL' THEN '⏳'
      WHEN 'READY_FOR_NEXT_STEP' THEN '➡️'
      WHEN 'HAND_TO_HAND_PENDING' THEN '🤝'
      WHEN 'FINAL_APPROVAL_PENDING' THEN '🏆'
    END;
END;
$$ LANGUAGE plpgsql;

-- Show completion message
DO $$
BEGIN
  RAISE NOTICE 'Document Status update completed successfully!';
  RAISE NOTICE 'Document Status now has only 4 values: ACTIVE, REJECTED, COMPLETED, CANCELLED';
  RAISE NOTICE 'All DRAFT and APPROVED statuses have been converted to ACTIVE';
END $$; 