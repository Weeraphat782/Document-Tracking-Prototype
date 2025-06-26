-- Simple Migration: Add REJECTED - Returned to Originator status
-- Run this in Supabase SQL Editor

-- 1. Add new status to document_status enum
ALTER TYPE document_status ADD VALUE IF NOT EXISTS 'REJECTED - Returned to Originator';

-- 2. Add new tracking status to tracking_status enum (if it exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tracking_status') THEN
        ALTER TYPE tracking_status ADD VALUE IF NOT EXISTS 'REJECTED_RETURNED';
    END IF;
END $$;

-- 3. Verify the changes
SELECT 'document_status enum values:' as info;
SELECT unnest(enum_range(NULL::document_status)) as status_values;

-- 4. Check tracking_status if exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tracking_status') THEN
        RAISE NOTICE 'tracking_status enum values:';
        PERFORM unnest(enum_range(NULL::tracking_status));
    ELSE
        RAISE NOTICE 'tracking_status enum does not exist';
    END IF;
END $$; 