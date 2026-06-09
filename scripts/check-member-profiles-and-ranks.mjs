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
  reaper: "supabase/functions/reaper-discord-interactions/index.ts",
  sharedMemberProfiles: "supabase/functions/_shared/member-profiles.ts",
  verifyDiscordMember: "supabase/functions/verify-discord-member/index.ts",
  appConfig: "apps/web/lib/supabase/config.ts",
  profileTypes: "apps/web/lib/supabase/types.ts",
  profileFormat: "apps/web/components/member-workflow/format.ts",
  accountPanel: "apps/web/components/member-workflow/AccountPanel.tsx",
  leaderDashboard: "apps/web/components/member-workflow/LeaderDashboard.tsx",
  memberProfilesClient: "apps/web/lib/supabase/member-profiles.ts",
  memberDirectory: "apps/web/components/member-workflow/MemberDirectory.tsx",
  membersPage: "apps/web/app/members/page.tsx",
  memberProfilePage: "apps/web/app/members/[slug]/page.tsx",
  profileDisplay: "apps/web/components/public-pages/ProfileDisplay.tsx",
  css: "apps/web/app/mochirii.css",
  supabaseReadme: "supabase/README.md",
  featureDoc: "docs/member-profiles-and-rank-roles.md",
};

function read(file) {
  const fullPath = path.join(root, file);
  if (!existsSync(fullPath)) {
    failures.push(`${file}: missing required member profiles/rank roles file.`);
    return "";
  }
  return readFileSync(fullPath, "utf8");
}

function assertIncludes(label, text, snippet) {
  if (!text.includes(snippet)) failures.push(`${label}: expected snippet not found: ${snippet}`);
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
const reaper = read(files.reaper);
const sharedMemberProfiles = read(files.sharedMemberProfiles);
const verifyDiscordMember = read(files.verifyDiscordMember);
const appConfig = read(files.appConfig);
const profileTypes = read(files.profileTypes);
const profileFormat = read(files.profileFormat);
const accountPanel = read(files.accountPanel);
const leaderDashboard = read(files.leaderDashboard);
const memberProfilesClient = read(files.memberProfilesClient);
const memberDirectory = read(files.memberDirectory);
const membersPage = read(files.membersPage);
const memberProfilePage = read(files.memberProfilePage);
const profileDisplay = read(files.profileDisplay);
const css = read(files.css);
const supabaseReadme = read(files.supabaseReadme);
const featureDoc = read(files.featureDoc);

assertIncludes("package.json", packageJson, '"check:member-profiles-and-ranks"');
assertIncludes("check-all", checkAll, "check:member-profiles-and-ranks");

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
  "member-profile-media",
  "alter table public.member_profile_media enable row level security",
  "create policy \"Members upload own profile media objects\"",
  "grant update (profile_public_enabled)",
].forEach((snippet) => assertIncludes("profile migration", migration, snippet));

[
  "member_profiles_bio_length",
  "char_length(bio) <= 1000",
  "revoke update (discord_handle, avatar_url)",
  "display_name",
  "profile_public_enabled",
  "member_profile_media_size_check",
  "size_bytes <= 52428800",
  "file_size_limit",
  "52428800",
].forEach((snippet) => assertIncludes("profile refinement migration", refinementMigration, snippet));

[
  "MAX_PROFILE_AVATAR_BYTES = 50 * 1024 * 1024",
  "MAX_PROFILE_BANNER_BYTES = 50 * 1024 * 1024",
  "bio: { max: 1000 }",
].forEach((snippet) => assertIncludes("app profile config", appConfig, snippet));

assertMatches(
  "app profile config",
  appConfig,
  /SAFE_PROFILE_FIELDS\s*=\s*\{[\s\S]*display_name[\s\S]*game_uid[\s\S]*region[\s\S]*timezone[\s\S]*bio[\s\S]*\}\s*as const;/,
  "safe profile fields must stay limited to member-editable fields.",
);

