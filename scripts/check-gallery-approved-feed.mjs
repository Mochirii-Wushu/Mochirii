import { readFileSync } from "node:fs";

const failures = [];

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function assertIncludes(label, text, snippet) {
  if (!text.includes(snippet)) failures.push(`${label}: expected snippet not found: ${snippet}`);
}

const galleryBrowser = read("apps/web/components/public-pages/GalleryBrowser.tsx");
const gallerySubmissions = read("apps/web/lib/supabase/gallery-submissions.ts");
const runbook = read("docs/vote-reminder-runbook.md");

[
  'import { listApprovedGallerySubmissions } from "@/lib/supabase/gallery-submissions";',
  'const memberSubmissionsCategory = "member-submissions";',
  "function approvedSubmissionToGalleryItem",
  "submission.signed_url",
  "submission.preview_error",
  "galleryAddedAt: text(submission.created_at || submission.reviewed_at)",
  "listApprovedGallerySubmissions()",
  "setApprovedItems",
  "[...items, ...approvedItems]",
].forEach((snippet) => assertIncludes("GalleryBrowser approved feed", galleryBrowser, snippet));

[
  "function publicApprovedGalleryFeedUrl",
  "SUPABASE_PROJECT_REF",
  "list-approved-gallery-submissions",
  "method: \"POST\"",
  "Approved gallery feed could not be loaded.",
].forEach((snippet) => assertIncludes("gallery submissions public feed", gallerySubmissions, snippet));

[
  "RandomNumberGenerator]::Create()",
  "$Rng.GetBytes($Bytes)",
  "require('node:crypto').randomBytes",
  "DISCORD_VOTE_LINKS_JSON",
  "Do not paste real vote links into chat, PR text, screenshots, logs, or committed files.",
].forEach((snippet) => assertIncludes("vote reminder runbook", runbook, snippet));

if (failures.length) {
  console.error("Gallery approved feed validation failed.");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Gallery approved feed validation OK.");
