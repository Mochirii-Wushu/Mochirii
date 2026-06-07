import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const root = process.cwd();

const files = {
  packageJson: "package.json",
  checkAll: "scripts/check-all.mjs",
  config: "supabase/config.toml",
  migration: "supabase/migrations/20260607094500_add_instagram_gallery_publishing.sql",
  discordIngest: "supabase/functions/submit-discord-gallery-image/index.ts",
  moderation: "supabase/functions/moderate-gallery-submission/index.ts",
  listQueue: "supabase/functions/list-instagram-publish-queue/index.ts",
  publish: "supabase/functions/publish-instagram-gallery-submission/index.ts",
  envExample: "supabase/functions/.env.example",
  supabaseReadme: "supabase/README.md",
  moderationRunbook: "docs/member-gallery-moderation-runbook.md",
  deploymentRunbook: "docs/instagram-gallery-publishing-deployment-runbook.md",
  nextSubmit: "apps/web/components/member-workflow/GallerySubmitForm.tsx",
  nextDashboard: "apps/web/components/member-workflow/LeaderDashboard.tsx",
  nextHelpers: "apps/web/lib/supabase/moderation.ts",
  nextUploads: "apps/web/lib/supabase/gallery-submissions.ts",
  staticHelper: "supabase.js",
  staticSubmitHtml: "gallery-submit.html",
  staticSubmitJs: "gallery-submit.js",
  staticDashboardHtml: "leader-dashboard.html",
  staticDashboardJs: "leader-dashboard.js",
};

const failures = [];

