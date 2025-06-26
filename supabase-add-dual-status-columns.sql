-- Add dual status columns to documents table
-- This will allow proper storage of NEW document status and NULL tracking status

COMMIT;

-- Step 1: Add document_status column
DO $$
BEGIN
    -- Check if document_status column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'documents' 
        AND column_name = 'document_status'
    ) THEN
        -- Add document_status column
        ALTER TABLE documents 
        ADD COLUMN document_status document_status_new;
        
        RAISE NOTICE 'Added document_status column to documents table';
    ELSE
        RAISE NOTICE 'document_status column already exists';
    END IF;
END $$;

-- Step 2: Add tracking_status column
DO $$
BEGIN
    -- Check if tracking_status column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'documents' 
        AND column_name = 'tracking_status'
    ) THEN
        -- Add tracking_status column (nullable)
        ALTER TABLE documents 
        ADD COLUMN tracking_status tracking_status;
        
        RAISE NOTICE 'Added tracking_status column to documents table';
    ELSE
        RAISE NOTICE 'tracking_status column already exists';
    END IF;
END $$;

COMMIT;

-- Step 3: Update existing documents to have proper dual status
-- Set NEW documents to have NEW document_status and NULL tracking_status
UPDATE documents 
SET 
    document_status = 'NEW'::document_status_new,
    tracking_status = NULL
WHERE 
    status = 'NEW';

-- Set other documents to have proper dual status based on their legacy status
UPDATE documents 
SET 
    document_status = (CASE 
        WHEN status::text LIKE '%COMPLETED%' THEN 'COMPLETED'
        WHEN status::text LIKE '%CANCELLED%' THEN 'CANCELLED'
        WHEN status::text LIKE '%REJECTED%' THEN 'REJECTED'
        ELSE 'ACTIVE'
    END)::document_status_new,
    tracking_status = (CASE 
        WHEN status = 'Ready for Pick-up (Drop Off)' THEN 'PENDING_PICKUP'
        WHEN status = 'In Transit (Mail Controller)' THEN 'IN_TRANSIT'
        WHEN status = 'Delivered (Drop Off)' THEN 'DELIVERED'
        WHEN status = 'Delivered (Hand to Hand)' THEN 'HAND_TO_HAND_PENDING'
        WHEN status = 'Received (User)' THEN 'RECEIVED'
        ELSE 'PENDING_PICKUP'
    END)::tracking_status
WHERE 
    status != 'NEW' 
    AND (document_status IS NULL OR tracking_status IS NULL);

-- Step 4: Show the results
SELECT 'Documents after dual status update:' as info;
SELECT 
    id,
    title,
    status,
    document_status,
    tracking_status,
    created_at
FROM documents 
ORDER BY created_at DESC
LIMIT 10;

-- Step 5: Show table structure
SELECT 'Documents table columns:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'documents' 
AND column_name IN ('status', 'document_status', 'tracking_status')
ORDER BY column_name;

COMMIT; 