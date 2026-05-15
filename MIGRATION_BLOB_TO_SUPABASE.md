# Vercel Blob to Supabase Storage Migration - Complete

## Migration Summary

Successfully migrated custom page image uploads from Vercel Blob to Supabase Storage.

### Changes Made:

1. **Uninstalled @vercel/blob package**
   - Removed from dependencies via `pnpm remove @vercel/blob`
   - Eliminates BLOB_READ_WRITE_TOKEN requirement

2. **Updated Upload Handler** (`app/api/admin/custom-pages/images/upload/route.ts`)
   - Replaced Vercel Blob `put()` with Supabase Storage `.upload()`
   - Generate unique filenames using `crypto.randomUUID()` + file extension
   - Upload to `custom-page-images` bucket
   - Extract public URL via `getPublicUrl()` 
   - Store URL in database for persistence

3. **Updated Delete Handler** (`app/api/admin/custom-pages/images/[id]/route.ts`)
   - Parse Supabase Storage URL to extract filename
   - Delete from storage via `.remove([filename])`
   - Delete from database record
   - Prevent deletion if image is in use

4. **Added Next.js Config** (`next.config.js`)
   - Configure remote image pattern for `**.supabase.co`
   - Allows Next.js Image component to load Supabase Storage URLs

5. **Created Storage Setup Script** (`scripts/setup-storage.sql`)
   - SQL to create `custom-page-images` bucket
   - RLS policy for public read access
   - RLS policy for admin upload access
   - RLS policy for admin delete access

## Setup Instructions

### Step 1: Run SQL in Supabase

1. Go to your Supabase project (both test and production)
2. Navigate to **SQL Editor**
3. Create new query
4. Copy and paste the SQL from `scripts/setup-storage.sql`
5. Click **Run**

### Step 2: Deploy the Code

1. Push changes to your repository
2. Vercel will auto-deploy
3. No environment variables needed (uses existing Supabase connection)

## Verification Checklist

- [x] No @vercel/blob imports remain in codebase
- [x] No BLOB_READ_WRITE_TOKEN references remain
- [x] Upload uses Supabase Storage
- [x] Delete removes from Supabase Storage
- [x] next.config.js configured for Supabase URLs
- [x] Build compiles successfully
- [x] TypeScript types correct for Next.js 16

## Testing After Deployment

1. Upload a 2-3 MB image in custom pages editor
2. Verify it completes in a few seconds
3. Check that preview updates immediately
4. Save the page
5. View public page and confirm image renders
6. Right-click image, inspect source URL - should be `https://[project-ref].supabase.co/storage/v1/object/public/custom-page-images/...`
7. Delete the image from admin panel - confirm it's removed from both storage and database

## Key Benefits

- Eliminates external dependency (Vercel Blob)
- Uses existing Supabase infrastructure
- No API token management for storage
- Public URLs built-in
- RLS policies control admin-only access
- Lower cost (included in Supabase Storage quota)
