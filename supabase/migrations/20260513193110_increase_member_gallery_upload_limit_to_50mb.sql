alter table public.gallery_submissions
  drop constraint if exists gallery_submissions_size_bytes_check;

alter table public.gallery_submissions
  add constraint gallery_submissions_size_bytes_check
  check (size_bytes > 0 and size_bytes <= 52428800);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'member-gallery',
  'member-gallery',
  false,
  52428800,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set
  public = false,
  file_size_limit = 52428800,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']::text[];
