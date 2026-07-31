import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import {
  APPROVED_FOOTER_DESCRIPTION,
  APPROVED_HOME_SUBTITLE,
  EXPECTED_EXACT_GAME_NAME_COUNT,
  EXPECTED_PUBLIC_JSON_FILES,
  TARGETED_PUBLIC_PAGE_SHELL_FILES,
  discoverPublicJsonFiles,
  formatPolicyIssue,
  scanEditorialText,
  scanExactGameName,
  scanJsonExactGameName,
  stripStylingTokens,
  walkJsonStrings,
} from "./lib/public-guild-copy-policy.mjs";

const root = process.cwd();
const failures = [];
const brandAccents = [
  { label: "Wushu land", pattern: /\bWushu land\b/giu, minimum: 1, maximum: 3 },
  { label: "pretty", pattern: /\bpretty\b/giu, minimum: 1, maximum: 6 },
  { label: "cupcake", pattern: /\bcupcakes?\b/giu, minimum: 1, maximum: 5 },
];
const focusChecks = [
  { label: "recruitment", pattern: /\brecruit(?:ment|ing|s)?\b/giu },
  { label: "events", pattern: /\bevents?\b/giu },
  { label: "builds", pattern: /\bbuilds?\b/giu },
  { label: "guides", pattern: /\bguides?\b/giu },
  { label: "progression", pattern: /\bprogression\b/giu },
  { label: "member activity or support", pattern: /\b(?:member\s+(?:activity|support|progression|showcases?)|event\s+participation)\b/giu },
];
const sharedSocialCaption = "A pretty gameplay showcase from Mōchirīī.";
const canonicalPublicJsonFiles = [
  "apps/web/public/data/recruitment.json",
  "apps/web/public/data/spotify.json",
  "apps/web/public/data/spotlight.json",
  "apps/web/public/data/tome.json",
  "apps/web/public/data/twills.json",
];
const sharedSocialCaptionSources = [
  "apps/web/components/member-workflow/FacebookPagePublishQueue.tsx",
  "apps/web/components/member-workflow/LeaderDashboard.tsx",
];
const canonicalPublicCopy = [];
let exactGameNameCount = 0;

function filesUnder(relativeDirectory, extensions) {
  const directory = path.join(root, relativeDirectory);
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return filesUnder(path.relative(root, absolute), extensions);
    return extensions.has(path.extname(entry.name)) ? [absolute] : [];
  });
}

function checkText(relative, location, value, { canonical = false } = {}) {
  if (canonical) canonicalPublicCopy.push(value);
  failures.push(...scanEditorialText(relative, location, value).map(formatPolicyIssue));
}

function checkExactGameName(relative, location, value) {
  const result = scanExactGameName(relative, location, value);
  exactGameNameCount += result.count;
  failures.push(...result.issues.map(formatPolicyIssue));
}

function checkJsonValue(relative, value, pointer = "$") {
  walkJsonStrings(value, (text, location) => checkText(relative, location, text, { canonical: true }), pointer);
}

const publicJsonFiles = discoverPublicJsonFiles(root);
if (JSON.stringify(publicJsonFiles) !== JSON.stringify(EXPECTED_PUBLIC_JSON_FILES)) {
  failures.push(`public JSON inventory changed; review and update the exact contract: ${JSON.stringify(publicJsonFiles)}.`);
}

for (const relativePath of canonicalPublicJsonFiles) {
  const absolute = path.join(root, relativePath);
  const relative = path.relative(root, absolute).replaceAll("\\", "/");
  checkJsonValue(relative, JSON.parse(readFileSync(absolute, "utf8")));
}

for (const relative of publicJsonFiles) {
  const result = scanJsonExactGameName(relative, JSON.parse(readFileSync(path.join(root, relative), "utf8")));
  exactGameNameCount += result.count;
  failures.push(...result.issues.map(formatPolicyIssue));
}

