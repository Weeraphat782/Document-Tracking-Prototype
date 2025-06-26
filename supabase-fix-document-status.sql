-- Fix Document Status enum by handling dependencies properly
-- Run this to update document_status_new to only have 4 values

-- Step 1: Update all existing data first
UPDATE documents SET document_status = 'ACTIVE' 
WHERE document_status = 'DRAFT';

UPDATE documents SET document_status = 'ACTIVE' 
WHERE document_status = 'APPROVED';

-- Step 2: Drop dependent functions first
DROP FUNCTION IF EXISTS get_dual_status_display(document_status_new, tracking_status);
DROP FUNCTION IF EXISTS get_documents_by_role_dual(text, user_role);

-- Step 3: Create new enum with only 4 values
CREATE TYPE document_status_final AS ENUM (
  'ACTIVE', 
  'REJECTED',
  'COMPLETED',
  'CANCELLED'
);

-- Step 4: Update the column to use the new enum
ALTER TABLE documents 
ALTER COLUMN document_status TYPE document_status_final 
USING document_status::text::document_status_final;

-- Step 5: Drop old enum and rename new one
DROP TYPE document_status_new CASCADE;
ALTER TYPE document_status_final RENAME TO document_status_new;

-- Step 6: Recreate the display function with only 4 statuses
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

-- Step 7: Recreate the role-based query function
CREATE OR REPLACE FUNCTION get_documents_by_role_dual(user_email TEXT, user_role user_role)
RETURNS TABLE(
  id TEXT,
  title TEXT,
  type TEXT,
  description TEXT,
  workflow workflow_type,
  status document_status,
  document_status document_status_new,
  tracking_status tracking_status,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  created_by TEXT,
  current_step_index INTEGER,
  recipient TEXT,
  rejection_reason TEXT,
  qr_data JSONB,
  approval_steps JSONB,
  action_history JSONB,
  template_id TEXT,
  approval_mode approval_mode,
  revision_data JSONB
) AS $$
BEGIN
  CASE user_role
    WHEN 'admin' THEN
      RETURN QUERY
      SELECT d.* FROM documents d;
    
    WHEN 'mail' THEN
      RETURN QUERY
      SELECT d.* FROM documents d 
      WHERE d.tracking_status IN (
        'PENDING_PICKUP',
        'IN_TRANSIT',
        'IN_TRANSIT_REJECTED',
        'READY_FOR_NEXT_STEP'
      );
    
    WHEN 'approver' THEN
      RETURN QUERY
      SELECT d.* FROM documents d 
      WHERE (d.workflow = 'flow' 
      AND d.approval_steps IS NOT NULL
      AND jsonb_path_exists(
        d.approval_steps, 
        '$[*] ? (@.approverEmail == $email && @.status == "pending")',
        jsonb_build_object('email', user_email)
      ))
      OR d.tracking_status = 'HAND_TO_HAND_PENDING';
    
    WHEN 'recipient' THEN
      RETURN QUERY
      SELECT d.* FROM documents d 
      WHERE (d.workflow = 'drop' AND d.recipient = user_email)
      OR d.tracking_status = 'DELIVERED';
    
    ELSE
      RETURN;
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- Show completion message
DO $$
BEGIN
  RAISE NOTICE 'Document Status fix completed successfully!';
  RAISE NOTICE 'Document Status enum now has only 4 values: ACTIVE, REJECTED, COMPLETED, CANCELLED';
  RAISE NOTICE 'All DRAFT and APPROVED statuses converted to ACTIVE';
  RAISE NOTICE 'Functions recreated with new enum structure';
END $$; 