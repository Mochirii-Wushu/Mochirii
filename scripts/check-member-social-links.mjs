import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];
const migrationDirectory = path.join(root, "supabase", "migrations");
const migrationName = "20260727144954_add_member_social_links.sql";

function read(relativePath) {
  const fullPath = path.join(root, relativePath);
  if (!existsSync(fullPath)) {
    failures.push(`${relativePath}: missing required profile-link file.`);
    return "";
  }
  return readFileSync(fullPath, "utf8");
}

function includes(label, source, snippet) {
  if (!source.includes(snippet)) failures.push(`${label}: expected snippet not found: ${snippet}`);
}

function excludes(label, source, snippet) {
  if (source.includes(snippet)) failures.push(`${label}: forbidden snippet found: ${snippet}`);
}

const migration = read(path.join("supabase", "migrations", migrationName));
const core = read("apps/web/lib/member-social-links/profile-links-core.ts");
const client = read("apps/web/lib/supabase/member-social-links.ts");
const component = read("apps/web/components/member-workflow/MemberSocialLinks.tsx");
const account = read("apps/web/components/member-workflow/AccountPanel.tsx");
const test = read("apps/web/lib/member-social-links/profile-links-core.test.mts");
const databaseTest = read("supabase/tests/member_social_links_test.sql");
const packageJson = read("package.json");
const checkAll = read("scripts/check-all.mjs");
const documentation = read("docs/member-profiles-and-rank-roles.md");

if (!existsSync(path.join(migrationDirectory, migrationName))) {
  failures.push("profile-link migration must retain its generated Supabase CLI filename.");
}

[
  "create table if not exists public.member_social_links",
  "alter table public.member_social_links enable row level security",
  "is_visible boolean not null default false",
  "private.member_social_link_url_is_valid",
  "member_social_links_user_url_key",
  "member_social_links_owner_order_idx",
  "member_social_links_visible_member_idx",
  "grant insert (user_id, provider, display_label, profile_url, sort_order, is_visible)",
  "create policy \"Members can read their own profile links\"",
  "create policy \"Verified members can read shared profile links\"",
  "private.member_has_gallery_upload_access((select auth.uid()))",
  "create policy \"Members can create their own profile links\"",
  "create policy \"Members can update their own profile links\"",
  "create policy \"Members can delete their own profile links\"",
].forEach((snippet) => includes("migration", migration, snippet));

[
  "instagram",
  "facebook",
  "tiktok",
  "twitch",
  "youtube",
  "x",
  "bluesky",
  "mastodon",
  "spotify",
  "linkedin",
  "custom",
  "url.username",
  "url.password",
  "url.port",
  "url.search",
  "url.hash",
  "isPublicProfileHostname",
].forEach((snippet) => includes("URL contract", core, snippet));

includes("client", client, '.from("member_social_links")');
includes("client", client, '.eq("user_id", userId)');
includes("client", client, '.eq("is_visible", true)');
includes("Account", account, "<MemberSocialLinks currentUserId={user.id} />");
includes("sharing", component, "navigator.share");
includes("copy fallback", component, "navigator.clipboard.writeText");
includes("safe external link", component, 'rel="noopener noreferrer nofollow ugc"');
includes("private default UI", component, "setShareWithGuild(false)");
includes("deletion UI", component, "Confirm removal");
includes("keyboard controls", component, 'type="button"');
includes("URL confusion tests", test, "instagram.com.evil.example");
includes("stored-XSS tests", test, "onerror=alert(1)");
includes("RLS database tests", databaseTest, "another verified member can read only explicitly shared links");
includes("package script", packageJson, '"check:member-social-links"');
includes("package test", packageJson, '"test:member-social-links"');
includes("root validation", checkAll, "check:member-social-links");
includes("feature documentation", documentation, "Optional Profile Links");

for (const source of [client, component]) {
  excludes("profile-link product code", source, "social_accounts");
  excludes("profile-link product code", source, "dangerouslySetInnerHTML");
  excludes("profile-link product code", source, "fetch(");
  excludes("profile-link product code", source, "access_token");
  excludes("profile-link product code", source, "refresh_token");
}

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log("Member social-link contracts passed.");
