-- Complete fix for NEW status in database
-- This will fix all issues with NEW documents showing correctly

-- Step 1: Add NEW to document_status_new enum
COMMIT;

DO $$
BEGIN
    -- Add NEW to document_status_new enum if it doesn't exist
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

-- Step 2: Fix all existing documents that should be NEW
-- Update documents that were created recently and should be NEW
UPDATE documents 
SET 
    status = 'NEW',
    document_status = 'NEW',
    tracking_status = NULL
WHERE 
    (status = 'Ready for Pick-up (Drop Off)' OR status = 'NEW')
    AND created_at > NOW() - INTERVAL '4 hours';

-- Step 3: Verify the changes
SELECT 
    'Fixed documents with NEW status:' as info;

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

-- Step 4: Show all enum values to confirm
SELECT 'document_status enum values:' as info;
SELECT unnest(enum_range(NULL::document_status)) AS status_values;

SELECT 'document_status_new enum values:' as info;
SELECT unnest(enum_range(NULL::document_status_new)) AS status_values;

SELECT 'tracking_status enum values:' as info;
SELECT unnest(enum_range(NULL::tracking_status)) AS status_values;

COMMIT; 