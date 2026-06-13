import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];
const warnings = [];

const files = {
  packageJson: "package.json",
  checkAll: "scripts/check-all.mjs",
  runbook: "docs/visual-hierarchy-text-fit-audit.md",
  currentLiveState: "docs/current-live-state.md",
  homeShellGuide: "docs/home-shell-guide.md",
  accessibilityMatrix: "scripts/check-accessibility-route-matrix.mjs",
  universalHeroSpacing: "scripts/check-universal-hero-spacing.mjs",
  nextCss: "apps/web/app/mochirii.css",
  staticCss: "styles.css",
  fullStackEvidence: "scripts/check-full-stack-release-evidence.mjs",
};

function read(relativePath) {
  const file = path.join(root, relativePath);
  if (!existsSync(file)) {
    failures.push(`${relativePath}: missing required visual hierarchy file.`);
    return "";
  }
  return readFileSync(file, "utf8");
}

function assertIncludes(label, text, snippet) {
  if (!text.includes(snippet)) failures.push(`${label}: missing ${snippet}`);
}

function assertNotMatches(label, text, pattern, message) {
  if (pattern.test(text)) failures.push(`${label}: ${message}`);
}

function warnMatches(label, text, pattern, message) {
  const matches = [...text.matchAll(pattern)];
  if (matches.length) warnings.push(`${label}: ${message} (${matches.length})`);
}

function scanSecretLikeText(label, text) {
  const patterns = [
    { name: "GitHub token", pattern: /\b(?:ghp|gho|ghs|ghu|github_pat)_[A-Za-z0-9_]{20,}\b/ },
    { name: "Supabase secret key", pattern: /\bsb_secret_[A-Za-z0-9_-]{12,}\b/ },
    { name: "JWT-like token", pattern: /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/ },
    { name: "Discord bot token", pattern: /\b[A-Za-z0-9_-]{23,}\.[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{27,}\b/ },
    { name: "Discord webhook URL", pattern: /https:\/\/(?:canary\.|ptb\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/[A-Za-z0-9_-]+/ },
    { name: "raw cookie header", pattern: /\bCookie:\s*[^;\s]+=/i },
  ];

  for (const [index, line] of String(text || "").split(/\r?\n/).entries()) {
    for (const { name, pattern } of patterns) {
      pattern.lastIndex = 0;
      if (pattern.test(line)) failures.push(`${label}: line ${index + 1} contains ${name}.`);
    }
  }
}

const packageJson = read(files.packageJson);
const checkAll = read(files.checkAll);
const runbook = read(files.runbook);
const currentLiveState = read(files.currentLiveState);
const homeShellGuide = read(files.homeShellGuide);
const accessibilityMatrix = read(files.accessibilityMatrix);
const universalHeroSpacing = read(files.universalHeroSpacing);
const nextCss = read(files.nextCss);
const staticCss = read(files.staticCss);
const fullStackEvidence = read(files.fullStackEvidence);

assertIncludes("package.json", packageJson, '"check:visual-hierarchy-text-fit"');
assertIncludes("check-all", checkAll, "check:visual-hierarchy-text-fit");
assertIncludes("full-stack evidence", fullStackEvidence, "docs/visual-hierarchy-text-fit-audit.md");
assertIncludes("full-stack evidence", fullStackEvidence, "visualHierarchyTextFitAudit");

[
  "https://www.w3.org/TR/WCAG22/",
  "https://www.w3.org/WAI/WCAG21/Understanding/reflow.html",
  "https://www.w3.org/WAI/WCAG21/Understanding/resize-text",
  "https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html",
  "https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum",
  "https://web.dev/articles/vitals",
  "https://web.dev/articles/cls",
  "360px",
  "390px",
  "768px",
  "1024px",
  "1440px",
  "200%",
  "no horizontal page overflow",
  "text does not overlap adjacent content",
  "buttons do not clip labels",
  "focus indicators remain visible",
  "hero-scale headings",
  "negative letter spacing",
  "cards are nested inside cards",
  "Protected-route evidence kept private/redacted",
  "Never record:",
].forEach((snippet) => assertIncludes("visual hierarchy runbook", runbook, snippet));

[
  "/games/mochi-social",
  "/leader-dashboard",
  "/members/[slug]",
  "Static rollback routes",
].forEach((snippet) => assertIncludes("visual hierarchy route scope", runbook, snippet));

[
  "docs/visual-hierarchy-text-fit-audit.md",
  "check:visual-hierarchy-text-fit",
].forEach((snippet) => assertIncludes("current live state", currentLiveState, snippet));

[
  "360px",
  "390px",
  "768px",
  "1024px",
  "1440px",
  "No horizontal overflow at mobile widths.",
].forEach((snippet) => assertIncludes("home shell visual baseline", homeShellGuide, snippet));

[
  "360, 390, 768, 1024, and 1440 widths",
  "focus visibility",
].forEach((snippet) => assertIncludes("accessibility route matrix", accessibilityMatrix, snippet));

[
  "object-fit:contain;",
  "Page-scoped hero geometry is not allowed",
].forEach((snippet) => assertIncludes("universal hero spacing guard", universalHeroSpacing, snippet));

assertNotMatches("Next CSS", nextCss, /letter-spacing\s*:\s*-\d/i, "negative letter-spacing is not allowed.");
assertNotMatches("Static CSS", staticCss, /letter-spacing\s*:\s*-\d/i, "negative letter-spacing is not allowed.");

warnMatches("Next CSS", nextCss, /font-size\s*:\s*clamp\([^;]*(?:vw|vh|vmin|vmax)/gi, "viewport-based font-size clamps need browser text-fit review");
warnMatches("Static CSS", staticCss, /font-size\s*:\s*clamp\([^;]*(?:vw|vh|vmin|vmax)/gi, "viewport-based font-size clamps need browser text-fit review");
warnMatches("Next CSS", nextCss, /white-space\s*:\s*nowrap/gi, "nowrap rules need narrow-viewport review");
warnMatches("Static CSS", staticCss, /white-space\s*:\s*nowrap/gi, "nowrap rules need narrow-viewport review");

scanSecretLikeText("visual hierarchy runbook", runbook);

if (failures.length) {
  console.error("Visual hierarchy text-fit validation failed.");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Visual hierarchy text-fit validation OK.");
console.log(`- Static warnings: ${warnings.length}`);
for (const warning of warnings) console.log(`WARN ${warning}`);
