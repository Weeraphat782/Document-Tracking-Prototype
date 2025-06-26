# Database Migration Instructions

## Issue: Rejected Document Status Fix

เมื่อ deliver เอกสารที่ถูก reject กลับไปยังต้นทาง:
- Document Status แสดง "Active" แทนที่จะเป็น "Rejected" 
- Tracking Status แสดง "Delivered" แทนที่จะเป็น "Rejected - Returned to Originator"

## Solution

### 1. Application Code Changes ✅ (Already Done)
- เพิ่ม status ใหม่: `"REJECTED - Returned to Originator"`
- เพิ่ม tracking status ใหม่: `"REJECTED_RETURNED"`  
- อัพเดท deliver logic ให้ใช้ status ใหม่
- อัพเดท status mapping และ display

### 2. Database Migration Required 🔄

#### สำหรับ Supabase:
```sql
-- รันไฟล์ supabase-add-rejected-returned-status.sql
-- ไฟล์นี้จะ:
-- 1. เพิ่ม 'REJECTED - Returned to Originator' ใน document_status enum
-- 2. เพิ่ม 'REJECTED_RETURNED' ใน tracking_status enum (ถ้ามี)
-- 3. อัพเดท display functions
```

#### วิธีการรัน Migration:

**Option 1: Supabase Dashboard**
1. เปิด Supabase Dashboard
2. ไปที่ SQL Editor
3. Copy & paste เนื้อหาจาก `supabase-add-rejected-returned-status.sql`
4. กด Run

**Option 2: Command Line (ถ้าใช้ Supabase CLI)**
```bash
supabase db push
# หรือ
psql -h [your-db-host] -U [username] -d [database] -f supabase-add-rejected-returned-status.sql
```

### 3. Verification Steps

หลังจากรัน migration แล้ว ให้เช็ค:

```sql
-- 1. เช็คว่า enum มี status ใหม่
SELECT unnest(enum_range(NULL::document_status)) as status_values;

-- 2. เช็คว่า tracking status มีค่าใหม่ (ถ้ามี enum นี้)
SELECT unnest(enum_range(NULL::tracking_status)) as tracking_status_values;

-- 3. ทดสอบ display functions
SELECT * FROM get_document_status_display('REJECTED - Returned to Originator');
SELECT * FROM get_tracking_status_display('REJECTED_RETURNED');
```

### 4. Testing

หลังจาก migration:
1. สร้างเอกสารใหม่และ reject
2. ให้ mail controller pickup เอกสาร rejected
3. ให้ mail controller deliver กลับไปยังต้นทาง
4. เช็คว่า status แสดงถูกต้อง:
   - Document Status: "Rejected" 
   - Tracking Status: "Rejected - Returned to Originator"

### 5. Rollback Plan (ถ้าจำเป็น)

ถ้ามีปัญหา สามารถ rollback ได้โดย:
```sql
-- ไม่สามารถลบ enum value ได้ใน PostgreSQL
-- ต้องสร้าง enum ใหม่และ migrate data
-- แต่ในกรณีนี้ไม่น่าจำเป็น เพราะเป็นการเพิ่มเท่านั้น
```

## Files Changed

1. `lib/types.ts` - เพิ่ม status ใหม่และ mapping
2. `lib/enhanced-document-service.ts` - อัพเดท deliver logic และ display
3. `supabase-add-rejected-returned-status.sql` - Database migration
4. `app/debug-documents/page.tsx` - Debug page สำหรับทดสอบ

## Important Notes

- ⚠️ **ห้าม push code จนกว่าจะทดสอบ database migration เรียบร้อย**
- ⚠️ **ทดสอบใน development environment ก่อน**
- ⚠️ **Backup database ก่อนรัน migration ใน production**

## Next Steps

1. รัน database migration
2. ทดสอบ rejected document workflow
3. เช็คหน้า debug ว่า status mapping ถูกต้อง
4. ยืนยันว่าทุกอย่างทำงานถูกต้องแล้วค่อย commit & push 