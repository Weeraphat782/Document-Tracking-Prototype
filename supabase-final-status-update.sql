-- Final Status Update Migration Script
-- This script adds all new tracking statuses and document statuses to support:
-- 1. CANCELLED_ROUTE tracking status
-- 2. COMPLETED_ROUTE tracking status  
-- 3. "Final Approval - Delivered to Originator" document status
-- Run this script in Supabase SQL Editor

-- Step 1: Add new enum values (must be done first and committed)
DO $$
BEGIN
    -- Add CANCELLED_ROUTE to tracking_status enum if not exists
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tracking_status') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'CANCELLED_ROUTE' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'tracking_status')) THEN
            ALTER TYPE tracking_status ADD VALUE 'CANCELLED_ROUTE';
            RAISE NOTICE 'Added CANCELLED_ROUTE to tracking_status enum';
        ELSE
            RAISE NOTICE 'CANCELLED_ROUTE already exists in tracking_status enum';
        END IF;
    END IF;

    -- Add COMPLETED_ROUTE to tracking_status enum if not exists
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tracking_status') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'COMPLETED_ROUTE' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'tracking_status')) THEN
            ALTER TYPE tracking_status ADD VALUE 'COMPLETED_ROUTE';
            RAISE NOTICE 'Added COMPLETED_ROUTE to tracking_status enum';
        ELSE
            RAISE NOTICE 'COMPLETED_ROUTE already exists in tracking_status enum';
        END IF;
    END IF;

    -- Add "Final Approval - Delivered to Originator" to document_status enum if not exists
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'document_status') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'Final Approval - Delivered to Originator' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'document_status')) THEN
            ALTER TYPE document_status ADD VALUE 'Final Approval - Delivered to Originator';
            RAISE NOTICE 'Added "Final Approval - Delivered to Originator" to document_status enum';
        ELSE
            RAISE NOTICE '"Final Approval - Delivered to Originator" already exists in document_status enum';
        END IF;
    END IF;
END $$;

-- Step 2: Update existing documents with correct dual status mappings
-- (Run this after Step 1 is committed)

-- Update documents with CANCELLED ROUTE status to use CANCELLED_ROUTE tracking status
UPDATE documents 
SET tracking_status = 'CANCELLED_ROUTE'
WHERE status = 'CANCELLED ROUTE' AND tracking_status != 'CANCELLED_ROUTE';

-- Update documents with COMPLETED ROUTE status to use COMPLETED_ROUTE tracking status  
UPDATE documents 
SET tracking_status = 'COMPLETED_ROUTE'
WHERE status = 'COMPLETED ROUTE' AND tracking_status != 'COMPLETED_ROUTE';

-- Step 3: Update/Create display functions for new statuses

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS get_dual_status_display(text, text);
DROP FUNCTION IF EXISTS get_tracking_status_display(text);
DROP FUNCTION IF EXISTS get_document_status_display(text);

-- Create function to get dual status display
CREATE OR REPLACE FUNCTION get_dual_status_display(doc_status text, track_status text)
RETURNS TABLE(
  document_text text,
  document_color text,
  document_icon text,
  tracking_text text,
  tracking_color text,
  tracking_icon text
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
       ELSE doc_status::TEXT
     END as document_text,
     CASE doc_status
       WHEN 'ACTIVE' THEN 'bg-blue-500'
       WHEN 'REJECTED' THEN 'bg-red-500'
       WHEN 'COMPLETED' THEN 'bg-emerald-500'
       WHEN 'CANCELLED' THEN 'bg-gray-600'
       ELSE 'bg-gray-500'
     END as document_color,
     CASE doc_status
       WHEN 'ACTIVE' THEN '🔄'
       WHEN 'REJECTED' THEN '❌'
       WHEN 'COMPLETED' THEN '🏁'
       WHEN 'CANCELLED' THEN '🚫'
       ELSE '📄'
     END as document_icon,
     -- Tracking Status Display
     CASE track_status
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
       ELSE track_status::TEXT
     END as tracking_text,
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
       ELSE 'bg-gray-500'
     END as tracking_color,
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
       ELSE '📄'
     END as tracking_icon;
END;
$$ LANGUAGE plpgsql;

-- Create function to get tracking status display only
CREATE OR REPLACE FUNCTION get_tracking_status_display(status text)
RETURNS TABLE(text text, color text, icon text) AS $$
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
    END,
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
    END,
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
    END;
END;
$$ LANGUAGE plpgsql;

-- Create function to get document status display only
CREATE OR REPLACE FUNCTION get_document_status_display(status text)
RETURNS TABLE(text text, color text, icon text) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE status
      WHEN 'ACTIVE' THEN 'Active'
      WHEN 'REJECTED' THEN 'Rejected'
      WHEN 'COMPLETED' THEN 'Completed'
      WHEN 'CANCELLED' THEN 'Cancelled'
      ELSE status::TEXT
    END,
    CASE status
      WHEN 'ACTIVE' THEN 'bg-blue-500'
      WHEN 'REJECTED' THEN 'bg-red-500'
      WHEN 'COMPLETED' THEN 'bg-emerald-500'
      WHEN 'CANCELLED' THEN 'bg-gray-600'
      ELSE 'bg-gray-500'
    END,
    CASE status
      WHEN 'ACTIVE' THEN '🔄'
      WHEN 'REJECTED' THEN '❌'
      WHEN 'COMPLETED' THEN '🏁'
      WHEN 'CANCELLED' THEN '🚫'
      ELSE '📄'
    END;
END;
$$ LANGUAGE plpgsql;

-- Show completion message
DO $$
BEGIN
  RAISE NOTICE '=== MIGRATION COMPLETED SUCCESSFULLY ===';
  RAISE NOTICE 'Added new tracking statuses: CANCELLED_ROUTE, COMPLETED_ROUTE';
  RAISE NOTICE 'Added new document status: "Final Approval - Delivered to Originator"';
  RAISE NOTICE 'Updated existing documents with correct dual status mappings';
  RAISE NOTICE 'Created/Updated display functions for new statuses';
  RAISE NOTICE 'Your database is now ready for the updated Document Tracking System!';
END $$; 