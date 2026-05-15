# Quick Fix: "Failed to upload to blob storage" Error

## Step 1: Initialize the Storage Bucket

You have two options:

### Option A: Automatic Setup (Recommended)
Call the setup endpoint from your browser or API client:

```
POST https://practicalwisdomproject.org/api/admin/custom-pages/setup
```

This will automatically create the `custom-page-images` bucket with proper configuration.

### Option B: Manual SQL Setup
If Option A doesn't work, run this SQL in your Supabase dashboard:

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Click **SQL Editor** → **New Query**
4. Copy and paste this SQL:

```sql
-- Create the custom-page-images storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('custom-page-images', 'custom-page-images', true)
ON CONFLICT (id) DO NOTHING;
```

5. Click **Run**

## Step 2: Test Upload

1. Go to `/admin/custom-pages/[pageId]` (any page you're editing)
2. Scroll to "Image Library" section
3. Click "Upload Image"
4. Select a small image (JPEG, PNG, WebP, or GIF)
5. The upload should now complete successfully

## What Changed

- ✅ Upload endpoint now uses Supabase Storage exclusively (no Vercel Blob)
- ✅ Automatic bucket initialization added to setup function
- ✅ File uploads store at: `custom-page-images/[uuid].ext`
- ✅ Public URL generation works automatically

## Still Having Issues?

If uploads still fail after the bucket is created:
1. Check browser console (F12) for detailed error messages
2. Verify your Supabase project has sufficient storage quota
3. Ensure your user role is 'admin' in the database
4. Check file size (max 5MB) and format (JPEG/PNG/WebP/GIF only)
