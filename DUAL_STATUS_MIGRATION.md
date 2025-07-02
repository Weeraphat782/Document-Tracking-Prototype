# Dual Status System Migration Instructions

## Overview

This migration implements a **Dual Status System** that separates document status into two components:
- **Document Status**: Approval/business state (–, Pending, Accepted, Rejected)  
- **Tracking Status**: Physical/logistical state (NEW, Ready for Pick-up, Picked up, etc.)

## New Document Flow

| Document Status | Tracking Status | Description | Can Edit? |
|-----------------|-----------------|-------------|-----------|
| – | NEW | Document just created | ✅ Yes |
| – | Ready for Pick-up | Released for pickup | ❌ No |
| – | Picked up | Document picked up | ❌ No |
| – | Delivered | Document delivered | ❌ No |
| Pending | Received | Waiting for approval | ❌ No |
| Accepted | Ready for Pick-up | Approved, ready for next step | ❌ No |
| Rejected | Ready for Pick-up | Rejected, ready for pickup | ❌ No |
| – | Completed | All approvers accepted | ❌ No |
| – | Rejected | Document workflow rejected | ❌ No |

## Migration Steps

### 1. **Run the Migration Script**

**⚠️ IMPORTANT**: Use the **ENUM-safe migration script** to avoid PostgreSQL enum constraint errors:

```bash
# Navigate to your project directory
cd /path/to/your/project

# Run the ENUM-safe migration script in Supabase
# Option 1: Using Supabase CLI
supabase db reset --db-url "your-supabase-connection-string" < supabase-fix-enum-dual-status.sql

# Option 2: Using psql directly  
psql "your-supabase-connection-string" -f supabase-fix-enum-dual-status.sql

# Option 3: Copy and paste the SQL content in Supabase Dashboard > SQL Editor
```

**Why use `supabase-fix-enum-dual-status.sql`?**
- Handles existing PostgreSQL ENUM types properly
- Avoids "invalid input value for enum" errors
- Uses CHECK constraints instead of ENUM for flexibility
- Safe to run multiple times

### 2. **Verify Migration**

Check that the migration completed successfully:

```sql
-- Check if columns were added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'documents' 
AND column_name IN ('document_status', 'tracking_status');

-- Check data migration results
SELECT 
  status as legacy_status,
  document_status,
  tracking_status,
  COUNT(*) as count
FROM documents 
GROUP BY status, document_status, tracking_status
ORDER BY count DESC;
```

### 3. **Expected Results**

After migration, you should see:
- New columns `document_status` and `tracking_status` in documents table
- All existing documents updated with appropriate dual status values
- Indexes created for better query performance

## Files Modified

The following files have been updated to support the dual status system:

### **Type Definitions** (`lib/types.ts`)
- Updated `DocumentStatusNew` type to include `null | "PENDING" | "ACCEPTED" | "REJECTED"`
- Updated `TrackingStatus` type with new status values
- Updated status display mapping functions

### **Database Service** (`lib/database-service.ts`)  
- Updated document creation to use dual status
- Modified status mapping functions

### **Enhanced Document Service** (`lib/enhanced-document-service.ts`)
- Completely rewritten `executeAction` function to use new status flow
- Updated status transitions to follow new workflow

### **Dashboard UI** (`app/dashboard/page.tsx`)
- Updated status display to show both Document Status and Tracking Status
- Modified status badge rendering for dual status system

## UI Changes

The dashboard now displays two status columns:
- **Document Status**: Shows approval state (–, Pending, Accepted, Rejected)
- **Tracking Status**: Shows physical/logistical state (NEW, Ready for Pick-up, etc.)

## Troubleshooting

### If migration fails:

1. **Check Supabase connection**:
   ```bash
   # Test connection
   supabase projects list
   ```

2. **Verify table structure**:
   ```sql
   \d documents
   ```

3. **Manual rollback** (if needed):
   ```sql
   ALTER TABLE documents DROP COLUMN IF EXISTS document_status;
   ALTER TABLE documents DROP COLUMN IF EXISTS tracking_status;
   ```

### Common Issues:

- **ENUM constraint error** (`invalid input value for enum tracking_status: "NEW"`):
  - **Cause**: Existing PostgreSQL ENUM types don't include new values
  - **Solution**: Use `supabase-fix-enum-dual-status.sql` instead of the basic migration
  - **Why**: This script converts ENUMs to CHECK constraints for flexibility

- **Column already exists**: The script uses `IF NOT EXISTS`, so it's safe to run multiple times
- **Check constraint violation**: Ensure all status values are valid according to the new constraints  
- **Index creation failed**: Indexes will be skipped if they already exist

### ENUM vs CHECK Constraints:

The new migration uses **CHECK constraints** instead of **ENUM types** because:
- ✅ More flexible - can add new values without complex ALTER TYPE commands
- ✅ Easier to modify during development
- ✅ No "invalid enum value" errors when updating
- ✅ Better compatibility with application code changes

## Testing

After migration, test the following:

1. **Create new document** - should have `document_status: null, tracking_status: "NEW"`
2. **Release document** - should change to `tracking_status: "READY_FOR_PICKUP"`  
3. **Process through workflow** - verify status transitions match the flow table above
4. **Check UI display** - both status columns should show correct values

## Rollout Plan

1. **Development Environment**: 
   - Test migration with `supabase-fix-enum-dual-status.sql`
   - Verify all status transitions work correctly
   - Check UI displays both status columns properly

2. **Staging Environment**: 
   - Run migration script on staging data
   - Test complete document workflow
   - Validate legacy document compatibility

3. **Production Environment**: 
   - Schedule during maintenance window
   - Run `supabase-fix-enum-dual-status.sql`
   - Monitor for any constraint violations

4. **Post-Migration**: 
   - Check application logs for errors
   - Verify user interface displays correctly
   - Monitor document workflow performance

## Quick Test Commands

After migration, test with these SQL queries:

```sql
-- Test 1: Check column structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'documents' 
AND column_name IN ('document_status', 'tracking_status');

-- Test 2: Verify data migration
SELECT 
  status as legacy_status,
  document_status,
  tracking_status,
  COUNT(*) as count
FROM documents 
GROUP BY status, document_status, tracking_status
ORDER BY count DESC;

-- Test 3: Check constraints
SELECT constraint_name, check_clause 
FROM information_schema.check_constraints 
WHERE constraint_name LIKE '%_status_check';
```

The system maintains backward compatibility with legacy status values while enabling the new dual status display. 