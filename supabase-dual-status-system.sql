-- Migration script for Dual Status System
-- Document Flow: Document Status (approval state) + Tracking Status (physical state)

-- Add dual status columns to documents table
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS document_status TEXT NULL CHECK (document_status IN (NULL, 'PENDING', 'ACCEPTED', 'REJECTED')),
ADD COLUMN IF NOT EXISTS tracking_status TEXT NULL CHECK (tracking_status IN ('NEW', 'READY_FOR_PICKUP', 'PICKED_UP', 'DELIVERED', 'RECEIVED', 'COMPLETED', 'REJECTED'));

-- Create comment to explain the dual status system
COMMENT ON COLUMN documents.document_status IS 'Approval/business state: NULL (–), PENDING, ACCEPTED, REJECTED';
COMMENT ON COLUMN documents.tracking_status IS 'Physical/logistical state: NEW, READY_FOR_PICKUP, PICKED_UP, DELIVERED, RECEIVED, COMPLETED, REJECTED';

-- Update existing documents to have proper dual status based on legacy status
UPDATE documents SET 
  document_status = NULL,
  tracking_status = 'NEW'
WHERE status = 'NEW';

UPDATE documents SET 
  document_status = NULL,
  tracking_status = 'READY_FOR_PICKUP'
WHERE status = 'Ready for Pick-up (Drop Off)';

UPDATE documents SET 
  document_status = NULL,
  tracking_status = 'PICKED_UP'
WHERE status = 'In Transit (Mail Controller)';

UPDATE documents SET 
  document_status = 'REJECTED',
  tracking_status = 'PICKED_UP'
WHERE status = 'In Transit - Rejected Document';

UPDATE documents SET 
  document_status = NULL,
  tracking_status = 'DELIVERED'
WHERE status IN ('Delivered (Drop Off)', 'Delivered (User)', 'Delivered (Hand to Hand)');

UPDATE documents SET 
  document_status = 'PENDING',
  tracking_status = 'RECEIVED'
WHERE status = 'Received (User)';

UPDATE documents SET 
  document_status = 'ACCEPTED',
  tracking_status = 'READY_FOR_PICKUP'
WHERE status = 'Approved by Approver. Pending pickup for next step';

UPDATE documents SET 
  document_status = NULL,
  tracking_status = 'READY_FOR_PICKUP'
WHERE status = 'Approval Complete. Pending return to Originator';

UPDATE documents SET 
  document_status = NULL,
  tracking_status = 'COMPLETED'
WHERE status IN ('COMPLETED ROUTE', 'Final Approval - Hand to Hand', 'Final Approval - Delivered to Originator', 'Closed');

UPDATE documents SET 
  document_status = NULL,
  tracking_status = 'REJECTED'
WHERE status IN ('CANCELLED ROUTE', 'REJECTED ROUTE');

UPDATE documents SET 
  document_status = 'REJECTED',
  tracking_status = 'READY_FOR_PICKUP'
WHERE status IN ('REJECTED - Ready for Pickup', 'REJECTED - Hand to Hand');

UPDATE documents SET 
  document_status = 'REJECTED',
  tracking_status = 'REJECTED'
WHERE status = 'REJECTED - Returned to Originator';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_documents_document_status ON documents(document_status);
CREATE INDEX IF NOT EXISTS idx_documents_tracking_status ON documents(tracking_status);
CREATE INDEX IF NOT EXISTS idx_documents_dual_status ON documents(document_status, tracking_status);

-- Display current status counts
SELECT 
  'Status Migration Results' as description,
  status as legacy_status,
  document_status,
  tracking_status,
  COUNT(*) as count
FROM documents 
GROUP BY status, document_status, tracking_status
ORDER BY status; 