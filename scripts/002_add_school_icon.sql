-- Migration: Add icon_url column to schools table
-- Run this in Supabase SQL Editor to support school logo uploads

alter table public.schools
add column icon_url text;

comment on column public.schools.icon_url is 'URL to school logo/icon stored in Vercel Blob';
