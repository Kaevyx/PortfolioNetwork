# Supabase Storage Buckets Setup Guide

## Step 1: Create Storage Buckets in Supabase Dashboard

1. Go to your Supabase Dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **New bucket**

### Create the following buckets:

#### 1. `profile-pictures` Bucket
- **Name**: `profile-pictures`
- **Public**: ✅ Yes (so profile pictures can be accessed via URL)
- **File size limit**: 5 MB
- **Allowed MIME types**: `image/jpeg`, `image/png`, `image/webp`, `image/gif`

#### 2. `cv-resumes` Bucket
- **Name**: `cv-resumes`
- **Public**: ❌ No (private, only accessible via signed URLs)
- **File size limit**: 10 MB
- **Allowed MIME types**: `application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`

#### 3. `portfolio-files` Bucket (Optional - for portfolio images, documents, etc.)
- **Name**: `portfolio-files`
- **Public**: ✅ Yes (for images) or ❌ No (for documents)
- **File size limit**: 20 MB
- **Allowed MIME types**: `image/*`, `application/pdf`

## Step 2: Set Up Bucket Policies (Optional)

If you want to use RLS policies instead of disabling RLS:

### For `profile-pictures` (Public):
```sql
-- Allow public read access
CREATE POLICY "Public Access" ON storage.objects
FOR SELECT USING (bucket_id = 'profile-pictures');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'profile-pictures' AND
  auth.role() = 'authenticated'
);

-- Allow users to update their own files
CREATE POLICY "Users can update own files" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'profile-pictures' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

### For `cv-resumes` (Private):
```sql
-- Only allow users to access their own CVs
CREATE POLICY "Users can read own CVs" ON storage.objects
FOR SELECT USING (
  bucket_id = 'cv-resumes' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to upload their own CVs
CREATE POLICY "Users can upload own CVs" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'cv-resumes' AND
  auth.role() = 'authenticated' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

**Note**: Since we're using Clerk for authentication, these RLS policies won't work directly. We'll handle access control at the application level.

## Step 3: Run the Storage Schema SQL

1. Go to **SQL Editor** in Supabase Dashboard
2. Run the `supabase/storage-schema.sql` script
3. This creates the storage tracking tables and functions

## Step 4: Verify Setup

After creating buckets and running the SQL:

1. Check that buckets exist in Storage section
2. Verify `storage_usage` and `storage_files` tables exist
3. Test the functions:
   ```sql
   -- Test getting storage limit
   SELECT get_user_storage_limit('user_clerk_id_here');
   
   -- Test checking storage availability
   SELECT check_storage_available('user_clerk_id_here', 1048576); -- 1 MB
   ```

## Storage Limits by Plan

- **Free**: 50 MB
- **Pro**: 500 MB
- **Business**: 5 GB

These limits are stored in the `subscription_plans` table and can be updated as needed.






