alter table public.gallery_submissions
  add column if not exists thumbnail_revision_id uuid,
  add column if not exists thumbnail_storage_path text,
  add column if not exists thumbnail_mime_type text,
  add column if not exists thumbnail_size_bytes bigint;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.gallery_submissions'::regclass
      and conname = 'gallery_submissions_thumbnail_path_length'
  ) then
    alter table public.gallery_submissions
      add constraint gallery_submissions_thumbnail_path_length
      check (
        thumbnail_storage_path is null
        or char_length(thumbnail_storage_path) between 1 and 1000
      ) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.gallery_submissions'::regclass
      and conname = 'gallery_submissions_thumbnail_service_path_check'
  ) then
    alter table public.gallery_submissions
      add constraint gallery_submissions_thumbnail_service_path_check
      check (
        thumbnail_storage_path is null
        or thumbnail_storage_path = (
          '_approved/thumbs/' || id::text || '/' || thumbnail_revision_id::text || '.webp'
        )
      ) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.gallery_submissions'::regclass
      and conname = 'gallery_submissions_thumbnail_mime_type_check'
  ) then
    alter table public.gallery_submissions
      add constraint gallery_submissions_thumbnail_mime_type_check
      check (thumbnail_mime_type is null or thumbnail_mime_type = 'image/webp') not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.gallery_submissions'::regclass
      and conname = 'gallery_submissions_thumbnail_size_bytes_check'
  ) then
    alter table public.gallery_submissions
      add constraint gallery_submissions_thumbnail_size_bytes_check
      check (
        thumbnail_size_bytes is null
        or thumbnail_size_bytes between 1 and 81920
      ) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.gallery_submissions'::regclass
      and conname = 'gallery_submissions_thumbnail_complete_check'
  ) then
    alter table public.gallery_submissions
      add constraint gallery_submissions_thumbnail_complete_check
      check (
        (
          thumbnail_revision_id is null
          and thumbnail_storage_path is null
          and thumbnail_mime_type is null
          and thumbnail_size_bytes is null
        )
        or (
          thumbnail_revision_id is not null
          and thumbnail_storage_path is not null
          and thumbnail_mime_type = 'image/webp'
          and thumbnail_size_bytes between 1 and 81920
        )
      ) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.gallery_submissions'::regclass
      and conname = 'gallery_submissions_approved_thumbnail_check'
  ) then
    alter table public.gallery_submissions
      add constraint gallery_submissions_approved_thumbnail_check
      check (
        status <> 'approved'
        or (
          thumbnail_revision_id is not null
          and thumbnail_storage_path is not null
          and thumbnail_mime_type = 'image/webp'
          and thumbnail_size_bytes between 1 and 81920
        )
      ) not valid;
  end if;
end
$$;

alter table public.gallery_moderation_events
  drop constraint if exists gallery_moderation_events_action_check;

alter table public.gallery_moderation_events
  add constraint gallery_moderation_events_action_check
  check (action in ('approved', 'rejected', 'archived', 'thumbnail_refreshed')) not valid;

create index if not exists gallery_submissions_thumbnail_backfill_idx
on public.gallery_submissions (reviewed_at asc, created_at asc, id asc)
where status = 'approved' and thumbnail_revision_id is null;

create or replace function public.enforce_gallery_original_immutability()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (old.status <> 'pending' or new.status <> 'pending')
    and row(old.storage_bucket, old.storage_path, old.mime_type, old.size_bytes)
      is distinct from
        row(new.storage_bucket, new.storage_path, new.mime_type, new.size_bytes)
  then
    raise exception 'A moderated gallery original is immutable.' using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_gallery_original_immutability() from public, anon, authenticated;

drop trigger if exists enforce_gallery_original_immutability on public.gallery_submissions;
create trigger enforce_gallery_original_immutability
before update on public.gallery_submissions
for each row
execute function public.enforce_gallery_original_immutability();

create or replace function private.member_gallery_original_mutation_allowed(
  p_user_id uuid,
  p_bucket_id text,
  p_object_name text,
  p_allow_orphan boolean
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    p_user_id = auth.uid()
    and p_bucket_id = 'member-gallery'
    and (storage.foldername(p_object_name))[1] = p_user_id::text
    and coalesce(
      (
        select submission.status = 'pending'
        from public.gallery_submissions as submission
        where submission.user_id = p_user_id
          and submission.storage_bucket = p_bucket_id
          and submission.storage_path = p_object_name
        limit 1
      ),
      p_allow_orphan
    );
$$;

revoke all on function private.member_gallery_original_mutation_allowed(uuid, text, text, boolean)
from public, anon, authenticated;
grant execute on function private.member_gallery_original_mutation_allowed(uuid, text, text, boolean)
to authenticated;

drop policy if exists "Members update own gallery objects" on storage.objects;
drop policy if exists "Members update own pending gallery originals" on storage.objects;
create policy "Members update own pending gallery originals"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'member-gallery'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and private.member_has_gallery_upload_access((select auth.uid()))
  and private.member_gallery_original_mutation_allowed(
    (select auth.uid()),
    storage.objects.bucket_id,
    storage.objects.name,
    false
  )
)
with check (
  bucket_id = 'member-gallery'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and private.member_has_gallery_upload_access((select auth.uid()))
  and private.member_gallery_original_mutation_allowed(
    (select auth.uid()),
    storage.objects.bucket_id,
    storage.objects.name,
    false
  )
);