function read(file) {
  const fullPath = path.join(root, file);
  if (!existsSync(fullPath)) {
    failures.push(`${file}: missing Instagram gallery publishing file.`);
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

function assertNotMatches(label, text, pattern, message) {
  if (pattern.test(text)) failures.push(`${label}: ${message}`);
}

function walkFiles(dir, results = []) {
  const full = path.join(root, dir);
  if (!existsSync(full)) return results;
  for (const entry of readdirSync(full)) {
    const child = path.join(full, entry);
    const stat = statSync(child);
    if (stat.isDirectory()) {
      if ([".next", "node_modules"].includes(entry)) continue;
      walkFiles(path.relative(root, child), results);
    } else {
      results.push(path.relative(root, child).replaceAll("\\", "/"));
    }
  }
  return results;
}

const packageJson = read(files.packageJson);
const checkAll = read(files.checkAll);
const config = read(files.config);
const migration = read(files.migration);
const discordIngest = read(files.discordIngest);
const moderation = read(files.moderation);
const listQueue = read(files.listQueue);
const publish = read(files.publish);
const envExample = read(files.envExample);
const supabaseReadme = read(files.supabaseReadme);
const moderationRunbook = read(files.moderationRunbook);
const deploymentRunbook = read(files.deploymentRunbook);
const nextSubmit = read(files.nextSubmit);
const nextDashboard = read(files.nextDashboard);
const nextHelpers = read(files.nextHelpers);
const nextUploads = read(files.nextUploads);
const staticHelper = read(files.staticHelper);
const staticSubmitHtml = read(files.staticSubmitHtml);
const staticSubmitJs = read(files.staticSubmitJs);
const staticDashboardHtml = read(files.staticDashboardHtml);
const staticDashboardJs = read(files.staticDashboardJs);

assertIncludes("package.json", packageJson, '"check:instagram-gallery-publishing"');
assertIncludes("check-all", checkAll, "check:instagram-gallery-publishing");

[
  "[functions.list-instagram-publish-queue]",
  "[functions.publish-instagram-gallery-submission]",
  'verify_jwt = true',
  'entrypoint = "./functions/list-instagram-publish-queue/index.ts"',
  'entrypoint = "./functions/publish-instagram-gallery-submission/index.ts"',
].forEach((snippet) => assertIncludes("supabase config", config, snippet));

[
  "add column if not exists instagram_opt_in boolean not null default false",
  "add column if not exists instagram_opt_in_at timestamptz",
  "add column if not exists instagram_opt_in_source text",
  "add column if not exists instagram_opt_in_copy_version text",
  "gallery_submissions_instagram_opt_in_source_check",
  "gallery_submissions_instagram_opt_in_consistency",
  "create table if not exists public.gallery_instagram_publish_jobs",
  "create table if not exists public.gallery_instagram_publish_events",
  "status in ('queued', 'ineligible', 'publishing', 'published', 'failed', 'canceled')",
  "action in ('queued', 'ineligible', 'publishing', 'published', 'failed', 'retry', 'canceled')",
  "grant all on table public.gallery_instagram_publish_jobs to service_role",
  "grant all on table public.gallery_instagram_publish_events to service_role",
].forEach((snippet) => assertIncludes("migration", migration, snippet));

assertMatches(
  "migration",
  migration,
  /instagram_opt_in\s+(?:=|is)\s+false[\s\S]*instagram_opt_in_at is null[\s\S]*instagram_opt_in\s+(?:=|is)\s+true[\s\S]*instagram_opt_in_at is not null/,
  "consent fields must be internally consistent and non-retroactive.",
);

[
  "instagramOptIn",
  "INSTAGRAM_OPT_IN_COPY_VERSION",
  'instagram_opt_in_source: instagramOptIn ? "discord_slash_command" : null',
  ".eq(\"discord_message_id\", messageId)",
  ".eq(\"discord_attachment_id\", attachmentId)",
].forEach((snippet) => assertIncludes("submit-discord-gallery-image", discordIngest, snippet));

assertNotMatches(
  "submit-discord-gallery-image",
  discordIngest,
  /update\(\{[\s\S]*instagram_opt_in/,
  "duplicate Discord submissions must not update stored Instagram consent.",
);

[
  "gallery_instagram_publish_jobs",
  "gallery_instagram_publish_events",
  'new Set(["image/jpeg"])',
  "ineligible",
  "buildInstagramCaption",
  "buildInstagramAltText",
].forEach((snippet) => assertIncludes("moderate-gallery-submission", moderation, snippet));

[
  "requireModeratorAccess(req)",
  "gallery_instagram_publish_jobs",
  "gallery_instagram_publish_events",
  "createSignedUrl",
  "signedPreviewUrl",
  "instagramOptIn",
].forEach((snippet) => assertIncludes("list-instagram-publish-queue", listQueue, snippet));

[
  "requireModeratorAccess(req)",
  "INSTAGRAM_ACCOUNT_ID",
  "INSTAGRAM_ACCESS_TOKEN",
  "INSTAGRAM_API_VERSION",
  "INSTAGRAM_API_BASE_URL",
  "confirmPublish",
  "createSignedUrl",
  "/media",
  "/media_publish",
  "access_token: instagram.accessToken",
  "signedData.signedUrl",
  "status: \"published\"",
].forEach((snippet) => assertIncludes("publish-instagram-gallery-submission", publish, snippet));

assertNotMatches(
  "publish-instagram-gallery-submission",
  publish,
  /console\.(log|error|warn)\([^)]*(accessToken|signedUrl|INSTAGRAM_ACCESS_TOKEN)/,
  "publishing function must not log Instagram tokens or signed URLs.",
);

[
  "DISCORD_GALLERY_CHANNEL_ID=1508077313965817856",
  "DISCORD_GALLERY_INGEST_SECRET=",
  "INSTAGRAM_ACCOUNT_ID=",
  "INSTAGRAM_ACCESS_TOKEN=",
  "INSTAGRAM_API_VERSION=",
].forEach((snippet) => assertIncludes("supabase functions .env.example", envExample, snippet));

[
  "share_to_instagram",
  "instagramOptIn",
  "list-instagram-publish-queue",
  "publish-instagram-gallery-submission",
  "Instagram credentials live only in Supabase secrets",
  "no automatic Instagram publishing",
].forEach((snippet) => assertIncludes("supabase README", supabaseReadme, snippet));

[
  "Instagram Queue",
  "final confirmation",
  "signed preview URLs",
  "supabase secrets set",
].forEach((snippet) => assertIncludes("moderation runbook", moderationRunbook, snippet));

[
  "Tracking PR: <https://github.com/Mochirii-Wushu/Mochirii/pull/198>",
  "/submit image:<file> title:<title> subtitle:<subtitle> share_to_instagram:<true|false>",
  "No real Instagram post may be created without explicit action-time owner approval.",
  "DISCORD_GALLERY_CHANNEL_ID",
  "INSTAGRAM_ACCOUNT_ID",
  "INSTAGRAM_ACCESS_TOKEN",
  "supabase functions deploy list-instagram-publish-queue",
  "supabase functions deploy publish-instagram-gallery-submission",
  "\"instagramOptIn\": true",
  "wrong channel fail-closed",
  "duplicate Discord message/attachment does not change stored consent",
  "Rollback options",
].forEach((snippet) => assertIncludes("Instagram deployment runbook", deploymentRunbook, snippet));

[
  "instagramOptIn",
  "Allow Mōchirīī to share this image on our official Instagram if approved.",
  "form-check",
].forEach((snippet) => assertIncludes("Next upload form", nextSubmit, snippet));

[
  "Instagram Queue",
  "publishInstagramGallerySubmission",
  "window.confirm",
  "Instagram caption",
  "Instagram alt text",
].forEach((snippet) => assertIncludes("Next leader dashboard", nextDashboard, snippet));

[
  "listInstagramPublishQueue",
  "publishInstagramGallerySubmission",
  "list-instagram-publish-queue",
  "publish-instagram-gallery-submission",
].forEach((snippet) => assertIncludes("Next moderation helpers", nextHelpers, snippet));

[
  "INSTAGRAM_WEBSITE_OPT_IN_COPY_VERSION",
  "instagram_opt_in_source",
  "instagram_opt_in_copy_version",
].forEach((snippet) => assertIncludes("Next upload helper", nextUploads, snippet));

[
  "listInstagramPublishQueue",
  "publishInstagramGallerySubmission",
  "INSTAGRAM_WEBSITE_OPT_IN_COPY_VERSION",
].forEach((snippet) => assertIncludes("static Supabase helper", staticHelper, snippet));

[
  "instagramOptIn",
  "Allow Mōchirīī to share this image on our official Instagram if approved.",
].forEach((snippet) => assertIncludes("static upload form", staticSubmitHtml, snippet));

assertIncludes("static upload script", staticSubmitJs, "instagramOptIn: data.get(\"instagramOptIn\") === \"true\"");
assertIncludes("static leader dashboard", staticDashboardHtml, "instagramQueuePanel");
assertIncludes("static leader dashboard", staticDashboardJs, "publishInstagramGallerySubmission");
assertIncludes("static leader dashboard", staticDashboardJs, "window.confirm");

const browserFiles = [
  ...walkFiles("apps/web").filter((file) => /\.(?:css|js|jsx|ts|tsx|html)$/i.test(file)),
  "supabase.js",
  "gallery-submit.js",
  "leader-dashboard.js",
  "gallery-submit.html",
  "leader-dashboard.html",
];

for (const file of browserFiles) {
  const source = readFileSync(path.join(root, file), "utf8");
  assertNotMatches(
    file,
    source,
    /INSTAGRAM_ACCESS_TOKEN|INSTAGRAM_ACCOUNT_ID|INSTAGRAM_API_BASE_URL|INSTAGRAM_API_VERSION/,
    "Instagram server credentials must not appear in browser/Vercel code.",
  );
}

if (failures.length) {
  console.error("Instagram gallery publishing validation failed.");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Instagram gallery publishing validation OK.");
