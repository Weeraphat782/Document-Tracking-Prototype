-- Final comprehensive fix for NEW status
-- This will add all missing enum values and fix documents

-- Step 1: Add NEW to document_status_new enum
COMMIT;

-- Check current document_status_new values
SELECT 'Before adding NEW to document_status_new:' as info;
SELECT unnest(enum_range(NULL::document_status_new)) AS current_values;

-- Add NEW to document_status_new enum
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM unnest(enum_range(NULL::document_status_new)) AS status 
        WHERE status::text = 'NEW'
    ) THEN
        ALTER TYPE document_status_new ADD VALUE 'NEW';
        RAISE NOTICE 'Added NEW to document_status_new enum';
    ELSE
        RAISE NOTICE 'NEW already exists in document_status_new enum';
    END IF;
END $$;

COMMIT;

-- Step 2: Check if we need to modify tracking_status to allow NULL
-- Show current tracking_status values
SELECT 'Current tracking_status enum values:' as info;
SELECT unnest(enum_range(NULL::tracking_status)) AS tracking_status_values;

-- Step 3: Update all documents that should have NEW status
-- First show what we're going to update
SELECT 'Documents that will be updated to NEW status:' as info;
SELECT 
    id,
    title,
    status,
    document_status,
    tracking_status,
    created_at
FROM documents 
WHERE 
    (status = 'Ready for Pick-up (Drop Off)' OR status = 'NEW')
    AND created_at > NOW() - INTERVAL '6 hours';

-- Now update them
UPDATE documents 
SET 
    status = 'NEW',
    document_status = 'NEW',
    tracking_status = NULL
WHERE 
    (status = 'Ready for Pick-up (Drop Off)' OR status = 'NEW')
    AND created_at > NOW() - INTERVAL '6 hours';

-- Step 4: Show the final results
SELECT 'Documents with NEW status after update:' as info;
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

-- Step 5: Show all enum values to confirm
SELECT 'Final document_status_new enum values:' as info;
SELECT unnest(enum_range(NULL::document_status_new)) AS status_values;

COMMIT; 