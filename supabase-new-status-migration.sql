-- Migration to handle NEW status in document_status enum
-- NEW status already exists, so we just need to verify and handle any data updates

-- First commit any active transaction
COMMIT;

-- Verify NEW status exists in the enum
DO $$
BEGIN
    -- Check if NEW status exists
    IF NOT EXISTS (
        SELECT 1 FROM unnest(enum_range(NULL::document_status)) AS status 
        WHERE status::text = 'NEW'
    ) THEN
        -- Add NEW to document_status enum if it doesn't exist
        ALTER TYPE document_status ADD VALUE 'NEW';
        RAISE NOTICE 'Added NEW status to document_status enum';
    ELSE
        RAISE NOTICE 'NEW status already exists in document_status enum';
    END IF;
END $$;

-- Update any existing documents that should have NEW status
-- (This is optional - typically no existing documents would need this)
-- UPDATE documents 
-- SET status = 'NEW', document_status = NULL, tracking_status = NULL 
-- WHERE status = 'Ready for Pick-up (Drop Off)' AND created_at > NOW() - INTERVAL '1 hour';

-- Verify the enum values
SELECT 'Current document_status enum values:' as info;
SELECT unnest(enum_range(NULL::document_status)) AS status_values;

COMMIT; 