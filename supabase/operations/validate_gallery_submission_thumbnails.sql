-- Run only after the reviewed historical backfill is complete and a separate
-- schema-change approval authorizes validation. This is intentionally not a
-- migration in the initial rollout because existing approved rows start empty.

begin;

lock table public.gallery_submissions in share mode;

do $$
begin
  if exists (
    select 1
    from public.gallery_submissions as submission
    where submission.status = 'approved'
      and (
        submission.thumbnail_revision_id is null
        or submission.thumbnail_storage_path is null
        or submission.thumbnail_mime_type <> 'image/webp'
        or submission.thumbnail_size_bytes not between 1 and 81920
        or submission.thumbnail_storage_path <> (
          '_approved/thumbs/' || submission.id::text || '/' ||
          submission.thumbnail_revision_id::text || '.webp'
        )
      )
  ) then
    raise exception 'Approved gallery thumbnail backfill is incomplete.';
  end if;

  if exists (
    select 1
    from public.gallery_submissions as submission
    left join storage.objects as original_object
      on original_object.bucket_id = submission.storage_bucket
      and original_object.name = submission.storage_path
    left join storage.objects as thumbnail_object
      on thumbnail_object.bucket_id = 'member-gallery'
      and thumbnail_object.name = submission.thumbnail_storage_path
    where submission.status = 'approved'
      and (
        original_object.id is null
        or (case
          when coalesce(original_object.metadata ->> 'size', '') ~ '^[0-9]+$'
            then (original_object.metadata ->> 'size')::bigint
          else null
        end) is distinct from submission.size_bytes
        or lower(coalesce(original_object.metadata ->> 'mimetype', '')) <> submission.mime_type
        or thumbnail_object.id is null
        or (case
          when coalesce(thumbnail_object.metadata ->> 'size', '') ~ '^[0-9]+$'
            then (thumbnail_object.metadata ->> 'size')::bigint
          else null
        end) is distinct from submission.thumbnail_size_bytes
        or lower(coalesce(thumbnail_object.metadata ->> 'mimetype', '')) <> 'image/webp'
      )
  ) then
    raise exception 'Approved gallery Storage evidence is incomplete or mismatched.';
  end if;
end
$$;

alter table public.gallery_submissions
  validate constraint gallery_submissions_approved_thumbnail_check;

do $$
begin
  if not coalesce((
    select constraint_record.convalidated
    from pg_constraint as constraint_record
    where constraint_record.conrelid = 'public.gallery_submissions'::regclass
      and constraint_record.conname = 'gallery_submissions_approved_thumbnail_check'
  ), false) then
    raise exception 'Approved gallery thumbnail constraint was not validated.';
  end if;
end
$$;

commit;