drop policy if exists "Members delete own gallery objects" on storage.objects;
drop policy if exists "Members delete own pending or orphaned gallery originals" on storage.objects;
create policy "Members delete own pending or orphaned gallery originals"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'member-gallery'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and private.member_has_gallery_upload_access((select auth.uid()))
  and private.member_gallery_original_mutation_allowed(
    (select auth.uid()),
    storage.objects.bucket_id,
    storage.objects.name,
    true
  )
);

create or replace function public.gallery_commit_moderation(
  p_submission_id uuid,
  p_moderator_id uuid,
  p_action text,
  p_reason text default null,
  p_thumbnail_revision_id uuid default null,
  p_thumbnail_storage_path text default null,
  p_thumbnail_mime_type text default null,
  p_thumbnail_size_bytes bigint default null,
  p_expected_thumbnail_revision_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_submission public.gallery_submissions%rowtype;
  updated_submission public.gallery_submissions%rowtype;
  original_metadata jsonb;
  thumbnail_metadata jsonb;
  expected_thumbnail_path text;
  audit_action text;
  audit_reason text;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Service role required.' using errcode = '42501';
  end if;

  if p_action not in ('approved', 'rejected', 'thumbnail') then
    raise exception 'Invalid gallery moderation action.' using errcode = '22023';
  end if;

  select *
  into current_submission
  from public.gallery_submissions
  where id = p_submission_id
  for update;

  if not found then
    return jsonb_build_object('committed', false, 'reason', 'submission_not_found');
  end if;

  if p_action in ('approved', 'rejected') and current_submission.status <> 'pending' then
    return jsonb_build_object('committed', false, 'reason', 'submission_not_pending');
  end if;

  if p_action = 'thumbnail' then
    if current_submission.status <> 'approved' then
      return jsonb_build_object('committed', false, 'reason', 'submission_not_approved');
    end if;

    if current_submission.thumbnail_revision_id is distinct from p_expected_thumbnail_revision_id then
      return jsonb_build_object('committed', false, 'reason', 'stale_thumbnail_revision');
    end if;
  end if;

  select object.metadata
  into original_metadata
  from storage.objects as object
  where object.bucket_id = current_submission.storage_bucket
    and object.name = current_submission.storage_path
  for key share;

  if not found
    or (case
      when coalesce(original_metadata ->> 'size', '') ~ '^[0-9]+$'
        then (original_metadata ->> 'size')::bigint
      else null
    end) is distinct from current_submission.size_bytes
    or lower(coalesce(original_metadata ->> 'mimetype', '')) <> current_submission.mime_type
  then
    return jsonb_build_object('committed', false, 'reason', 'original_object_mismatch');
  end if;

  if p_action in ('approved', 'thumbnail') then
    if p_thumbnail_revision_id is null
      or p_thumbnail_storage_path is null
      or p_thumbnail_mime_type <> 'image/webp'
      or p_thumbnail_size_bytes not between 1 and 81920
    then
      raise exception 'A complete bounded gallery thumbnail is required.' using errcode = '22023';
    end if;

    expected_thumbnail_path := '_approved/thumbs/' || p_submission_id::text || '/' || p_thumbnail_revision_id::text || '.webp';
    if p_thumbnail_storage_path <> expected_thumbnail_path then
      raise exception 'Gallery thumbnail path is invalid.' using errcode = '22023';
    end if;

    select object.metadata
    into thumbnail_metadata
    from storage.objects as object
    where object.bucket_id = 'member-gallery'
      and object.name = p_thumbnail_storage_path
    for key share;

    if not found
      or (case
        when coalesce(thumbnail_metadata ->> 'size', '') ~ '^[0-9]+$'
          then (thumbnail_metadata ->> 'size')::bigint
        else null
      end) is distinct from p_thumbnail_size_bytes
      or lower(coalesce(thumbnail_metadata ->> 'mimetype', '')) <> 'image/webp'
    then
      return jsonb_build_object('committed', false, 'reason', 'thumbnail_object_mismatch');
    end if;
  elsif p_thumbnail_revision_id is not null
    or p_thumbnail_storage_path is not null
    or p_thumbnail_mime_type is not null
    or p_thumbnail_size_bytes is not null
  then
    raise exception 'Rejected submissions cannot publish a thumbnail.' using errcode = '22023';
  end if;

  if p_action = 'thumbnail' then
    update public.gallery_submissions
    set
      thumbnail_revision_id = p_thumbnail_revision_id,
      thumbnail_storage_path = p_thumbnail_storage_path,
      thumbnail_mime_type = p_thumbnail_mime_type,
      thumbnail_size_bytes = p_thumbnail_size_bytes
    where id = p_submission_id
    returning * into updated_submission;

    audit_action := 'thumbnail_refreshed';
    audit_reason := 'Bounded gallery thumbnail prepared.';
  else
    update public.gallery_submissions
    set
      status = p_action,
      reviewed_by = p_moderator_id,
      reviewed_at = now(),
      rejection_reason = case
        when p_action = 'rejected' then coalesce(nullif(btrim(p_reason), ''), 'Rejected by moderator.')
        else null
      end,
      thumbnail_revision_id = case when p_action = 'approved' then p_thumbnail_revision_id else null end,
      thumbnail_storage_path = case when p_action = 'approved' then p_thumbnail_storage_path else null end,
      thumbnail_mime_type = case when p_action = 'approved' then p_thumbnail_mime_type else null end,
      thumbnail_size_bytes = case when p_action = 'approved' then p_thumbnail_size_bytes else null end
    where id = p_submission_id
    returning * into updated_submission;

    audit_action := p_action;
    audit_reason := case when p_action = 'rejected' then updated_submission.rejection_reason else null end;
  end if;

  insert into public.gallery_moderation_events (
    submission_id,
    moderator_id,
    action,
    reason
  ) values (
    p_submission_id,
    p_moderator_id,
    audit_action,
    audit_reason
  );

  return jsonb_build_object(
    'committed', true,
    'submission', to_jsonb(updated_submission),
    'action', p_action
  );
end;
$$;

revoke all on function public.gallery_commit_moderation(uuid, uuid, text, text, uuid, text, text, bigint, uuid)
from public, anon, authenticated;
grant execute on function public.gallery_commit_moderation(uuid, uuid, text, text, uuid, text, text, bigint, uuid)
to service_role;

create or replace function public.gallery_publishable_submissions(
  p_limit integer default 80,
  p_offset integer default 0
)
returns setof public.gallery_submissions
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Service role required.' using errcode = '42501';
  end if;

  return query
  select submission.*
  from public.gallery_submissions as submission
  join storage.objects as original_object
    on original_object.bucket_id = submission.storage_bucket
    and original_object.name = submission.storage_path
  join storage.objects as thumbnail_object
    on thumbnail_object.bucket_id = 'member-gallery'
    and thumbnail_object.name = submission.thumbnail_storage_path
  where submission.status = 'approved'
    and submission.thumbnail_revision_id is not null
    and submission.thumbnail_storage_path is not null
    and submission.thumbnail_mime_type = 'image/webp'
    and submission.thumbnail_size_bytes between 1 and 81920
    and submission.thumbnail_storage_path = (
      '_approved/thumbs/' || submission.id::text || '/' || submission.thumbnail_revision_id::text || '.webp'
    )
    and (case
      when coalesce(original_object.metadata ->> 'size', '') ~ '^[0-9]+$'
        then (original_object.metadata ->> 'size')::bigint
      else null
    end) = submission.size_bytes
    and lower(coalesce(original_object.metadata ->> 'mimetype', '')) = submission.mime_type
    and (case
      when coalesce(thumbnail_object.metadata ->> 'size', '') ~ '^[0-9]+$'
        then (thumbnail_object.metadata ->> 'size')::bigint
      else null
    end) = submission.thumbnail_size_bytes
    and lower(coalesce(thumbnail_object.metadata ->> 'mimetype', '')) = 'image/webp'
  order by submission.reviewed_at desc nulls last, submission.created_at desc, submission.id desc
  limit least(greatest(coalesce(p_limit, 80), 1), 80)
  offset least(greatest(coalesce(p_offset, 0), 0), 10000);
end;
$$;

revoke all on function public.gallery_publishable_submissions(integer, integer)
from public, anon, authenticated;
grant execute on function public.gallery_publishable_submissions(integer, integer)
to service_role;

alter table public.gallery_submissions
  validate constraint gallery_submissions_thumbnail_path_length;

alter table public.gallery_submissions
  validate constraint gallery_submissions_thumbnail_service_path_check;

alter table public.gallery_submissions
  validate constraint gallery_submissions_thumbnail_mime_type_check;

alter table public.gallery_submissions
  validate constraint gallery_submissions_thumbnail_size_bytes_check;

alter table public.gallery_submissions
  validate constraint gallery_submissions_thumbnail_complete_check;

alter table public.gallery_moderation_events
  validate constraint gallery_moderation_events_action_check;

comment on column public.gallery_submissions.thumbnail_revision_id is
  'Immutable service-owned thumbnail revision selected by atomic moderation.';

comment on column public.gallery_submissions.thumbnail_storage_path is
  'Private service-only Storage derivative used for bounded gallery-card delivery.';

comment on column public.gallery_submissions.thumbnail_mime_type is
  'Decoded thumbnail MIME type; currently image/webp only.';

comment on column public.gallery_submissions.thumbnail_size_bytes is
  'Decoded thumbnail size, capped at 80 KiB before approval.';
