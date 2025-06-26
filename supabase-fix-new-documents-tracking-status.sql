-- Fix NEW documents to have NULL tracking_status
-- This ensures NEW documents show "Not Set" for tracking status

BEGIN;

-- Update existing NEW documents to have NULL tracking_status
UPDATE documents 
SET tracking_status = NULL
WHERE status = 'NEW' OR document_status = 'NEW';

-- Also ensure document_status is set to 'NEW' for documents with status = 'NEW'
UPDATE documents 
SET document_status = 'NEW'
WHERE status = 'NEW';

COMMIT;

-- Verify the changes
SELECT id, title, status, document_status, tracking_status 
FROM documents 
WHERE status = 'NEW' OR document_status = 'NEW'
ORDER BY created_at DESC; 