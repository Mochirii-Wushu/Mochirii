import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

const files = {
  packageJson: "package.json",
  checkAll: "scripts/check-all.mjs",
  config: "supabase/config.toml",
  migration: "supabase/migrations/20260608210000_add_member_profiles_and_media.sql",
  reaper: "supabase/functions/reaper-discord-interactions/index.ts",
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
const migration = read(files.migration);
const reaper = read(files.reaper);
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
].forEach((snippet) => assertIncludes("account panel", accountPanel, snippet));

[
  "listProfileMediaQueue",
  "moderateProfileMedia",
  "Avatar And Banner Review",
  "ProfileMediaCard",
].forEach((snippet) => assertIncludes("leader dashboard", leaderDashboard, snippet));

[
  "list-member-profiles",
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
