-- Restores the original Supabase migration version that was applied before the
-- manual Instagram sharing status migration was renamed to 20260608173000.
--
-- Supabase Preview compares remote migration versions to local migration files.
-- Keep this no-op file so remote history stays represented locally while the
-- canonical schema remains in:
-- supabase/migrations/20260608173000_add_manual_instagram_share_status.sql

select 1;
