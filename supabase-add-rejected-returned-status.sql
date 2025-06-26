-- Migration: Add REJECTED - Returned to Originator status
-- Description: Add new status for rejected documents that have been returned to originator

-- 1. Add new status to document_status enum
ALTER TYPE document_status ADD VALUE IF NOT EXISTS 'REJECTED - Returned to Originator';

-- 2. Add new tracking status to tracking_status enum (if it exists)
DO $$ 
BEGIN
    -- Check if tracking_status enum exists and add new value
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tracking_status') THEN
        ALTER TYPE tracking_status ADD VALUE IF NOT EXISTS 'REJECTED_RETURNED';
    END IF;
END $$;

-- 3. Update any existing documents with old rejected delivery status
-- (This is for data migration - convert any existing "Delivered (Drop Off)" with rejection context)
-- Note: This is a safety update, actual logic should handle this in application

-- 4. Add comment for documentation
COMMENT ON TYPE document_status IS 'Document status enum including REJECTED - Returned to Originator for rejected documents delivered back to creator';

-- 5. If you have any status display functions, they might need updates
-- (Check if get_document_status_display function exists and update it)

DO $$
BEGIN
    -- Update status display function if it exists
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_document_status_display') THEN
        -- Drop and recreate the function with new status
        DROP FUNCTION IF EXISTS get_document_status_display(document_status);
        
        CREATE OR REPLACE FUNCTION get_document_status_display(status document_status)
        RETURNS TABLE(text TEXT, color TEXT, icon TEXT) AS $func$
        BEGIN
            RETURN QUERY
            SELECT 
                CASE status
                    WHEN 'NEW' THEN 'NEW'
                    WHEN 'Ready for Pick-up (Drop Off)' THEN 'Ready for Pick-up (Drop Off)'
                    WHEN 'In Transit (Mail Controller)' THEN 'In Transit (Mail Controller)'
                    WHEN 'In Transit - Rejected Document' THEN 'In Transit - Rejected Document'
                    WHEN 'Delivered (Drop Off)' THEN 'Delivered (Drop Off)'
                    WHEN 'Delivered (User)' THEN 'Delivered (User)'
                    WHEN 'Delivered (Hand to Hand)' THEN 'Delivered (Hand to Hand) - Awaiting Confirmation'
                    WHEN 'Final Approval - Hand to Hand' THEN 'Final Approval - Ready to Close'
                    WHEN 'Received (User)' THEN 'Received (User)'
                    WHEN 'Approved by Approver. Pending pickup for next step' THEN 'Approved - Ready for Drop-off'
                    WHEN 'Approval Complete. Pending return to Originator' THEN 'Approved - Returning'
                    WHEN 'COMPLETED ROUTE' THEN 'COMPLETED ROUTE'
                    WHEN 'CANCELLED ROUTE' THEN 'CANCELLED ROUTE'
                    WHEN 'REJECTED ROUTE' THEN 'REJECTED ROUTE'
                    WHEN 'REJECTED - Ready for Pickup' THEN 'REJECTED - Ready for Pickup'
                    WHEN 'REJECTED - Hand to Hand' THEN 'REJECTED - Hand to Hand - Awaiting Confirmation'
                    WHEN 'REJECTED - Returned to Originator' THEN 'REJECTED - Returned to Originator'
                    WHEN 'Closed' THEN 'Closed'
                    ELSE status::TEXT
                END as text,
                CASE status
                    WHEN 'NEW' THEN 'bg-blue-600 text-white font-semibold'
                    WHEN 'Ready for Pick-up (Drop Off)' THEN 'bg-cyan-600 text-white font-semibold'
                    WHEN 'In Transit (Mail Controller)' THEN 'bg-yellow-600 text-white font-semibold'
                    WHEN 'In Transit - Rejected Document' THEN 'bg-red-500 text-white font-semibold'
                    WHEN 'Delivered (Drop Off)' THEN 'bg-purple-600 text-white font-semibold'
                    WHEN 'Delivered (User)' THEN 'bg-indigo-600 text-white font-semibold'
                    WHEN 'Delivered (Hand to Hand)' THEN 'bg-indigo-500 text-white font-semibold'
                    WHEN 'Final Approval - Hand to Hand' THEN 'bg-green-500 text-white font-semibold'
                    WHEN 'Received (User)' THEN 'bg-orange-600 text-white font-semibold'
                    WHEN 'Approved by Approver. Pending pickup for next step' THEN 'bg-green-600 text-white font-semibold'
                    WHEN 'Approval Complete. Pending return to Originator' THEN 'bg-emerald-600 text-white font-semibold'
                    WHEN 'COMPLETED ROUTE' THEN 'bg-green-700 text-white font-bold'
                    WHEN 'CANCELLED ROUTE' THEN 'bg-red-600 text-white font-bold'
                    WHEN 'REJECTED ROUTE' THEN 'bg-red-700 text-white font-bold'
                    WHEN 'REJECTED - Ready for Pickup' THEN 'bg-red-700 text-white font-bold'
                    WHEN 'REJECTED - Hand to Hand' THEN 'bg-red-600 text-white font-bold'
                    WHEN 'REJECTED - Returned to Originator' THEN 'bg-red-700 text-white font-bold'
                    WHEN 'Closed' THEN 'bg-gray-600 text-white font-semibold'
                    ELSE 'bg-gray-600 text-white font-semibold'
                END as color,
                CASE status
                    WHEN 'NEW' THEN 'file-plus'
                    WHEN 'Ready for Pick-up (Drop Off)' THEN 'package'
                    WHEN 'In Transit (Mail Controller)' THEN 'truck'
                    WHEN 'In Transit - Rejected Document' THEN 'truck-x'
                    WHEN 'Delivered (Drop Off)' THEN 'building'
                    WHEN 'Delivered (User)' THEN 'user-check'
                    WHEN 'Delivered (Hand to Hand)' THEN 'hand'
                    WHEN 'Final Approval - Hand to Hand' THEN 'check-hand'
                    WHEN 'Received (User)' THEN 'clock'
                    WHEN 'Approved by Approver. Pending pickup for next step' THEN 'check'
                    WHEN 'Approval Complete. Pending return to Originator' THEN 'check-double'
                    WHEN 'COMPLETED ROUTE' THEN 'check-circle'
                    WHEN 'CANCELLED ROUTE' THEN 'ban'
                    WHEN 'REJECTED ROUTE' THEN 'x-circle'
                    WHEN 'REJECTED - Ready for Pickup' THEN 'x-circle'
                    WHEN 'REJECTED - Hand to Hand' THEN 'x-hand'
                    WHEN 'REJECTED - Returned to Originator' THEN 'return-rejected'
                    WHEN 'Closed' THEN 'archive'
                    ELSE 'file'
                END as icon;
        END;
        $func$ LANGUAGE plpgsql;
    END IF;
END $$;

-- 6. Create or update tracking status display function if tracking_status enum exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tracking_status') THEN
        -- Drop and recreate tracking status display function
        DROP FUNCTION IF EXISTS get_tracking_status_display(tracking_status);
        
        CREATE OR REPLACE FUNCTION get_tracking_status_display(status tracking_status)
        RETURNS TABLE(text TEXT, color TEXT, icon TEXT) AS $func$
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
                    ELSE '📄'
                END as icon;
        END;
        $func$ LANGUAGE plpgsql;
    END IF;
END $$;

-- 7. Verification queries (run these to check the changes)
-- SELECT unnest(enum_range(NULL::document_status)) as status_values;
-- SELECT unnest(enum_range(NULL::tracking_status)) as tracking_status_values;

COMMIT; 