import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

const files = {
  packageJson: "package.json",
  checkAll: "scripts/check-all.mjs",
  config: "supabase/config.toml",
  visibleProfileCards: "supabase/functions/list-visible-profile-cards/index.ts",
  migration: "supabase/migrations/20260608210000_add_member_profiles_and_media.sql",
  refinementMigration: "supabase/migrations/20260608233000_refine_member_profile_identity_media.sql",
  socialAccountsMigration: "supabase/migrations/20260702080720_add_pixelfed_social_accounts.sql",
  reaper: "supabase/functions/reaper-discord-interactions/index.ts",
  sharedMemberProfiles: "supabase/functions/_shared/member-profiles.ts",
  verifyDiscordMember: "supabase/functions/verify-discord-member/index.ts",
  appConfig: "apps/web/lib/supabase/config.ts",
  profileTypes: "apps/web/lib/supabase/types.ts",
  profileFormat: "apps/web/components/member-workflow/format.ts",
  accountPanel: "apps/web/components/member-workflow/AccountPanel.tsx",
  leaderDashboard: "apps/web/components/member-workflow/LeaderDashboard.tsx",
  memberProfilesClient: "apps/web/lib/supabase/member-profiles.ts",
  css: "apps/web/app/mochirii.css",
  supabaseReadme: "supabase/README.md",
  featureDoc: "docs/member-profiles-and-rank-roles.md",
};

const retiredFiles = [
  "apps/web/app/members/page.tsx",
  "apps/web/app/members/[slug]/page.tsx",
  "apps/web/components/member-workflow/MemberDirectory.tsx",
];

function read(file) {
  const fullPath = path.join(root, file);
  if (!existsSync(fullPath)) {
    failures.push(`${file}: missing required member/rank guard file.`);
    return "";
  }
  return readFileSync(fullPath, "utf8");
}

function assertIncludes(label, text, snippet) {
  if (!text.includes(snippet)) failures.push(`${label}: expected snippet not found: ${snippet}`);
}

function assertNotIncludes(label, text, snippet) {
  if (text.includes(snippet)) failures.push(`${label}: unexpected retired snippet found: ${snippet}`);
}

function assertMatches(label, text, pattern, message) {
  if (!pattern.test(text)) failures.push(`${label}: ${message}`);
}

const packageJson = read(files.packageJson);
const checkAll = read(files.checkAll);
const config = read(files.config);
const visibleProfileCards = read(files.visibleProfileCards);
const migration = read(files.migration);
const refinementMigration = read(files.refinementMigration);
const socialAccountsMigration = read(files.socialAccountsMigration);
const reaper = read(files.reaper);
const sharedMemberProfiles = read(files.sharedMemberProfiles);
const verifyDiscordMember = read(files.verifyDiscordMember);
const appConfig = read(files.appConfig);
const profileTypes = read(files.profileTypes);
const profileFormat = read(files.profileFormat);
const accountPanel = read(files.accountPanel);
const leaderDashboard = read(files.leaderDashboard);
const memberProfilesClient = read(files.memberProfilesClient);
const css = read(files.css);
const supabaseReadme = read(files.supabaseReadme);
const featureDoc = read(files.featureDoc);

assertIncludes("package.json", packageJson, '"check:member-profiles-and-ranks"');
assertIncludes("check-all", checkAll, "check:member-profiles-and-ranks");

for (const file of retiredFiles) {
  if (existsSync(path.join(root, file))) failures.push(`${file}: retired members route surface must stay removed.`);
}

[
  "[functions.list-member-profiles]",
  "[functions.list-visible-profile-cards]",
  "[functions.get-member-profile]",
  "[functions.submit-member-profile-media]",
  "[functions.list-member-profile-media-queue]",
  "[functions.moderate-member-profile-media]",
].forEach((snippet) => assertIncludes("supabase config", config, snippet));

[
  "profile_public_enabled",
  "member_profile_media",
  "member_profile_media_events",
  "alter table public.member_profile_media enable row level security",
  "create policy \"Members upload own profile media objects\"",
].forEach((snippet) => assertIncludes("profile migration", migration, snippet));

[
  "member_profiles_bio_length",
  "char_length(bio) <= 1000",
  "revoke update (discord_handle, avatar_url)",
  "member_profile_media_size_check",
  "size_bytes <= 52428800",
].forEach((snippet) => assertIncludes("profile refinement migration", refinementMigration, snippet));

[
  "profile_link_visible",
  "grant update (profile_link_visible) on table public.social_accounts to authenticated",
  "alter table public.social_accounts enable row level security",
].forEach((snippet) => assertIncludes("social accounts migration", socialAccountsMigration, snippet));

