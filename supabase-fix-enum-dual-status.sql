-- Fix ENUM types and implement Dual Status System
-- This script handles existing enum constraints properly

-- Step 1: Check if enum types exist and get their values
DO $$
BEGIN
    -- Check if tracking_status enum exists
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tracking_status') THEN
        RAISE NOTICE 'tracking_status enum exists, will update it';
    ELSE
        RAISE NOTICE 'tracking_status enum does not exist, will create new columns';
    END IF;
END $$;

-- Step 2: Drop existing enum constraints if they exist
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_tracking_status_check;
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_document_status_check;

-- Step 3: Temporarily change columns to TEXT to avoid enum issues
ALTER TABLE documents ALTER COLUMN tracking_status TYPE TEXT;
ALTER TABLE documents ALTER COLUMN document_status TYPE TEXT;

-- Step 4: Add new columns if they don't exist (using TEXT type)
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS document_status_new TEXT NULL,
ADD COLUMN IF NOT EXISTS tracking_status_new TEXT NULL;

-- Step 5: Update existing documents with new dual status values
-- Handle all possible legacy status values

-- NEW documents
UPDATE documents SET 
  document_status_new = NULL,
  tracking_status_new = 'NEW'
WHERE status = 'NEW';

-- Ready for pickup
UPDATE documents SET 
  document_status_new = NULL,
  tracking_status_new = 'READY_FOR_PICKUP'
WHERE status = 'Ready for Pick-up (Drop Off)';

-- In transit
UPDATE documents SET 
  document_status_new = NULL,
  tracking_status_new = 'PICKED_UP'
WHERE status = 'In Transit (Mail Controller)';

-- Rejected in transit
UPDATE documents SET 
  document_status_new = 'REJECTED',
  tracking_status_new = 'PICKED_UP'
WHERE status = 'In Transit - Rejected Document';

-- Delivered statuses
UPDATE documents SET 
  document_status_new = NULL,
  tracking_status_new = 'DELIVERED'
WHERE status IN (
  'Delivered (Drop Off)', 
  'Delivered (User)', 
  'Delivered (Hand to Hand)'
);

-- Received (pending approval)
UPDATE documents SET 
  document_status_new = 'PENDING',
  tracking_status_new = 'RECEIVED'
WHERE status = 'Received (User)';

-- Approved and ready for next step
UPDATE documents SET 
  document_status_new = 'ACCEPTED',
  tracking_status_new = 'READY_FOR_PICKUP'
WHERE status = 'Approved by Approver. Pending pickup for next step';

-- Approval complete, ready for return
UPDATE documents SET 
  document_status_new = NULL,
  tracking_status_new = 'READY_FOR_PICKUP'
WHERE status = 'Approval Complete. Pending return to Originator';

-- Completed documents
UPDATE documents SET 
  document_status_new = NULL,
  tracking_status_new = 'COMPLETED'
WHERE status IN (
  'COMPLETED ROUTE', 
  'Final Approval - Hand to Hand', 
  'Final Approval - Delivered to Originator',
  'Closed'
);

-- Cancelled or rejected routes
UPDATE documents SET 
  document_status_new = NULL,
  tracking_status_new = 'REJECTED'
WHERE status IN ('CANCELLED ROUTE', 'REJECTED ROUTE');

-- Rejected documents ready for pickup
UPDATE documents SET 
  document_status_new = 'REJECTED',
  tracking_status_new = 'READY_FOR_PICKUP'
WHERE status IN (
  'REJECTED - Ready for Pickup', 
  'REJECTED - Hand to Hand'
);

-- Rejected documents returned
UPDATE documents SET 
  document_status_new = 'REJECTED',
  tracking_status_new = 'REJECTED'
WHERE status = 'REJECTED - Returned to Originator';

-- Step 6: Drop old columns and rename new ones
ALTER TABLE documents DROP COLUMN IF EXISTS document_status;
ALTER TABLE documents DROP COLUMN IF EXISTS tracking_status;

ALTER TABLE documents RENAME COLUMN document_status_new TO document_status;
ALTER TABLE documents RENAME COLUMN tracking_status_new TO tracking_status;

-- Step 7: Add proper constraints (using CHECK instead of ENUM)
ALTER TABLE documents 
ADD CONSTRAINT documents_document_status_check 
CHECK (document_status IS NULL OR document_status IN ('PENDING', 'ACCEPTED', 'REJECTED'));

ALTER TABLE documents 
ADD CONSTRAINT documents_tracking_status_check 
CHECK (tracking_status IN ('NEW', 'READY_FOR_PICKUP', 'PICKED_UP', 'DELIVERED', 'RECEIVED', 'COMPLETED', 'REJECTED'));

-- Step 8: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_documents_document_status ON documents(document_status);
CREATE INDEX IF NOT EXISTS idx_documents_tracking_status ON documents(tracking_status);
CREATE INDEX IF NOT EXISTS idx_documents_dual_status ON documents(document_status, tracking_status);

-- Step 9: Add column comments
COMMENT ON COLUMN documents.document_status IS 'Approval/business state: NULL (–), PENDING, ACCEPTED, REJECTED';
COMMENT ON COLUMN documents.tracking_status IS 'Physical/logistical state: NEW, READY_FOR_PICKUP, PICKED_UP, DELIVERED, RECEIVED, COMPLETED, REJECTED';

-- Step 10: Display results
SELECT 
  'Migration Results' as description,
  status as legacy_status,
  document_status,
  tracking_status,
  COUNT(*) as count
FROM documents 
GROUP BY status, document_status, tracking_status
ORDER BY status;

-- Success message
SELECT 'Dual Status System migration completed successfully!' as status; 