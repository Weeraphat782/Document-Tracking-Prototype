-- Migration script to add CANCELLED_ROUTE and COMPLETED_ROUTE tracking statuses
-- Run this script to add the new tracking statuses for cancelled and completed documents

-- Step 1: Add CANCELLED_ROUTE and COMPLETED_ROUTE to tracking_status enum
DO $$
BEGIN
    -- Check if tracking_status enum exists and add new values if not present
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tracking_status') THEN
        -- Add CANCELLED_ROUTE to the enum if it doesn't already exist
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'CANCELLED_ROUTE' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'tracking_status')) THEN
            ALTER TYPE tracking_status ADD VALUE 'CANCELLED_ROUTE';
            RAISE NOTICE 'Added CANCELLED_ROUTE to tracking_status enum';
        ELSE
            RAISE NOTICE 'CANCELLED_ROUTE already exists in tracking_status enum';
        END IF;
        
        -- Add COMPLETED_ROUTE to the enum if it doesn't already exist
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'COMPLETED_ROUTE' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'tracking_status')) THEN
            ALTER TYPE tracking_status ADD VALUE 'COMPLETED_ROUTE';
            RAISE NOTICE 'Added COMPLETED_ROUTE to tracking_status enum';
        ELSE
            RAISE NOTICE 'COMPLETED_ROUTE already exists in tracking_status enum';
        END IF;
    ELSE
        RAISE NOTICE 'tracking_status enum does not exist - will be created by main migration';
    END IF;
END $$;

-- Step 2: Update existing documents to use new tracking statuses
UPDATE documents SET 
  tracking_status = 'CANCELLED_ROUTE'
WHERE status = 'CANCELLED ROUTE' AND tracking_status = 'RECEIVED';

UPDATE documents SET 
  tracking_status = 'COMPLETED_ROUTE'
WHERE status = 'COMPLETED ROUTE' AND tracking_status = 'RECEIVED';

-- Step 3: Update dual status display function to include CANCELLED_ROUTE
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
    -- Document Status Display
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
         -- Tracking Status Display
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
       WHEN 'REJECTED_RETURNED' THEN 'Rejected - Returned to Originator'
       WHEN 'CANCELLED_ROUTE' THEN 'Cancelled Route'
       WHEN 'COMPLETED_ROUTE' THEN 'Completed Route'
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
       WHEN 'REJECTED_RETURNED' THEN 'bg-red-600'
       WHEN 'CANCELLED_ROUTE' THEN 'bg-gray-600'
       WHEN 'COMPLETED_ROUTE' THEN 'bg-emerald-600'
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
       WHEN 'REJECTED_RETURNED' THEN '🔙'
       WHEN 'CANCELLED_ROUTE' THEN '🚫'
       WHEN 'COMPLETED_ROUTE' THEN '🏁'
     END;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Update tracking status display function
CREATE OR REPLACE FUNCTION get_tracking_status_display(status tracking_status)
RETURNS TABLE(text TEXT, color TEXT, icon TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        CASE status
            WHEN 'PENDING_PICKUP' THEN 'Pending Pickup'
            WHEN 'IN_TRANSIT' THEN 'In Transit'
            WHEN 'IN_TRANSIT_REJECTED' THEN 'Returning to Originator'
            WHEN 'DELIVERED' THEN 'Delivered'
            WHEN 'RECEIVED' THEN 'Received'
            WHEN 'AWAITING_APPROVAL' THEN 'Awaiting Approval'
            WHEN 'READY_FOR_NEXT_STEP' THEN 'Ready for Next Step'
            WHEN 'HAND_TO_HAND_PENDING' THEN 'Hand-to-Hand Pending'
                         WHEN 'FINAL_APPROVAL_PENDING' THEN 'Final Approval Pending'
             WHEN 'REJECTED_RETURNED' THEN 'Rejected - Returned to Originator'
             WHEN 'CANCELLED_ROUTE' THEN 'Cancelled Route'
             WHEN 'COMPLETED_ROUTE' THEN 'Completed Route'
             ELSE status::TEXT
         END as text,
         CASE status
             WHEN 'PENDING_PICKUP' THEN 'bg-yellow-500'
             WHEN 'IN_TRANSIT' THEN 'bg-blue-500'
             WHEN 'IN_TRANSIT_REJECTED' THEN 'bg-red-500'
             WHEN 'DELIVERED' THEN 'bg-green-500'
             WHEN 'RECEIVED' THEN 'bg-emerald-500'
             WHEN 'AWAITING_APPROVAL' THEN 'bg-orange-500'
             WHEN 'READY_FOR_NEXT_STEP' THEN 'bg-indigo-500'
             WHEN 'HAND_TO_HAND_PENDING' THEN 'bg-purple-500'
             WHEN 'FINAL_APPROVAL_PENDING' THEN 'bg-teal-500'
             WHEN 'REJECTED_RETURNED' THEN 'bg-red-600'
             WHEN 'CANCELLED_ROUTE' THEN 'bg-gray-600'
             WHEN 'COMPLETED_ROUTE' THEN 'bg-emerald-600'
             ELSE 'bg-gray-500'
         END as color,
         CASE status
             WHEN 'PENDING_PICKUP' THEN '📦'
             WHEN 'IN_TRANSIT' THEN '🚚'
             WHEN 'IN_TRANSIT_REJECTED' THEN '↩️'
             WHEN 'DELIVERED' THEN '📍'
             WHEN 'RECEIVED' THEN '✅'
             WHEN 'AWAITING_APPROVAL' THEN '⏳'
             WHEN 'READY_FOR_NEXT_STEP' THEN '➡️'
             WHEN 'HAND_TO_HAND_PENDING' THEN '🤝'
             WHEN 'FINAL_APPROVAL_PENDING' THEN '🏆'
             WHEN 'REJECTED_RETURNED' THEN '🔙'
             WHEN 'CANCELLED_ROUTE' THEN '🚫'
             WHEN 'COMPLETED_ROUTE' THEN '🏁'
             ELSE '📄'
         END as icon;
END;
$$ LANGUAGE plpgsql;

-- Show completion message
DO $$
BEGIN
  RAISE NOTICE 'CANCELLED_ROUTE and COMPLETED_ROUTE tracking status migration completed!';
  RAISE NOTICE 'Updated documents with CANCELLED ROUTE status to use CANCELLED_ROUTE tracking status';
  RAISE NOTICE 'Updated documents with COMPLETED ROUTE status to use COMPLETED_ROUTE tracking status';
  RAISE NOTICE 'Updated display functions to include new tracking statuses';
END $$; 