[
  "bio: { max: 1000 }",
].forEach((snippet) => assertIncludes("app profile config", appConfig, snippet));

[
  "MEMBER_PROFILE_MEDIA_BUCKET",
  "MAX_PROFILE_AVATAR_BYTES",
  "MAX_PROFILE_BANNER_BYTES",
].forEach((snippet) => assertNotIncludes("app profile config", appConfig, snippet));

assertMatches(
  "app profile config",
  appConfig,
  /SAFE_PROFILE_FIELDS\s*=\s*\{[\s\S]*display_name[\s\S]*game_uid[\s\S]*region[\s\S]*timezone[\s\S]*bio[\s\S]*\}\s*as const;/,
  "safe profile fields must stay limited to member-editable fields.",
);

assertMatches(
  "profile format",
  profileFormat,
  /editableProfileFields\s*=\s*\[[\s\S]*"display_name"[\s\S]*"game_uid"[\s\S]*"region"[\s\S]*"timezone"[\s\S]*"bio"[\s\S]*\]\s*as const;/,
  "editable profile form fields must stay limited to member-editable fields.",
);

[
  "const RANK_ROLES = [",
  "\"Guild Leader\"",
  "\"Rice Sprout\"",
  "permissions: \"0\"",
  "hoist: false",
  "mentionable: false",
  "\"sync-ranks\"",
  "mode === \"apply\" && !confirm",
  "discord_resources",
  "vanityOnly: true",
  "rankOrder: rank.order",
].forEach((snippet) => assertIncludes("reaper interactions", reaper, snippet));

[
  "discord_handle_readonly",
  "readOnly",
  "maxLength={1000}",
  "const SOCIAL_HOST = \"https://social.mochirii.com\"",
  "Open Mochirii Social",
].forEach((snippet) => assertIncludes("account panel", accountPanel, snippet));

[
  "Published Page",
  "View profile",
  "updateProfileVisibility",
  "uploadProfileMedia",
  "profile-media-upload",
  "Shown on profile",
  "Show link",
].forEach((snippet) => assertNotIncludes("account panel", accountPanel, snippet));

[
  "listGalleryReviewQueue",
  "moderateGallerySubmission",
  "reviewMemberVerification",
  "manageMochiSocialAlphaAdmin",
].forEach((snippet) => assertIncludes("leader dashboard", leaderDashboard, snippet));

[
  "listProfileMediaQueue",
  "moderateProfileMedia",
  "Avatar And Banner Review",
  "ProfileMediaCard",
].forEach((snippet) => assertNotIncludes("leader dashboard", leaderDashboard, snippet));

[
  "listVisibleProfileCards",
  "list-visible-profile-cards",
].forEach((snippet) => assertIncludes("member profile client", memberProfilesClient, snippet));

[
  "list-member-profiles",
  "get-member-profile",
  "submit-member-profile-media",
  "list-member-profile-media-queue",
  "moderate-member-profile-media",
].forEach((snippet) => assertNotIncludes("member profile client", memberProfilesClient, snippet));

[
  "gameUid?: string | null",
  "discordHandle?: string | null",
  "region?: string | null",
].forEach((snippet) => assertIncludes("profile types", profileTypes, snippet));

[
  "PROFILE_MEDIA_LIMITS",
  "recentVerification(profile.discord_verified_at)",
  "discordHandle",
  "gameUid",
  "region",
  "signedMediaUrl",
].forEach((snippet) => assertIncludes("shared member profiles", sharedMemberProfiles, snippet));

assertIncludes("verify discord member", verifyDiscordMember, "discord_handle: discordUsername || discordGlobalName");

[
  "CORS_HEADERS",
  "new Response(\"ok\", { headers: CORS_HEADERS })",
  "profile_public_enabled",
  "hasFilledPublicProfile",
  "titleFromRoles",
  "signedMediaUrl",
  "profileHref: \"\"",
].forEach((snippet) => assertIncludes("visible profile cards", visibleProfileCards, snippet));

assertNotIncludes("css", css, "MEMBER PROFILES");
assertNotIncludes("css", css, ".member-directory-grid");

[
  "member profile publishing is retired",
  "Mochirii Social",
  "shared backend identity data",
  "separate Supabase dependency audit",
].forEach((snippet) => assertIncludes("supabase README", supabaseReadme, snippet));

[
  "Retired Member Profile Surface",
  "Mochirii Social",
  "No Discord role mutation happens from CI",
].forEach((snippet) => assertIncludes("feature doc", featureDoc, snippet));

if (failures.length) {
  console.error("Member profile and rank role validation failed.");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Member profile and rank role validation OK.");