const directSourceFiles = [
  "apps/web/components/SiteFooter.tsx",
  "apps/web/components/member-workflow/FacebookPagePublishQueue.tsx",
  "apps/web/components/member-workflow/GallerySubmitForm.tsx",
  "apps/web/components/member-workflow/LeaderDashboard.tsx",
  ...TARGETED_PUBLIC_PAGE_SHELL_FILES,
  "apps/web/components/public-pages/metadata.ts",
  "supabase/functions/_shared/facebook-page-publishing.ts",
  "supabase/functions/_shared/instagram-publishing.ts",
  "supabase/functions/publish-facebook-page-gallery-submission/index.ts",
  "supabase/functions/publish-instagram-gallery-submission/index.ts",
];
const memberFacingBrandSourceFiles = [
  "supabase/functions/_shared/gallery-moderation.ts",
  "supabase/functions/_shared/member-verification-identity.ts",
  "supabase/functions/_shared/spotlight-polls.ts",
  "supabase/functions/list-facebook-page-publish-queue/index.ts",
  "supabase/functions/list-gallery-review-queue/index.ts",
  "supabase/functions/list-instagram-publish-queue/index.ts",
  "supabase/functions/manage-raffle-entry/index.ts",
  "supabase/functions/reaper-discord-interactions/index.ts",
  "supabase/functions/submit-discord-gallery-image/index.ts",
];
const discordWebsiteLabelSourceFiles = [
  "supabase/functions/reaper-discord-interactions/index.ts",
  "supabase/functions/submit-discord-gallery-image/index.ts",
];

const sourceFiles = directSourceFiles.map((relative) => path.join(root, relative));
const sourceText = new Map();

for (const absolute of sourceFiles) {
  const relative = path.relative(root, absolute).replaceAll("\\", "/");
  const source = readFileSync(absolute, "utf8");
  sourceText.set(relative, source);
  source.split(/\r?\n/u).forEach((line, index) => {
    const withoutStylingTokens = stripStylingTokens(line);
    checkText(relative, index + 1, withoutStylingTokens);
  });
}

const exactGameNameSourceFiles = [
  "apps/web/components/SiteFooter.tsx",
  "apps/web/components/SiteHeader.tsx",
  "apps/web/components/public-pages/metadata.ts",
  "apps/web/lib/site-metadata.ts",
  ...filesUnder("apps/web/components/site-header", new Set([".tsx"]))
    .map((absolute) => path.relative(root, absolute).replaceAll("\\", "/"))
    .sort(),
];
for (const relative of exactGameNameSourceFiles) {
  readFileSync(path.join(root, relative), "utf8")
    .split(/\r?\n/u)
    .forEach((line, index) => checkExactGameName(relative, index + 1, line));
}

for (const relative of sharedSocialCaptionSources) {
  if (!sourceText.get(relative)?.includes(sharedSocialCaption)) {
    failures.push(`${relative}: missing the reviewed shared social caption ${JSON.stringify(sharedSocialCaption)}.`);
  }
}

const reviewedPublicCopyText = [
  ...canonicalPublicCopy,
  ...sourceText.values(),
].join("\n");
if (/https?:\/\/(?:www\.)?mochirii\.com\b|\bwww\.mochirii\.com\b/iu.test(reviewedPublicCopyText)) {
  failures.push("public website display must be exactly mochirii.com without a scheme or www prefix.");
}
if (!reviewedPublicCopyText.includes("mochirii.com")) {
  failures.push("reviewed public copy must display the website exactly as mochirii.com.");
}

const socialPublicationSources = [
  sourceText.get("supabase/functions/_shared/facebook-page-publishing.ts") || "",
  sourceText.get("supabase/functions/_shared/instagram-publishing.ts") || "",
  sourceText.get("supabase/functions/publish-facebook-page-gallery-submission/index.ts") || "",
  sourceText.get("supabase/functions/publish-instagram-gallery-submission/index.ts") || "",
  sourceText.get("apps/web/components/member-workflow/FacebookPagePublishQueue.tsx") || "",
  sourceText.get("apps/web/components/member-workflow/LeaderDashboard.tsx") || "",
].join("\n");
if (/mochirii\.com/iu.test(socialPublicationSources)) {
  failures.push("Instagram and Facebook publication copy must not contain or link mochirii.com.");
}

