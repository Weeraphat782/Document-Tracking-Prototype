-- Add NEW to document_status_new enum for dual status system
-- This allows documents to show "New" status instead of undefined

-- STEP 1: Add NEW to enum (must be done in separate transaction)
-- First commit any active transaction
COMMIT;

-- Add NEW to document_status_new enum if it doesn't exist
DO $$
BEGIN
    -- Check if NEW status exists in document_status_new enum
    IF NOT EXISTS (
        SELECT 1 FROM unnest(enum_range(NULL::document_status_new)) AS status 
        WHERE status::text = 'NEW'
    ) THEN
        -- Add NEW to document_status_new enum
        ALTER TYPE document_status_new ADD VALUE 'NEW';
        RAISE NOTICE 'Added NEW status to document_status_new enum';
    ELSE
        RAISE NOTICE 'NEW status already exists in document_status_new enum';
    END IF;
END $$;

-- COMMIT the enum addition before using it
COMMIT;

-- STEP 2: Update existing documents (in new transaction)
-- Update existing NEW documents to have proper dual status
UPDATE documents 
SET 
    document_status = 'NEW',
    tracking_status = NULL
WHERE 
    status = 'NEW'
    AND (document_status IS NULL OR document_status != 'NEW');

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

-- Verify the enum values
SELECT 'Current document_status_new enum values:' as info;
SELECT unnest(enum_range(NULL::document_status_new)) AS status_values;

COMMIT; 