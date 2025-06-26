-- Fix existing documents that should have NEW status
-- Set their dual status to NULL to show as blank

-- First commit any active transaction
COMMIT;

-- Update existing documents created recently that might have wrong status
-- This will set their dual status to NULL so they show as blank
UPDATE documents 
SET 
    status = 'NEW',
    document_status = NULL,
    tracking_status = NULL
WHERE 
    status = 'Ready for Pick-up (Drop Off)' 
    AND created_at > NOW() - INTERVAL '1 hour'  -- Only recent documents
    AND action_history::text LIKE '%Document workflow initiated%';  -- Only documents that were just created

-- Show the updated documents
SELECT 
    id,
    title,
    status,
    document_status,
    tracking_status,
    created_at
FROM documents 
WHERE status = 'NEW'
ORDER BY created_at DESC;

COMMIT; 