for (const relative of memberFacingBrandSourceFiles) {
  const source = readFileSync(path.join(root, relative), "utf8");
  source.split(/\r?\n/u).forEach((line, index) => {
    const hasUnaccentedPublicBrand = /\bMochirii\b|\bMochi\b/u.test(line);
    const isReviewedTechnicalIdentifier = /Mochirii-Reaper-/u.test(line);
    if (hasUnaccentedPublicBrand && !isReviewedTechnicalIdentifier) {
      failures.push(`${relative}:${index + 1}: member-facing brand text must use Mōchirīī or Mōchī.`);
    }
  });
}

for (const relative of discordWebsiteLabelSourceFiles) {
  const source = readFileSync(path.join(root, relative), "utf8");
  const reviewedAccountLink = "[mochirii.com](https://mochirii.com/account)";
  if (!source.includes(reviewedAccountLink)) {
    failures.push(`${relative}: Discord account guidance must display mochirii.com while linking to the account destination.`);
  }

  const visibleCopy = source.replaceAll(reviewedAccountLink, "mochirii.com");
  const displayedSiteValues = visibleCopy.match(
    /(?:https?:\/\/)?(?:www\.)?mochirii\.com(?:[/?#][^\s"'`)]+)?/giu,
  ) || [];
  const invalidDisplayedSiteValue = displayedSiteValues.find((value) => value !== "mochirii.com");
  if (invalidDisplayedSiteValue) {
    failures.push(`${relative}: visible website labels must be exactly mochirii.com; found ${JSON.stringify(invalidDisplayedSiteValue)}.`);
  }
}

const canonicalPublicCopyText = [...canonicalPublicCopy, sharedSocialCaption].join("\n");
const accentCounts = new Map();
for (const { label, pattern, minimum, maximum } of brandAccents) {
  const count = canonicalPublicCopyText.match(pattern)?.length ?? 0;
  accentCounts.set(label, count);
  if (count < minimum || count > maximum) {
    failures.push(`brand accent ${JSON.stringify(label)} must appear ${minimum}-${maximum} times across canonical public data and the shared social caption; found ${count}.`);
  }
}

for (const { label, pattern } of focusChecks) {
  const count = canonicalPublicCopyText.match(pattern)?.length ?? 0;
  if (count < 1) failures.push(`canonical public copy must include concrete ${label} language.`);
}

if (exactGameNameCount !== EXPECTED_EXACT_GAME_NAME_COUNT) {
  failures.push(`exact game name must appear exactly ${EXPECTED_EXACT_GAME_NAME_COUNT} times across approved lanes; found ${exactGameNameCount}.`);
}

if (failures.length) {
  console.error("Public guild copy contract failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Public guild copy contract OK.");
console.log("- Reviewed guild-copy surfaces avoid mood filler and generic non-game phrasing.");
console.log(`- Wushu land (${accentCounts.get("Wushu land")}), pretty (${accentCounts.get("pretty")}) and cupcake (${accentCounts.get("cupcake")}) remain sparse protected brand accents.`);
console.log("- Canonical public copy includes recruitment, events, builds, guides, progression and member activity or support.");
console.log(`- All ${publicJsonFiles.length} public JSON files and the approved source lanes were scanned; Where Winds Meet remains limited to exactly ${exactGameNameCount} approved metadata, Home subtitle and primary footer occurrences.`);
console.log("- Facebook and Instagram publication surfaces retain the reviewed shared social caption.");
console.log("- Public website display is exactly mochirii.com; Instagram and Facebook publication copy contain no site link.");
console.log("- Discord account guidance displays mochirii.com and reviewed member-facing fallbacks use Mōchirīī/Mōchī branding.");
