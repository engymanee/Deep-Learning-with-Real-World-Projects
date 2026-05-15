-- Create custom-page-images bucket in Supabase Storage
-- Run this SQL in your Supabase project (both test and prod)

-- 1. Create the bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('custom-page-images', 'custom-page-images', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Allow public read access to all objects in the bucket
CREATE POLICY "Public read access to custom-page-images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'custom-page-images');

-- 3. Allow authenticated admin users to upload (INSERT)
CREATE POLICY "Admin users can upload to custom-page-images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'custom-page-images'
  AND auth.role() = 'authenticated'
  AND (
    SELECT role FROM public.user_profiles WHERE id = auth.uid()
  ) = 'admin'
);

-- 4. Allow authenticated admin users to delete
CREATE POLICY "Admin users can delete from custom-page-images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'custom-page-images'
  AND auth.role() = 'authenticated'
  AND (
    SELECT role FROM public.user_profiles WHERE id = auth.uid()
  ) = 'admin'
);

