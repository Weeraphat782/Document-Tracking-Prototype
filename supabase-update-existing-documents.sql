-- Update existing documents to show NEW status correctly
-- Fix documents that should show as NEW with proper dual status

COMMIT;

-- First, let's see what we have
SELECT 
    id,
    title,
    status,
    document_status,
    tracking_status,
    created_at
FROM documents 
WHERE status = 'NEW' OR document_status = 'ACTIVE'
ORDER BY created_at DESC;

-- Update documents that have status='NEW' but wrong dual status
UPDATE documents 
SET 
    document_status = 'NEW',
    tracking_status = NULL
WHERE 
    status = 'NEW';

-- Also update any documents created recently that might have been created with old logic
UPDATE documents 
SET 
    status = 'NEW',
    document_status = 'NEW',
    tracking_status = NULL
WHERE 
    status = 'Ready for Pick-up (Drop Off)'
    AND created_at > NOW() - INTERVAL '2 hours'
    AND action_history::text LIKE '%Document workflow initiated%';

-- Show the results
SELECT 
    'Updated documents:' as info,
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