assertMatches(
  "app profile config",
  appConfig,
  /SAFE_PROFILE_FIELDS\s*=\s*\{(?:(?!discord_handle|avatar_url)[\s\S])*\}\s*as const;/,
  "discord_handle and avatar_url must not be browser-editable safe profile fields.",
);

assertMatches(
  "profile format",
  profileFormat,
  /editableProfileFields\s*=\s*\[[\s\S]*"display_name"[\s\S]*"game_uid"[\s\S]*"region"[\s\S]*"timezone"[\s\S]*"bio"[\s\S]*\]\s*as const;/,
  "editable profile form fields must stay limited to member-editable fields.",
);

assertMatches(
  "profile format",
  profileFormat,
  /editableProfileFields\s*=\s*\[(?:(?!"discord_handle"|"avatar_url")[\s\S])*\]\s*as const;/,
  "discord_handle and avatar_url must not appear in editableProfileFields.",
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

assertMatches(
  "reaper interactions",
  reaper,
  /RANK_ROLES\s*=\s*\[[\s\S]*\];/,
  "rank roles must stay in one explicit source list.",
);

[
  "updateProfileVisibility",
  "uploadProfileMedia",
  "profile_public_enabled",
  "View profile",
  "discord_handle_readonly",
  "readOnly",
  "maxLength={1000}",
].forEach((snippet) => assertIncludes("account panel", accountPanel, snippet));

[
  "gameUid?: string | null",
  "discordHandle?: string | null",
  "region?: string | null",
].forEach((snippet) => assertIncludes("profile types", profileTypes, snippet));

[
  "PROFILE_MEDIA_LIMITS",
  "avatar: 50 * 1024 * 1024",
  "banner: 50 * 1024 * 1024",
  "recentVerification(profile.discord_verified_at)",
  "discordHandle",
  "gameUid",
  "region",
  "signedMediaUrl",
].forEach((snippet) => assertIncludes("shared member profiles", sharedMemberProfiles, snippet));

assertIncludes("verify discord member", verifyDiscordMember, "discord_handle: discordUsername || discordGlobalName");

[
  "listProfileMediaQueue",
  "moderateProfileMedia",
  "Avatar And Banner Review",
  "ProfileMediaCard",
].forEach((snippet) => assertIncludes("leader dashboard", leaderDashboard, snippet));

[
  "list-member-profiles",
  "list-visible-profile-cards",
  "get-member-profile",
  "submit-member-profile-media",
  "member_profile_media",
].forEach((snippet) => assertIncludes("member profile client", memberProfilesClient, snippet));

[
  "MembersDirectory",
  "MemberProfileView",
  "ProfileDisplay",
  "requireAuth",
].forEach((snippet) => assertIncludes("member directory", memberDirectory, snippet));

assertIncludes("members page", membersPage, "robots");
assertIncludes("members page", membersPage, "index: false");
assertIncludes("member profile page", memberProfilePage, "index: false");
assertIncludes("profile display", profileDisplay, "ProfileDisplay");
assertIncludes("css", css, "MEMBER PROFILES");
assertIncludes("css", css, ".member-directory-grid");

[
  "Member Profiles",
  "member-profile-media",
  "list-member-profiles",
  "moderate-member-profile-media",
  "/sync-ranks",
].forEach((snippet) => assertIncludes("supabase README", supabaseReadme, snippet));

[
  "profile_public_enabled",
  "hasFilledPublicProfile",
  "titleFromRoles",
  "signedMediaUrl",
  "profileHref",
].forEach((snippet) => assertIncludes("visible profile cards", visibleProfileCards, snippet));

[
  "Discord rank roles are vanity-only",
  "Profiles are members-only",
  "Profile media requires moderator approval",
  "No Discord role mutation happens from CI",
].forEach((snippet) => assertIncludes("feature doc", featureDoc, snippet));

if (failures.length) {
  console.error("Member profile and rank role validation failed.");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Member profile and rank role validation OK.");
