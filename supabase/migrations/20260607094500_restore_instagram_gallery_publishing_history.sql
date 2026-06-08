-- Restores the original Supabase migration version that was applied before the
-- Instagram publishing migration was renamed to 20260607125027.
--
-- Supabase Preview compares remote migration versions to local migration files.
-- Keep this no-op file so remote history stays represented locally while the
-- canonical schema remains in:
-- supabase/migrations/20260607125027_add_instagram_gallery_publishing.sql

select 1;
