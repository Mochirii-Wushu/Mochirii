-- Preserve the exact owner/shared-link read behavior while giving Postgres one
-- permissive SELECT policy to evaluate. This resolves the performance advisor's
-- multiple-permissive-policy warning without widening table grants or access.

drop policy if exists "Members can read their own profile links"
  on public.member_social_links;
drop policy if exists "Verified members can read shared profile links"
  on public.member_social_links;

create policy "Members can read permitted profile links"
on public.member_social_links
for select
to authenticated
using (
  (select auth.uid()) is not null
  and (
    (select auth.uid()) = user_id
    or (
      is_visible is true
      and private.member_has_gallery_upload_access((select auth.uid()))
      and private.member_has_gallery_upload_access(user_id)
    )
  )
);
