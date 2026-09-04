# Environment Variables Setup

## Required Environment Variables

Make sure your `.env.local` file includes:

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key  # REQUIRED for file uploads
```

## Getting Your Supabase Service Role Key

1. Go to your **Supabase Dashboard**
2. Navigate to **Settings** → **API**
3. Find **"service_role"** key (NOT the anon key)
4. Copy it to your `.env.local` file as `SUPABASE_SERVICE_ROLE_KEY`

⚠️ **IMPORTANT**: The service role key bypasses Row Level Security (RLS). Keep it secret and never expose it in client-side code.

## Why We Need It

Since we're using Clerk for authentication (not Supabase Auth), the Supabase Storage RLS policies that check `auth.uid()` don't work. The service role key allows us to:
- Upload files to Supabase Storage
- Bypass RLS restrictions
- Still maintain security through application-level checks (Clerk authentication)

## Security Note

The service role key is only used in server-side API routes (`/api/upload-file`), never in client-side code. All uploads are still protected by:
- Clerk authentication (user must be logged in)
- Subscription plan checks (Free users can only upload profile pictures)
- File type validation
- File size limits
- Manual moderation system






