import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

const requiredIndexSnippets = [
  "gallery_submissions_user_id_idx",
  "gallery_submissions_reviewed_by_idx",
  "gallery_instagram_publish_jobs_queued_by_idx",
  "gallery_instagram_publish_jobs_published_by_idx",
  "gallery_instagram_publish_events_actor_id_idx",
  "member_profile_media_reviewed_by_idx",
  "member_profile_media_events_actor_id_idx",
  "member_verifications_reviewed_by_idx",
  "member_profiles_approved_avatar_media_id_idx",
  "member_profiles_approved_banner_media_id_idx",
  "discord_sync_log_resource_id_idx",
  "spotlight_poll_cycles_winner_profile_id_idx",
  "spotlight_poll_candidates_member_profile_id_idx",
  "spotlight_poll_results_member_profile_id_idx",
  "mochi_social_alpha_testers_invited_by_idx",
  "mochi_social_chain_operations_user_id_idx",
  "mochi_social_chat_messages_user_id_idx",
  "mochi_social_chat_reports_message_id_idx",
  "mochi_social_chat_reports_reporter_id_idx",
  "mochi_social_feedback_user_id_idx",
  "mochi_social_inventory_owner_id_idx",
  "mochi_social_ledger_events_actor_id_idx",
  "mochi_social_market_listings_inventory_id_idx",
  "mochi_social_market_listings_seller_id_idx",
  "mochi_social_spirits_owner_id_idx",
  "mochi_social_pets_owner_id_idx",
  "mochi_social_shared_pet_snapshots_last_actor_id_idx",
  "mochi_social_trades_recipient_id_idx",
  "mochi_social_trades_requester_id_idx",
];

const mochiSocialCompatibilitySnippets = [
  "table_name = 'mochi_social_spirits'",
  "table_name = 'mochi_social_pets'",
  "column_name = 'owner_id'",
  "create index if not exists mochi_social_spirits_owner_id_idx on public.mochi_social_spirits(owner_id)",
  "create index if not exists mochi_social_pets_owner_id_idx on public.mochi_social_pets(owner_id)",
  "create policy \"mochi_social_spirits_read_own\" on public.mochi_social_spirits",
  "create policy \"mochi_social_pets_read_own\" on public.mochi_social_pets",
  "table_name = 'mochi_social_progress_snapshots'",
  "create policy \"mochi_social_progress_read_own\" on public.mochi_social_progress_snapshots",
];

const serviceOnlyTables = [
  "discord_managed_permission_overwrites",
  "discord_resources",
  "discord_sync_log",
  "gallery_instagram_publish_events",
  "gallery_instagram_publish_jobs",
  "gallery_moderation_events",
  "member_auth_identities",
  "member_verifications",
  "spotlight_poll_candidates",
  "spotlight_poll_cycles",
  "spotlight_poll_results",
  "vote_confirmations",
  "vote_reminder_sends",
];

const socialAccountSnippets = [
  "create table if not exists public.social_accounts",
  "constraint social_accounts_visible_requires_active_check",
  "create unique index if not exists social_accounts_user_provider_key",
  "create unique index if not exists social_accounts_provider_subject_key",
  "create index if not exists social_accounts_visible_profile_idx",
  "grant select on table public.social_accounts to authenticated",
  "grant update (profile_link_visible) on table public.social_accounts to authenticated",
  "grant all on table public.social_accounts to service_role",
  "create policy \"Members can read their own social accounts\"",
  "create policy \"Members can update social account visibility\"",
  "on public.social_accounts",
  "using ((select auth.uid()) = user_id)",
  "with check ((select auth.uid()) = user_id)",
];

const protectedFunctions = [
  "verify-discord-member",
  "verify-member-access",
  "review-member-verification",
  "list-gallery-review-queue",
  "moderate-gallery-submission",
  "list-instagram-publish-queue",
  "publish-instagram-gallery-submission",
  "mark-instagram-gallery-submission-shared",
  "list-member-profiles",
  "get-member-profile",
  "submit-member-profile-media",
  "list-member-profile-media-queue",
  "moderate-member-profile-media",
  "submit-discord-gallery-image",
  "send-vote-reminder",
  "send-member-spotlight-poll",
  "publish-member-spotlight-winner",
];

const publicFunctions = [
  "list-approved-gallery-submissions",
  "list-visible-profile-cards",
  "get-current-spotlight-winner",
];

