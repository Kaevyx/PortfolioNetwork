# Fix: "mime type image/jpeg is not supported" Error

## Problem
Your Supabase Storage bucket has MIME type restrictions that are blocking file uploads.

## Solution: Configure Bucket in Supabase Dashboard

### Step 1: Access Storage Settings
1. Go to your **Supabase Dashboard**
2. Navigate to **Storage** in the left sidebar
3. Click on your bucket (e.g., `profile-pictures`)

### Step 2: Remove or Update MIME Type Restrictions

**Option A: Remove All Restrictions (Easiest - Recommended for Development)**
1. Click on **Settings** or **Policies** tab
2. Look for **"Allowed MIME types"** or **"File restrictions"**
3. **Clear/Remove** any MIME type restrictions
4. **Save** changes

**Option B: Add Specific MIME Types (More Secure)**
1. In the bucket settings, find **"Allowed MIME types"**
2. Add these MIME types (one per line or comma-separated):
   ```
   image/jpeg
   image/png
   image/webp
   image/gif
   application/pdf
   application/msword
   application/vnd.openxmlformats-officedocument.wordprocessingml.document
   ```
3. **Save** changes

### Step 3: Verify Bucket Configuration

For each bucket you're using:

#### `profile-pictures` bucket:
- Should allow: `image/jpeg`, `image/png`, `image/webp`, `image/gif`
- Or: No restrictions

#### `cv-resumes` bucket:
- Should allow: `application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- Or: No restrictions

#### `portfolio-files` bucket:
- Should allow: `image/*`, `application/pdf`
- Or: No restrictions

### Step 4: Test Upload Again

After configuring the bucket, try uploading a file again. The error should be resolved.

## Alternative: Use Supabase SQL (If Dashboard Doesn't Work)

If you can't find the MIME type settings in the dashboard, you can try using SQL:

```sql
-- Note: Supabase Storage bucket settings are typically managed via the dashboard
-- But you can check bucket policies with:
SELECT * FROM storage.buckets WHERE name = 'profile-pictures';
```

## Important Notes

- **For Development**: Removing all MIME type restrictions is fine
- **For Production**: Keep specific MIME type restrictions for security
- The code has been updated to not send explicit `contentType`, but the bucket still validates the file's actual MIME type
- If the error persists after removing restrictions, the bucket might need to be recreated

## Still Having Issues?

If the error continues:
1. Verify the bucket exists: Go to Storage → Check if `profile-pictures` bucket exists
2. Check bucket permissions: Ensure authenticated users can upload
3. Try creating a new bucket without restrictions
4. Check Supabase project logs for more details






