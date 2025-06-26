-- Migration script to add Dual Status System to existing Document Tracking Database
-- Run this SQL in your Supabase SQL Editor AFTER the main schema

-- Create new enums for dual status system
CREATE TYPE document_status_new AS ENUM (
  'ACTIVE', 
  'REJECTED',
  'COMPLETED',
  'CANCELLED'
);

CREATE TYPE tracking_status AS ENUM (
  'PENDING_PICKUP',
  'IN_TRANSIT',
  'IN_TRANSIT_REJECTED',
  'DELIVERED',
  'RECEIVED',
  'AWAITING_APPROVAL',
  'READY_FOR_NEXT_STEP',
  'HAND_TO_HAND_PENDING',
  'FINAL_APPROVAL_PENDING'
);

-- Add new columns to documents table
ALTER TABLE documents 
ADD COLUMN document_status document_status_new,
ADD COLUMN tracking_status tracking_status;

-- Create indexes for new status columns
CREATE INDEX idx_documents_document_status ON documents(document_status);
CREATE INDEX idx_documents_tracking_status ON documents(tracking_status);
CREATE INDEX idx_documents_dual_status ON documents(document_status, tracking_status);

-- Update existing documents with dual status based on legacy status
-- This mapping converts all existing documents to the new dual status system

UPDATE documents SET 
  document_status = 'ACTIVE',
  tracking_status = 'PENDING_PICKUP'
WHERE status = 'NEW';

UPDATE documents SET 
  document_status = 'ACTIVE',
  tracking_status = 'PENDING_PICKUP'
WHERE status = 'Ready for Pick-up (Drop Off)';

UPDATE documents SET 
  document_status = 'ACTIVE',
  tracking_status = 'IN_TRANSIT'
WHERE status = 'In Transit (Mail Controller)';

UPDATE documents SET 
  document_status = 'REJECTED',
  tracking_status = 'IN_TRANSIT_REJECTED'
WHERE status = 'In Transit - Rejected Document';

UPDATE documents SET 
  document_status = 'ACTIVE',
  tracking_status = 'DELIVERED'
WHERE status = 'Delivered (Drop Off)';

UPDATE documents SET 
  document_status = 'ACTIVE',
  tracking_status = 'DELIVERED'
WHERE status = 'Delivered (User)';

UPDATE documents SET 
  document_status = 'ACTIVE',
  tracking_status = 'HAND_TO_HAND_PENDING'
WHERE status = 'Delivered (Hand to Hand)';

UPDATE documents SET 
  document_status = 'ACTIVE',
  tracking_status = 'FINAL_APPROVAL_PENDING'
WHERE status = 'Final Approval - Hand to Hand';

UPDATE documents SET 
  document_status = 'ACTIVE',
  tracking_status = 'RECEIVED'
WHERE status = 'Received (User)';

UPDATE documents SET 
  document_status = 'ACTIVE',
  tracking_status = 'PENDING_PICKUP'
WHERE status = 'Approved by Approver. Pending pickup for next step';

UPDATE documents SET 
  document_status = 'ACTIVE',
  tracking_status = 'PENDING_PICKUP'
WHERE status = 'Approval Complete. Pending return to Originator';

UPDATE documents SET 
  document_status = 'COMPLETED',
  tracking_status = 'RECEIVED'
WHERE status = 'COMPLETED ROUTE';

UPDATE documents SET 
  document_status = 'CANCELLED',
  tracking_status = 'RECEIVED'
WHERE status = 'CANCELLED ROUTE';

UPDATE documents SET 
  document_status = 'REJECTED',
  tracking_status = 'RECEIVED'
WHERE status = 'REJECTED ROUTE';

UPDATE documents SET 
  document_status = 'REJECTED',
  tracking_status = 'PENDING_PICKUP'
WHERE status = 'REJECTED - Ready for Pickup';

UPDATE documents SET 
  document_status = 'REJECTED',
  tracking_status = 'HAND_TO_HAND_PENDING'
WHERE status = 'REJECTED - Hand to Hand';

UPDATE documents SET 
  document_status = 'COMPLETED',
  tracking_status = 'RECEIVED'
WHERE status = 'Closed';

-- Create function to get dual status display
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

-- Update the get_documents_by_role function to include dual status
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

-- Add comment to track migration
COMMENT ON TABLE documents IS 'Updated with dual status system - document_status and tracking_status columns added';

-- Show migration completion message
DO $$
BEGIN
  RAISE NOTICE 'Dual Status System migration completed successfully!';
  RAISE NOTICE 'New columns added: document_status, tracking_status';
  RAISE NOTICE 'All existing documents have been migrated to dual status system';
  RAISE NOTICE 'New functions available: get_dual_status_display(), get_documents_by_role_dual()';
END $$; 