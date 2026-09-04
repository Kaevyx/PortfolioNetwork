# Fix Storage Bucket MIME Type Configuration

If you're getting "mime type image/jpeg is not supported" errors, you need to configure the bucket to allow these MIME types.

## Solution 1: Update Bucket Configuration in Supabase Dashboard

1. Go to **Storage** in your Supabase dashboard
2. Click on the bucket (e.g., `profile-pictures`)
3. Go to **Settings** or **Policies** tab
4. Look for **Allowed MIME types** or **File restrictions**
5. Add or ensure these MIME types are allowed:
   - `image/jpeg`
   - `image/png`
   - `image/webp`
   - `image/gif`
   - `application/pdf`
   - `application/msword`
   - `application/vnd.openxmlformats-officedocument.wordprocessingml.document`

## Solution 2: Remove MIME Type Restrictions (Recommended for Development)

If you want to allow all file types (less secure but easier for development):

1. Go to **Storage** → Your bucket → **Settings**
2. Remove or clear any MIME type restrictions
3. Save changes

## Solution 3: Use Storage API with Content-Type Override

The code has been updated to normalize MIME types. If issues persist, you may need to:

1. Check your Supabase project settings
2. Ensure the bucket exists and is properly configured
3. Verify your Supabase service role key has proper permissions

## For Production

For production, it's recommended to:
- Keep MIME type restrictions for security
- Use specific allowed types per bucket
- Implement additional file validation in your API