function read(rel) {
  const full = path.join(root, rel);
  if (!existsSync(full)) {
    failures.push(`${rel}: missing required file.`);
    return "";
  }
  return readFileSync(full, "utf8");
}

function assertIncludes(label, text, snippet) {
  if (!text.includes(snippet)) failures.push(`${label}: expected snippet not found: ${snippet}`);
}

const packageJson = read("package.json");
const checkAll = read("scripts/check-all.mjs");
const readme = read("supabase/README.md");
const corsHelper = read("supabase/functions/_shared/cors.ts");
const memberProfilesShared = read("supabase/functions/_shared/member-profiles.ts");
const spotlightPollsShared = read("supabase/functions/_shared/spotlight-polls.ts");
const pixelfedSocialSync = read("supabase/functions/sync-pixelfed-social-account/index.ts");
const securityReport = read("reports/supabase-security-performance-2026-06-18.md");
const migrationsDir = path.join(root, "supabase/migrations");
const migrationText = readdirSync(migrationsDir)
  .filter((file) => file.endsWith(".sql"))
  .sort()
  .map((file) => readFileSync(path.join(migrationsDir, file), "utf8"))
  .join("\n");

assertIncludes("package.json", packageJson, '"check:supabase-security-performance"');
assertIncludes("check-all", checkAll, "check:supabase-security-performance");

for (const snippet of requiredIndexSnippets) {
  assertIncludes("Supabase FK index migrations", migrationText, snippet);
}

for (const snippet of mochiSocialCompatibilitySnippets) {
  assertIncludes("Mochi Social table-aware compatibility migration", migrationText, snippet);
}

[
  "using ((select auth.uid()) = user_id)",
  "using ((select auth.uid()) = owner_id)",
  "with check ((select auth.uid()) = reporter_id)",
  "using ((select auth.role()) = 'authenticated' and expires_at > now())",
].forEach((snippet) => assertIncludes("Supabase optimized RLS migrations", migrationText, snippet));

for (const table of serviceOnlyTables) {
  assertIncludes("Supabase README service-only table allowlist", readme, `\`${table}\``);
}

for (const snippet of socialAccountSnippets) {
  assertIncludes("Pixelfed social account mapping migration", migrationText, snippet);
}

assertIncludes("Supabase README Pixelfed mapping docs", readme, "`social_accounts` maps a signed-in website member");

[
  "https://mochirii.com",
  "https://mochirii.vercel.app",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "host.endsWith(\".vercel.app\")",
  "Vary",
  "Origin",
].forEach((snippet) => assertIncludes("protected CORS helper", corsHelper, snippet));

for (const name of protectedFunctions) {
  const source = read(`supabase/functions/${name}/index.ts`);
  assertIncludes(`${name} CORS wrapper`, source, "withProtectedCors(req, handleRequest(req))");
  assertIncludes(`${name} request handler`, source, "async function handleRequest(req: Request): Promise<Response>");
}

for (const name of publicFunctions) {
  const source = read(`supabase/functions/${name}/index.ts`);
  if (source.includes("withProtectedCors")) {
    failures.push(`${name}: public-safe DTO endpoint must not use protected-origin CORS.`);
  }
}

assertIncludes("list-approved-gallery-submissions public CORS", read("supabase/functions/list-approved-gallery-submissions/index.ts"), "\"Access-Control-Allow-Origin\": \"*\"");
assertIncludes("member profile public card shared CORS", memberProfilesShared, "\"Access-Control-Allow-Origin\": \"*\"");
assertIncludes("spotlight public winner shared CORS", spotlightPollsShared, "\"Access-Control-Allow-Origin\": \"*\"");
[
  "PIXELFED_SOCIAL_SYNC_SECRET",
  "auth.admin.getUserById",
  ".from(\"social_accounts\")",
  "provider: \"pixelfed\"",
  "federation_enabled: false",
].forEach((snippet) => assertIncludes("Pixelfed social sync Edge Function", pixelfedSocialSync, snippet));

[
  "Supabase CLI 2.107.0",
  "Leaked password protection",
  "service-role-only",
  "Mochi Social",
  "deferred",
].forEach((snippet) => assertIncludes("Supabase security performance report", securityReport, snippet));

if (failures.length) {
  console.error("Supabase security/performance validation failed.");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Supabase security/performance validation OK.");
