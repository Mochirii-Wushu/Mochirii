BEGIN;
SELECT plan(17);

INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES
  ('11111111-1111-4111-8111-111111111111', 'authenticated', 'authenticated', 'profile-links-owner@example.invalid', '', now(), now(), now()),
  ('22222222-2222-4222-8222-222222222222', 'authenticated', 'authenticated', 'profile-links-viewer@example.invalid', '', now(), now(), now()),
  ('33333333-3333-4333-8333-333333333333', 'authenticated', 'authenticated', 'profile-links-outsider@example.invalid', '', now(), now(), now());

UPDATE public.member_profiles
SET member_status = 'active', has_required_discord_roles = true, discord_verified_at = now()
WHERE id IN (
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222'
);

SELECT has_table('public', 'member_social_links', 'member social links table exists');
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.member_social_links'::regclass),
  'RLS is enabled'
);
SELECT ok(
  NOT has_table_privilege('anon', 'public.member_social_links', 'select'),
  'anonymous clients have no table access'
);
SELECT ok(
  has_table_privilege('authenticated', 'public.member_social_links', 'select')
  AND has_any_column_privilege('authenticated', 'public.member_social_links', 'insert')
  AND has_any_column_privilege('authenticated', 'public.member_social_links', 'update')
  AND has_table_privilege('authenticated', 'public.member_social_links', 'delete'),
  'authenticated members receive only the required CRUD grants'
);
SELECT ok(
  has_table_privilege('service_role', 'public.member_social_links', 'select')
  AND has_table_privilege('service_role', 'public.member_social_links', 'insert')
  AND has_table_privilege('service_role', 'public.member_social_links', 'update')
  AND has_table_privilege('service_role', 'public.member_social_links', 'delete'),
  'service role retains operational access'
);
SELECT ok(
  private.member_social_link_url_is_valid('instagram', 'https://instagram.com/mochirii')
  AND private.member_social_link_url_is_valid('custom', 'https://mochirii.com/twills'),
  'direct HTTPS profile URLs pass validation'
);
SELECT ok(
  NOT private.member_social_link_url_is_valid('instagram', 'https://instagram.com.evil.example/mochirii')
  AND NOT private.member_social_link_url_is_valid('custom', 'https://localhost/profile')
  AND NOT private.member_social_link_url_is_valid('custom', 'https://name:secret@example.com/profile'),
  'hostname confusion, local hosts, and embedded credentials fail validation'
);
SELECT is(
  (SELECT count(*)::integer FROM pg_policies WHERE schemaname = 'public' AND tablename = 'member_social_links'),
  5,
  'five explicit RLS policies protect the table'
);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);

SELECT lives_ok(
  $$INSERT INTO public.member_social_links (user_id, provider, display_label, profile_url, sort_order)
    VALUES ('11111111-1111-4111-8111-111111111111', 'instagram', 'Instagram', 'https://instagram.com/mochirii', 0)$$,
  'owners can add a private link'
);
SELECT lives_ok(
  $$INSERT INTO public.member_social_links (user_id, provider, display_label, profile_url, sort_order, is_visible)
    VALUES ('11111111-1111-4111-8111-111111111111', 'custom', 'Portfolio', 'https://mochirii.com/twills', 1, true)$$,
  'verified owners can opt a link into guild visibility'
);
SELECT is(
  (SELECT count(*)::integer FROM public.member_social_links),
  2,
  'owners can read all of their own links'
);

SELECT set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
SELECT is(
  (SELECT count(*)::integer FROM public.member_social_links),
  1,
  'another verified member can read only explicitly shared links'
);
SELECT is_empty(
  $$DELETE FROM public.member_social_links
    WHERE user_id = '11111111-1111-4111-8111-111111111111'
    RETURNING id$$,
  'another member cannot delete owner links'
);

SELECT set_config('request.jwt.claim.sub', '33333333-3333-4333-8333-333333333333', true);
SELECT is(
  (SELECT count(*)::integer FROM public.member_social_links),
  0,
  'an unverified signed-in account cannot read shared links'
);
SELECT throws_ok(
  $$INSERT INTO public.member_social_links (user_id, provider, display_label, profile_url, sort_order, is_visible)
    VALUES ('33333333-3333-4333-8333-333333333333', 'custom', 'Portfolio', 'https://example.org/profile', 0, true)$$,
  '42501',
  null,
  'an unverified owner cannot publish a visible link'
);

SELECT set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
SELECT lives_ok(
  $$DELETE FROM public.member_social_links WHERE profile_url = 'https://instagram.com/mochirii'$$,
  'owners can delete their own links'
);
SELECT is(
  (SELECT count(*)::integer FROM public.member_social_links),
  1,
  'deletion removes only the selected owner link'
);

RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
